import {
  PRAYER_KEYS,
  cityWithMethod,
  isSupportedLocale,
  isUsablePrayerDay,
  parseMethodOverrides,
  parseSavedCities,
  prayerMethodForCity,
  resolveCity,
  type City,
  type PrayerDay,
  type PrayerMethodId,
  type PrayerKey,
  type PrayerScheduleEntry,
  type SupportedLocale,
} from "@pray-times/core";
import { browserApi } from "./browser-api.js";

export const SETTINGS_STORAGE_KEY = "pray-times:extension-settings:v1";
export const SCHEDULE_STORAGE_KEY = "pray-times:notification-schedule:v1";
const DELIVERY_STORAGE_KEY = "pray-times:notification-deliveries:v1";
const PRAYER_DAY_PREFIX = "pray-times:extension-prayer-day:v1:";

export type ExtensionSettings = {
  version: 1;
  cityId: string;
  locale: SupportedLocale;
  notificationsEnabled: boolean;
  badgeEnabled: boolean;
  enabledPrayers: Record<PrayerKey, boolean>;
  /** Places found by search, which are not in the bundled catalog. */
  savedCities: City[];
  /** Per-place authority chosen by the reader, overriding the country default. */
  methodOverrides: Record<string, PrayerMethodId>;
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
    badgeEnabled: true,
    enabledPrayers: { ...ALL_PRAYERS_ENABLED },
    savedCities: [],
    methodOverrides: {},
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
    // Settings saved before the badge existed have no value here, and the
    // badge is on by default, so only an explicit false turns it off.
    badgeEnabled: candidate.badgeEnabled !== false,
    enabledPrayers,
    // Stored places are re-validated on every read rather than trusted.
    savedCities: parseSavedCities(candidate.savedCities),
    methodOverrides: parseMethodOverrides(candidate.methodOverrides),
  };
}

export async function readExtensionSettings(): Promise<ExtensionSettings> {
  const result = await browserApi.storage.local.get(SETTINGS_STORAGE_KEY);
  return normalizeSettings(result[SETTINGS_STORAGE_KEY]);
}

export async function writeExtensionSettings(settings: ExtensionSettings): Promise<void> {
  await browserApi.storage.local.set({ [SETTINGS_STORAGE_KEY]: normalizeSettings(settings) });
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
  const result = await browserApi.storage.local.get(SETTINGS_STORAGE_KEY);
  if (result[SETTINGS_STORAGE_KEY]) return normalizeSettings(result[SETTINGS_STORAGE_KEY]);
  const migrated = { ...defaultExtensionSettings(locale), cityId };
  await writeExtensionSettings(migrated);
  return migrated;
}

function prayerDayStorageKey(cityId: string, date: string): string {
  return `${PRAYER_DAY_PREFIX}${cityId}:${date}`;
}

export async function readStoredPrayerDay(
  city: City,
  date: string
): Promise<PrayerDay | undefined> {
  const key = prayerDayStorageKey(city.id, date);
  const result = await browserApi.storage.local.get(key);
  const candidate = result[key];
  if (!isUsablePrayerDay(candidate)) return undefined;
  const day = candidate;
  if (
    day.city?.id !== city.id ||
    day.requestedDate !== date ||
    // A detected place keeps one id as the reader moves, so the coordinates are
    // checked too rather than trusting the id alone.
    day.city?.latitude !== city.latitude ||
    day.city?.longitude !== city.longitude ||
    day.method?.id !== prayerMethodForCity(city).id
  ) {
    return undefined;
  }
  return day;
}

/** The place the reader has chosen, whether bundled or saved by search. */
export function selectedCity(settings: ExtensionSettings): City | undefined {
  const city = resolveCity(settings.cityId, settings.savedCities);
  return city ? cityWithMethod(city, settings.methodOverrides[city.id]) : undefined;
}

export async function writeStoredPrayerDay(day: PrayerDay): Promise<void> {
  await browserApi.storage.local.set({
    [prayerDayStorageKey(day.city.id, day.requestedDate)]: day,
  });
}

export async function readStoredSchedule(): Promise<PrayerScheduleEntry[]> {
  const result = await browserApi.storage.local.get(SCHEDULE_STORAGE_KEY);
  const value = result[SCHEDULE_STORAGE_KEY];
  return Array.isArray(value) ? (value as PrayerScheduleEntry[]) : [];
}

export async function writeStoredSchedule(schedule: PrayerScheduleEntry[]): Promise<void> {
  await browserApi.storage.local.set({ [SCHEDULE_STORAGE_KEY]: schedule });
}

async function readDeliveries(): Promise<Record<string, number>> {
  const result = await browserApi.storage.local.get(DELIVERY_STORAGE_KEY);
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
  await browserApi.storage.local.set({ [DELIVERY_STORAGE_KEY]: recent });
}
