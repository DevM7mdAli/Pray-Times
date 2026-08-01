import {
  addDaysToLocalDate,
  cityById,
  fetchPrayerDay,
  isUsablePrayerDay,
  localDateFor,
  prayerKeysForCity,
  prayerMethodForCity,
  trustedCity,
  type City,
  type PrayerDay,
  type PrayerKey,
  type SupportedLocale,
} from "@pray-times/core";
import webpush from "web-push";
import {
  DELIVERY_BATCH_SIZE,
  DELIVERY_GRACE_MS,
  nextEnabledPrayer,
  notificationPayload,
  parseEnabledPrayers,
  parseSubscriptionInput,
  type EnabledPrayers,
  type SubscriptionInput,
} from "./domain";

type Env = {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  SITE_ORIGINS: string;
};

type SubscriptionRow = {
  endpoint_hash: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  city_id: string;
  place: string | null;
  locale: SupportedLocale;
  enabled_prayers: string;
  next_prayer_key: PrayerKey | null;
  next_prayer_date: string | null;
  next_fire_at: number | null;
  delivery_claimed_at: number | null;
};

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function allowedOrigins(env: Env): string[] {
  return env.SITE_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function requestOrigin(request: Request, env: Env): string | undefined {
  const origin = request.headers.get("Origin") ?? undefined;
  return origin && allowedOrigins(env).includes(origin) ? origin : undefined;
}

function cors(origin?: string): HeadersInit {
  return origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        Vary: "Origin",
      }
    : {};
}

function primarySiteOrigin(env: Env): string {
  return allowedOrigins(env).find((origin) => origin.startsWith("https://")) ?? "";
}

async function endpointHash(endpoint: string): Promise<string> {
  const bytes = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requestBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > 16_384) throw new Error("Request body is too large");
  const body = await request.text();
  if (body.length > 16_384) throw new Error("Request body is too large");
  return JSON.parse(body) as unknown;
}

/**
 * The place a subscription is for.
 *
 * Rows written before places were stored carry only a catalog id, so they keep
 * resolving from the catalog.
 */
function subscriptionPlace(row: Pick<SubscriptionRow, "place" | "city_id">): City | undefined {
  if (row.place) {
    try {
      return trustedCity(JSON.parse(row.place));
    } catch {
      // A row that cannot be read falls through to the catalog id below.
    }
  }
  return cityById(row.city_id);
}

async function prayerDay(env: Env, city: City, date: string): Promise<PrayerDay> {
  const methodId = prayerMethodForCity(city).id;
  const cached = await env.DB.prepare(
    `SELECT payload FROM prayer_day_cache
      WHERE latitude = ?1 AND longitude = ?2 AND time_zone = ?3
        AND method_id = ?4 AND requested_date = ?5`
  )
    .bind(city.latitude, city.longitude, city.timeZone, methodId, date)
    .first<{ payload: string }>();
  if (cached) {
    const stored: unknown = JSON.parse(cached.payload);
    // The row may have been written by any place at this position, so its shape
    // is checked rather than assumed; anything unusable falls through to a
    // fetch instead of failing the delivery.
    if (isUsablePrayerDay(stored)) {
      // Everything that made the day valid is in the key, so only the place's
      // own identity — its names and prayer profile — is reattached.
      return { ...stored, city };
    }
  }

  const day = await fetchPrayerDay(city, { date });
  await env.DB.prepare(
    `INSERT INTO prayer_day_cache
       (latitude, longitude, time_zone, method_id, requested_date, payload, fetched_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT(latitude, longitude, time_zone, method_id, requested_date)
       DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`
  )
    .bind(
      city.latitude,
      city.longitude,
      city.timeZone,
      methodId,
      date,
      JSON.stringify(day),
      Date.now()
    )
    .run();
  return day;
}

async function nextSchedule(env: Env, city: City, enabledPrayers: EnabledPrayers, now: Date) {
  const today = localDateFor(city.timeZone, now);
  const tomorrow = addDaysToLocalDate(today, 1);
  const days = await Promise.all([prayerDay(env, city, today), prayerDay(env, city, tomorrow)]);
  return nextEnabledPrayer(days, enabledPrayers, now);
}

