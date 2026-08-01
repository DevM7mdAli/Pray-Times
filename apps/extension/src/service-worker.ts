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

async function hasNotificationPermission(): Promise<boolean> {
  return chrome.permissions.contains({ permissions: ["notifications"] });
}

async function clearPrayerAlarms(except = new Set<string>()): Promise<void> {
  const alarms = await chrome.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => alarm.name.startsWith(PRAYER_ALARM_PREFIX) && !except.has(alarm.name))
      .map((alarm) => chrome.alarms.clear(alarm.name))
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
  const alarm = (await chrome.alarms.getAll()).find((entry) => entry.name === RECONCILE_ALARM);
  if (!alarm) {
    await chrome.alarms.create(RECONCILE_ALARM, {
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
    await chrome.alarms.clear(RETRY_ALARM);
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
    const existing = new Set((await chrome.alarms.getAll()).map((alarm) => alarm.name));
    await Promise.all(
      schedule
        .filter((entry) => !existing.has(entry.id))
        .map((entry) => chrome.alarms.create(entry.id, { when: entry.scheduledTime }))
    );
    await writeStoredSchedule(schedule);
    if (results.some((result) => result.status === "rejected")) {
      await chrome.alarms.create(RETRY_ALARM, { when: Date.now() + 15 * 60_000 });
    } else {
      await chrome.alarms.clear(RETRY_ALARM);
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
  const copy = notificationCopy(entry, day, settings.locale);
  await chrome.notifications.create(entry.id, {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: copy.title,
    message: copy.message,
    contextMessage: copy.contextMessage,
    eventTime: entry.scheduledTime,
    priority: 1,
    silent: false,
  });
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
  if (!city || !(await hasNotificationPermission())) return;
  const locale = settings.locale;
  await chrome.notifications.create("pray-times:test", {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: locale === "ar" ? "إشعارات أوقات الصلاة تعمل" : "Prayer notifications are working",
    message:
      locale === "ar"
        ? `سننبهك عند دخول وقت الصلاة في ${cityName(city, locale)}.`
        : `We’ll notify you when prayer time begins in ${cityName(city, locale)}.`,
    priority: 1,
    silent: false,
  });
}

chrome.runtime.onInstalled.addListener(() => void reconcileSchedule());
chrome.runtime.onStartup.addListener(() => void reconcileSchedule());
chrome.alarms.onAlarm.addListener((alarm) => void handleAlarm(alarm.name));
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[SETTINGS_STORAGE_KEY]) void reconcileSchedule();
});
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("pray-times:")) void chrome.tabs.create({ url: TODAY_URL });
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
