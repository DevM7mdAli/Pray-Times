import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  buildPrayerSchedule,
  cityName,
  formatPrayerTime,
  prayerNameForCity,
  type City,
  type PrayerDay,
  type PrayerKey,
  type SupportedLocale,
} from "@pray-times/core";
import { appStorage } from "@/lib/storage";

const CHANNEL_ID = "prayer-times";
const SCHEDULE_IDS_KEY = "pray-times:mobile-notification-ids:v1";
const MAX_SCHEDULED_DAYS = 7;

type ScheduledIdRecord = { ids: string[] };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function readScheduledIds(): Promise<string[]> {
  try {
    const raw = await appStorage.getItem(SCHEDULE_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ScheduledIdRecord>;
    return Array.isArray(parsed.ids) && parsed.ids.every((id) => typeof id === "string")
      ? parsed.ids
      : [];
  } catch {
    return [];
  }
}

/** Cancel every pending prayer alarm, including ones leaked by an earlier overlapping rebuild. */
async function clearOwnedNotifications(): Promise<void> {
  const [storedIds, pending] = await Promise.all([
    readScheduledIds(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);
  const ids = new Set(storedIds);
  for (const request of pending) {
    if (typeof request.content.data?.prayerAlarmId === "string") ids.add(request.identifier);
  }
  await Promise.all([...ids].map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await appStorage.removeItem(SCHEDULE_IDS_KEY);
}

let queue: Promise<void> = Promise.resolve();

/** Run schedule changes one at a time so a rebuild never reads ids another is still writing. */
function serialized(task: () => Promise<void>): Promise<void> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Prayer times",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Rebuild only this feature's local schedule after verified data or preferences change. */
export async function reconcilePrayerNotifications(input: {
  days: readonly PrayerDay[];
  city: City;
  locale: SupportedLocale;
  enabledPrayers: Readonly<Record<PrayerKey, boolean>>;
}): Promise<void> {
  return serialized(() => schedulePrayerNotifications(input));
}

async function schedulePrayerNotifications(
  input: Parameters<typeof reconcilePrayerNotifications>[0]
): Promise<void> {
  await clearOwnedNotifications();
  const schedule = buildPrayerSchedule(input.days, input.enabledPrayers).slice(
    0,
    MAX_SCHEDULED_DAYS * 5
  );
  const ids = await Promise.all(
    schedule.map((entry) => {
      const prayer = prayerNameForCity(entry.key, input.city, input.locale);
      const place = cityName(input.city, input.locale);
      const time = formatPrayerTime(entry.time, input.locale);
      return Notifications.scheduleNotificationAsync({
        // A stable identifier makes rescheduling the same prayer replace it instead of stacking.
        identifier: entry.id,
        content: {
          title: input.locale === "ar" ? `حان وقت صلاة ${prayer}` : `It’s time for ${prayer}`,
          body: `${place} · ${time}`,
          data: { prayerAlarmId: entry.id, url: "/" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(entry.scheduledTime),
          ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
        } as Notifications.DateTriggerInput,
      });
    })
  );
  await appStorage.setItem(SCHEDULE_IDS_KEY, JSON.stringify({ ids } satisfies ScheduledIdRecord));
}

export function disablePrayerNotifications(): Promise<void> {
  return serialized(clearOwnedNotifications);
}