async function updateNextSchedule(
  env: Env,
  endpointHashValue: string,
  city: City,
  enabledPrayers: EnabledPrayers,
  now: Date
): Promise<void> {
  const next = await nextSchedule(env, city, enabledPrayers, now);
  await env.DB.prepare(
    `UPDATE push_subscriptions
       SET next_prayer_key = ?1,
           next_prayer_date = ?2,
           next_fire_at = ?3,
           delivery_claimed_at = NULL,
           updated_at = ?4
     WHERE endpoint_hash = ?5`
  )
    .bind(
      next?.key ?? null,
      next?.requestedDate ?? null,
      next?.scheduledTime ?? null,
      now.getTime(),
      endpointHashValue
    )
    .run();
}

async function saveSubscription(env: Env, input: SubscriptionInput): Promise<string> {
  const hash = await endpointHash(input.subscription.endpoint);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO push_subscriptions (
       endpoint_hash, endpoint, p256dh, auth, city_id, place, locale, enabled_prayers, created_at, updated_at
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
     ON CONFLICT(endpoint_hash) DO UPDATE SET
       endpoint = excluded.endpoint,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       city_id = excluded.city_id,
       place = excluded.place,
       locale = excluded.locale,
       enabled_prayers = excluded.enabled_prayers,
       delivery_claimed_at = NULL,
       updated_at = excluded.updated_at`
  )
    .bind(
      hash,
      input.subscription.endpoint,
      input.subscription.keys.p256dh,
      input.subscription.keys.auth,
      input.place.id,
      JSON.stringify(input.place),
      input.locale,
      JSON.stringify(input.enabledPrayers),
      now
    )
    .run();
  await updateNextSchedule(env, hash, input.place, input.enabledPrayers, new Date(now));
  return hash;
}

function configureWebPush(env: Env): void {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

async function sendPush(
  env: Env,
  row: Pick<SubscriptionRow, "endpoint" | "p256dh" | "auth">,
  payload: unknown
): Promise<void> {
  configureWebPush(env);
  await webpush.sendNotification(
    {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    },
    JSON.stringify(payload),
    { TTL: 60 * 60, urgency: "high" }
  );
}

function pushStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return undefined;
  return typeof error.statusCode === "number" ? error.statusCode : undefined;
}

async function deliverDueSubscription(env: Env, row: SubscriptionRow, now: number): Promise<void> {
  const enabledPrayers = parseEnabledPrayers(JSON.parse(row.enabled_prayers));
  const city = subscriptionPlace(row);
  // A place that no longer resolves cannot be rescheduled either, so the row is
  // left for the next sync from the browser rather than looping on it.
  if (!city) return;

  if (!enabledPrayers || !row.next_prayer_key || !row.next_prayer_date || !row.next_fire_at) {
    await updateNextSchedule(
      env,
      row.endpoint_hash,
      city,
      enabledPrayers ?? {
        Fajr: true,
        Dhuhr: true,
        Asr: true,
        Maghrib: true,
        Isha: true,
      },
      new Date(now)
    );
    return;
  }

  if (!prayerKeysForCity(city).includes(row.next_prayer_key)) {
    await updateNextSchedule(env, row.endpoint_hash, city, enabledPrayers, new Date(now));
    return;
  }

  if (row.next_fire_at < now - DELIVERY_GRACE_MS) {
    await updateNextSchedule(env, row.endpoint_hash, city, enabledPrayers, new Date(now));
    return;
  }

  const claim = await env.DB.prepare(
    `UPDATE push_subscriptions SET delivery_claimed_at = ?1
      WHERE endpoint_hash = ?2
        AND next_fire_at = ?3
        AND (delivery_claimed_at IS NULL OR delivery_claimed_at < ?4)`
  )
    .bind(now, row.endpoint_hash, row.next_fire_at, now - 2 * 60_000)
    .run();
  if (!claim.meta.changes) return;

  const previous = await env.DB.prepare(
    `SELECT 1 AS found FROM notification_deliveries
      WHERE endpoint_hash = ?1 AND prayer_date = ?2 AND prayer_key = ?3`
  )
    .bind(row.endpoint_hash, row.next_prayer_date, row.next_prayer_key)
    .first();
  if (previous) {
    await updateNextSchedule(env, row.endpoint_hash, city, enabledPrayers, new Date(now));
    return;
  }

  try {
    const day = await prayerDay(env, city, row.next_prayer_date);
    const payload = notificationPayload(
      day,
      row.next_prayer_key,
      row.locale,
      primarySiteOrigin(env)
    );
    await sendPush(env, row, payload);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO notification_deliveries
         (endpoint_hash, prayer_date, prayer_key, delivered_at)
       VALUES (?1, ?2, ?3, ?4)`
    )
      .bind(row.endpoint_hash, row.next_prayer_date, row.next_prayer_key, now)
      .run();
    await updateNextSchedule(env, row.endpoint_hash, city, enabledPrayers, new Date(now));
  } catch (error) {
    if ([404, 410].includes(pushStatus(error) ?? 0)) {
      await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint_hash = ?1")
        .bind(row.endpoint_hash)
        .run();
      return;
    }
    await env.DB.prepare(
      "UPDATE push_subscriptions SET delivery_claimed_at = NULL WHERE endpoint_hash = ?1"
    )
      .bind(row.endpoint_hash)
      .run();
    throw error;
  }
}

