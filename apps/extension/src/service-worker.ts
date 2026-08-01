import {
  addDaysToLocalDate,
  buildPrayerSchedule,
  cityById,
  cityName,
  fetchPrayerDay,
  formatPrayerTime,
  localDateFor,
  prayerKeysForCity,
  prayerMethodName,
  prayerNameForCity,
  type PrayerDay,
  type PrayerScheduleEntry,
  type SupportedLocale,
} from "@pray-times/core";
import { browserApi, hasNotificationPermission, supportsRichNotifications } from "./browser-api.js";
import {
  SETTINGS_STORAGE_KEY,
  markDelivered,
  readExtensionSettings,
  readStoredPrayerDay,
  readStoredSchedule,
  wasDelivered,
  writeStoredPrayerDay,
  writeStoredSchedule,
} from "./extension-state.js";

const RECONCILE_ALARM = "pray-times:reconcile";
const RETRY_ALARM = "pray-times:retry";
const PRAYER_ALARM_PREFIX = "pray-times:prayer:";
const TODAY_URL = "https://devm7mdali.github.io/Pray-Times/today/";
const LATE_GRACE_MS = 10 * 60 * 1000;

async function clearPrayerAlarms(except = new Set<string>()): Promise<void> {
  const alarms = await browserApi.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => alarm.name.startsWith(PRAYER_ALARM_PREFIX) && !except.has(alarm.name))
      .map((alarm) => browserApi.alarms.clear(alarm.name))
  );
}

async function verifiedDay(cityId: string, date: string): Promise<PrayerDay> {
  const cached = await readStoredPrayerDay(cityId, date);
  if (cached) return cached;
  const city = cityById(cityId);
  if (!city) throw new Error("Unknown notification city");
  const day = await fetchPrayerDay(city, { date });
  await writeStoredPrayerDay(day);
  return day;
}

async function ensureReconcileAlarm(): Promise<void> {
  const alarm = (await browserApi.alarms.getAll()).find((entry) => entry.name === RECONCILE_ALARM);
  if (!alarm) {
    await browserApi.alarms.create(RECONCILE_ALARM, {
      when: Date.now() + 60_000,
      periodInMinutes: 360,
    });
  }
}

async function reconcileSchedule(): Promise<void> {
  await ensureReconcileAlarm();
  const settings = await readExtensionSettings();
  const city = cityById(settings.cityId);
  if (!settings.notificationsEnabled || !city || !(await hasNotificationPermission())) {
    await clearPrayerAlarms();
    await browserApi.alarms.clear(RETRY_ALARM);
    await writeStoredSchedule([]);
    return;
  }

  const retainedSchedule = (await readStoredSchedule()).filter(
    (entry) =>
      entry.cityId === city.id &&
      prayerKeysForCity(city).includes(entry.key) &&
      settings.enabledPrayers[entry.key] &&
      entry.scheduledTime > Date.now()
  );
  await clearPrayerAlarms(new Set(retainedSchedule.map((entry) => entry.id)));

  const today = localDateFor(city.timeZone);
  const tomorrow = addDaysToLocalDate(today, 1);
  try {
    const results = await Promise.allSettled([
      verifiedDay(city.id, today),
      verifiedDay(city.id, tomorrow),
    ]);
    const days = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    if (days.length === 0) throw new Error("No verified prayer days are available");
    const schedule = buildPrayerSchedule(days, settings.enabledPrayers);
    const expected = new Set(schedule.map((entry) => entry.id));
    await clearPrayerAlarms(expected);
    const existing = new Set((await browserApi.alarms.getAll()).map((alarm) => alarm.name));
    await Promise.all(
      schedule
        .filter((entry) => !existing.has(entry.id))
        .map((entry) => browserApi.alarms.create(entry.id, { when: entry.scheduledTime }))
    );
    await writeStoredSchedule(schedule);
    if (results.some((result) => result.status === "rejected")) {
      await browserApi.alarms.create(RETRY_ALARM, { when: Date.now() + 15 * 60_000 });
    } else {
      await browserApi.alarms.clear(RETRY_ALARM);
    }
  } catch (error) {
    console.error("Could not reconcile prayer notifications", error);
  }
}

