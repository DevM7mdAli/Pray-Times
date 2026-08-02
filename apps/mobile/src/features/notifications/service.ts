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

async function clearOwnedNotifications(): Promise<void> {
  const ids = await readScheduledIds();
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await appStorage.removeItem(SCHEDULE_IDS_KEY);
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

export async function disablePrayerNotifications(): Promise<void> {
  await clearOwnedNotifications();
}