async function deliverDue(env: Env): Promise<void> {
  const now = Date.now();
  const due = await env.DB.prepare(
    `SELECT * FROM push_subscriptions
      WHERE next_fire_at IS NOT NULL AND next_fire_at <= ?1
      ORDER BY next_fire_at ASC
      LIMIT ?2`
  )
    .bind(now, DELIVERY_BATCH_SIZE)
    .all<SubscriptionRow>();

  const results = await Promise.allSettled(
    due.results.map((row) => deliverDueSubscription(env, row, now))
  );
  for (const result of results) {
    if (result.status === "rejected")
      console.error("Prayer notification delivery failed", result.reason);
  }

  const date = new Date(now);
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM prayer_day_cache WHERE fetched_at < ?1").bind(
        now - 4 * 86_400_000
      ),
      env.DB.prepare("DELETE FROM notification_deliveries WHERE delivered_at < ?1").bind(
        now - 8 * 86_400_000
      ),
    ]);
  }
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const origin = requestOrigin(request, env);

  if (request.method === "OPTIONS") {
    return origin
      ? new Response(null, { status: 204, headers: cors(origin) })
      : json({ error: "Origin not allowed" }, 403);
  }
  if (url.pathname === "/health" && request.method === "GET") {
    return json({ ok: true, service: "pray-times-push" }, 200, cors(origin));
  }
  if (!origin) return json({ error: "Origin not allowed" }, 403);
  if (url.pathname === "/v1/public-key" && request.method === "GET") {
    return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, cors(origin));
  }

  try {
    if (url.pathname === "/v1/subscriptions" && request.method === "POST") {
      const input = parseSubscriptionInput(await requestBody(request));
      if (!input) return json({ error: "Invalid subscription" }, 400, cors(origin));
      await saveSubscription(env, input);
      return json({ ok: true }, 201, cors(origin));
    }

    if (url.pathname === "/v1/subscriptions" && request.method === "DELETE") {
      const body = await requestBody(request);
      const endpoint =
        body && typeof body === "object" && "endpoint" in body && typeof body.endpoint === "string"
          ? body.endpoint
          : undefined;
      if (!endpoint) return json({ error: "Invalid endpoint" }, 400, cors(origin));
      await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint_hash = ?1")
        .bind(await endpointHash(endpoint))
        .run();
      return json({ ok: true }, 200, cors(origin));
    }

    if (url.pathname === "/v1/notifications/test" && request.method === "POST") {
      const input = parseSubscriptionInput(await requestBody(request));
      if (!input) return json({ error: "Invalid subscription" }, 400, cors(origin));
      await saveSubscription(env, input);
      await sendPush(
        env,
        {
          endpoint: input.subscription.endpoint,
          p256dh: input.subscription.keys.p256dh,
          auth: input.subscription.keys.auth,
        },
        {
          title: input.locale === "ar" ? "إشعارات الصلاة تعمل" : "Prayer alerts are working",
          body:
            input.locale === "ar"
              ? "ستصلك التنبيهات حتى بعد إغلاق الصفحة."
              : "You will receive alerts even after closing the page.",
          tag: "prayer-alert-test",
          url: `${origin}/Pray-Times/today/?lang=${input.locale}`,
          locale: input.locale,
        }
      );
      return json({ ok: true }, 200, cors(origin));
    }
  } catch (error) {
    console.error("Push API request failed", error);
    return json({ error: "Request failed" }, 500, cors(origin));
  }

  return json({ error: "Not found" }, 404, cors(origin));
}

export default {
  fetch: handleRequest,
  scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext) {
    context.waitUntil(deliverDue(env));
  },
} satisfies ExportedHandler<Env>;