function notificationCopy(
  entry: PrayerScheduleEntry,
  day: PrayerDay,
  locale: SupportedLocale
): { title: string; message: string; contextMessage: string } {
  const prayer = prayerNameForCity(entry.key, day.city, locale);
  const place = cityName(day.city, locale);
  const time = formatPrayerTime(entry.time, locale);
  return locale === "ar"
    ? {
        title: `حان وقت صلاة ${prayer}`,
        message: `${place} · ${time}`,
        contextMessage: prayerMethodName(day.method, locale),
      }
    : {
        title: `It’s time for ${prayer}`,
        message: `${place} · ${time}`,
        contextMessage: prayerMethodName(day.method, locale),
      };
}

/**
 * Firefox and Safari reject `contextMessage`, `eventTime`, `priority`, and
 * `silent`, so those are Chrome-only. Elsewhere the context line is folded into
 * the message rather than dropped.
 */
function notificationOptions(copy: {
  title: string;
  message: string;
  contextMessage?: string;
  eventTime?: number;
}): WebExtensionNotificationOptions {
  const iconUrl = browserApi.runtime.getURL("icons/icon-128.png");
  if (!supportsRichNotifications) {
    return {
      type: "basic",
      iconUrl,
      title: copy.title,
      message: copy.contextMessage ? `${copy.message} · ${copy.contextMessage}` : copy.message,
    };
  }
  return {
    type: "basic",
    iconUrl,
    title: copy.title,
    message: copy.message,
    ...(copy.contextMessage ? { contextMessage: copy.contextMessage } : {}),
    ...(copy.eventTime ? { eventTime: copy.eventTime } : {}),
    priority: 1,
    silent: false,
  };
}

async function deliverPrayer(entry: PrayerScheduleEntry): Promise<void> {
  const settings = await readExtensionSettings();
  const city = cityById(entry.cityId);
  if (
    !settings.notificationsEnabled ||
    settings.cityId !== entry.cityId ||
    !city ||
    !prayerKeysForCity(city).includes(entry.key) ||
    !settings.enabledPrayers[entry.key] ||
    !(await hasNotificationPermission()) ||
    (await wasDelivered(entry.id))
  ) {
    return;
  }
  const lateness = Date.now() - entry.scheduledTime;
  if (lateness < -30_000 || lateness > LATE_GRACE_MS) return;
  const day = await readStoredPrayerDay(entry.cityId, entry.requestedDate);
  if (!day) return;
  const notifications = browserApi.notifications;
  if (!notifications) return;
  const copy = notificationCopy(entry, day, settings.locale);
  await notifications.create(
    entry.id,
    notificationOptions({
      title: copy.title,
      message: copy.message,
      contextMessage: copy.contextMessage,
      eventTime: entry.scheduledTime,
    })
  );
  await markDelivered(entry.id);
}

async function handleAlarm(name: string): Promise<void> {
  if (name === RECONCILE_ALARM || name === RETRY_ALARM) {
    await reconcileSchedule();
    return;
  }
  const entry = (await readStoredSchedule()).find((candidate) => candidate.id === name);
  if (entry) await deliverPrayer(entry);
  await reconcileSchedule();
}

async function sendTestNotification(): Promise<void> {
  const settings = await readExtensionSettings();
  const city = cityById(settings.cityId);
  const notifications = browserApi.notifications;
  if (!city || !notifications || !(await hasNotificationPermission())) return;
  const locale = settings.locale;
  await notifications.create(
    "pray-times:test",
    notificationOptions({
      title: locale === "ar" ? "إشعارات أوقات الصلاة تعمل" : "Prayer notifications are working",
      message:
        locale === "ar"
          ? `سننبهك عند دخول وقت الصلاة في ${cityName(city, locale)}.`
          : `We’ll notify you when prayer time begins in ${cityName(city, locale)}.`,
    })
  );
}

browserApi.runtime.onInstalled.addListener(() => void reconcileSchedule());
browserApi.runtime.onStartup.addListener(() => void reconcileSchedule());
browserApi.alarms.onAlarm.addListener((alarm) => void handleAlarm(alarm.name));
browserApi.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[SETTINGS_STORAGE_KEY]) void reconcileSchedule();
});
browserApi.notifications?.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("pray-times:")) void browserApi.tabs.create({ url: TODAY_URL });
});
browserApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    !message ||
    typeof message !== "object" ||
    (message as { type?: string }).type !== "test-notification"
  ) {
    return;
  }
  void sendTestNotification()
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }));
  return true;
});

void reconcileSchedule();
