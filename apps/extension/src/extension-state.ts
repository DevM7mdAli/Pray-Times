import {
  PRAYER_KEYS,
  cityById,
  isSupportedLocale,
  prayerMethodForCity,
  type PrayerDay,
  type PrayerKey,
  type PrayerScheduleEntry,
  type SupportedLocale,
} from "@pray-times/core";

export const SETTINGS_STORAGE_KEY = "pray-times:extension-settings:v1";
export const SCHEDULE_STORAGE_KEY = "pray-times:notification-schedule:v1";
const DELIVERY_STORAGE_KEY = "pray-times:notification-deliveries:v1";
const PRAYER_DAY_PREFIX = "pray-times:extension-prayer-day:v1:";

export type ExtensionSettings = {
  version: 1;
  cityId: string;
  locale: SupportedLocale;
  notificationsEnabled: boolean;
  enabledPrayers: Record<PrayerKey, boolean>;
};

export const ALL_PRAYERS_ENABLED: Record<PrayerKey, boolean> = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

export function defaultExtensionSettings(locale: SupportedLocale = "en"): ExtensionSettings {
  return {
    version: 1,
    cityId: "",
    locale,
    notificationsEnabled: false,
    enabledPrayers: { ...ALL_PRAYERS_ENABLED },
  };
}

function normalizeSettings(value: unknown): ExtensionSettings {
  const fallback = defaultExtensionSettings();
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<ExtensionSettings>;
  const enabledCandidate = candidate.enabledPrayers;
  const enabledPrayers = { ...ALL_PRAYERS_ENABLED };
  if (enabledCandidate && typeof enabledCandidate === "object") {
    for (const key of PRAYER_KEYS) {
      if (typeof enabledCandidate[key] === "boolean") enabledPrayers[key] = enabledCandidate[key];
    }
  }
  return {
    version: 1,
    cityId: typeof candidate.cityId === "string" ? candidate.cityId : "",
    locale: isSupportedLocale(candidate.locale) ? candidate.locale : fallback.locale,
    notificationsEnabled: candidate.notificationsEnabled === true,
    enabledPrayers,
  };
}

export async function readExtensionSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  return normalizeSettings(result[SETTINGS_STORAGE_KEY]);
}

export async function writeExtensionSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: normalizeSettings(settings) });
}

export async function updateExtensionSettings(
  update: Partial<Omit<ExtensionSettings, "version">>
): Promise<ExtensionSettings> {
  const current = await readExtensionSettings();
  const next = normalizeSettings({ ...current, ...update });
  await writeExtensionSettings(next);
  return next;
}

export async function migrateLegacySettings(
  cityId: string,
  locale: SupportedLocale
): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  if (result[SETTINGS_STORAGE_KEY]) return normalizeSettings(result[SETTINGS_STORAGE_KEY]);
  const migrated = { ...defaultExtensionSettings(locale), cityId };
  await writeExtensionSettings(migrated);
  return migrated;
}

function prayerDayStorageKey(cityId: string, date: string): string {
  return `${PRAYER_DAY_PREFIX}${cityId}:${date}`;
}

export async function readStoredPrayerDay(
  cityId: string,
  date: string
): Promise<PrayerDay | undefined> {
  const key = prayerDayStorageKey(cityId, date);
  const result = await chrome.storage.local.get(key);
  const candidate = result[key];
  if (!candidate || typeof candidate !== "object") return undefined;
  const day = candidate as PrayerDay;
  const city = cityById(cityId);
  if (
    day.city?.id !== cityId ||
    day.requestedDate !== date ||
    !city ||
    day.method?.id !== prayerMethodForCity(city).id
  ) {
    return undefined;
  }
  return day;
}

export async function writeStoredPrayerDay(day: PrayerDay): Promise<void> {
  await chrome.storage.local.set({
    [prayerDayStorageKey(day.city.id, day.requestedDate)]: day,
  });
}

export async function readStoredSchedule(): Promise<PrayerScheduleEntry[]> {
  const result = await chrome.storage.local.get(SCHEDULE_STORAGE_KEY);
  const value = result[SCHEDULE_STORAGE_KEY];
  return Array.isArray(value) ? (value as PrayerScheduleEntry[]) : [];
}

export async function writeStoredSchedule(schedule: PrayerScheduleEntry[]): Promise<void> {
  await chrome.storage.local.set({ [SCHEDULE_STORAGE_KEY]: schedule });
}

async function readDeliveries(): Promise<Record<string, number>> {
  const result = await chrome.storage.local.get(DELIVERY_STORAGE_KEY);
  const value = result[DELIVERY_STORAGE_KEY];
  return value && typeof value === "object" ? (value as Record<string, number>) : {};
}

export async function wasDelivered(id: string): Promise<boolean> {
  const deliveries = await readDeliveries();
  return typeof deliveries[id] === "number";
}

export async function markDelivered(id: string, deliveredAt = Date.now()): Promise<void> {
  const deliveries = await readDeliveries();
  const cutoff = deliveredAt - 3 * 24 * 60 * 60 * 1000;
  const recent = Object.fromEntries(
    Object.entries(deliveries).filter(([, timestamp]) => timestamp >= cutoff)
  );
  recent[id] = deliveredAt;
  await chrome.storage.local.set({ [DELIVERY_STORAGE_KEY]: recent });
}
