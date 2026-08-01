import {
  PRAYER_KEYS,
  buildPrayerSchedule,
  prayerNameForCity,
  type PrayerDay,
  type PrayerKey,
  type SupportedLocale,
} from "@pray-times/core";

export const DELIVERY_GRACE_MS = 10 * 60_000;
export const DELIVERY_BATCH_SIZE = 10;

export type EnabledPrayers = Record<PrayerKey, boolean>;

export type SubscriptionInput = {
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  };
  cityId: string;
  locale: SupportedLocale;
  enabledPrayers: EnabledPrayers;
};

export type PushPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
  locale: SupportedLocale;
};

export function parseEnabledPrayers(value: unknown): EnabledPrayers | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const enabled = {} as EnabledPrayers;
  for (const key of PRAYER_KEYS) {
    if (typeof candidate[key] !== "boolean") return undefined;
    enabled[key] = candidate[key];
  }
  return enabled;
}

export function parseSubscriptionInput(value: unknown): SubscriptionInput | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const subscription = candidate.subscription;
  if (!subscription || typeof subscription !== "object") return undefined;
  const push = subscription as Record<string, unknown>;
  const keys = push.keys;
  if (!keys || typeof keys !== "object") return undefined;
  const pushKeys = keys as Record<string, unknown>;
  const enabledPrayers = parseEnabledPrayers(candidate.enabledPrayers);
  if (
    typeof push.endpoint !== "string" ||
    !push.endpoint.startsWith("https://") ||
    push.endpoint.length > 4096 ||
    typeof pushKeys.p256dh !== "string" ||
    pushKeys.p256dh.length > 512 ||
    typeof pushKeys.auth !== "string" ||
    pushKeys.auth.length > 256 ||
    typeof candidate.cityId !== "string" ||
    (candidate.locale !== "ar" && candidate.locale !== "en") ||
    !enabledPrayers
  ) {
    return undefined;
  }
  return {
    subscription: {
      endpoint: push.endpoint,
      expirationTime: typeof push.expirationTime === "number" ? push.expirationTime : null,
      keys: { p256dh: pushKeys.p256dh, auth: pushKeys.auth },
    },
    cityId: candidate.cityId,
    locale: candidate.locale,
    enabledPrayers,
  };
}

export function nextEnabledPrayer(
  days: readonly PrayerDay[],
  enabledPrayers: EnabledPrayers,
  now: Date
) {
  return buildPrayerSchedule(days, enabledPrayers, now)[0];
}

export function notificationPayload(
  day: PrayerDay,
  key: PrayerKey,
  locale: SupportedLocale,
  siteOrigin: string
): PushPayload {
  const prayer = prayerNameForCity(key, day.city, locale);
  const city = locale === "ar" ? day.city.nameAr : day.city.nameEn;
  return {
    title: locale === "ar" ? `حان الآن وقت صلاة ${prayer}` : `It is time for ${prayer}`,
    body: locale === "ar" ? `${city} · ${day.timings[key]}` : `${city} · ${day.timings[key]}`,
    tag: `prayer-${day.requestedDate}-${key.toLowerCase()}`,
    url: `${siteOrigin}/Pray-Times/today/?lang=${locale}`,
    locale,
  };
}
