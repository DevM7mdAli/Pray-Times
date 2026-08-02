import { type City, type PrayerDay } from "./types.js";
import { prayerMethodForCity } from "./cities.js";
import { prayerDaySchema } from "./validation.js";

/**
 * Whether a value read back from a cache is a day that can actually be used.
 *
 * A cache entry can be truncated, left over from an older shape, or — where a
 * cache is shared between places — written by something else entirely. Checking
 * the shape turns any of those into a refetch instead of a crash deep in
 * formatting.
 */
export function isUsablePrayerDay(value: unknown): value is PrayerDay {
  return prayerDaySchema.safeParse(value).success;
}

/** A synchronous key-value adapter; intentionally independent of the DOM Storage type. */
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const CACHE_PREFIX = "pray-times:prayer-day:";

export function prayerCacheKey(cityId: string, date: string): string {
  // Version 3 separates method-aware city profiles from older Umm Al-Qura-only data.
  return `${CACHE_PREFIX}${cityId}:${date}:method-profile:v3`;
}

/**
 * Takes the resolved place rather than an id, so a searched or detected place
 * reads its own cache instead of being looked up in the bundled catalog and
 * missing every time.
 */
export function readCachedPrayerDay(
  storage: StorageLike,
  city: City,
  date: string
): PrayerDay | undefined {
  try {
    const raw = storage.getItem(prayerCacheKey(city.id, date));
    if (!raw) return undefined;
    const candidate: unknown = JSON.parse(raw);
    if (!isUsablePrayerDay(candidate)) return undefined;
    const day = candidate;
    if (
      day.city?.id !== city.id ||
      day.requestedDate !== date ||
      // A detected place keeps one id as the reader moves, so the coordinates
      // are checked too rather than trusting the id alone.
      day.city?.latitude !== city.latitude ||
      day.city?.longitude !== city.longitude ||
      // A cached day calculated by a different authority is stale, which is how
      // a changed method override invalidates itself.
      day.method?.id !== prayerMethodForCity(city).id
    ) {
      return undefined;
    }
    return day;
  } catch {
    return undefined;
  }
}

export function cachePrayerDay(storage: StorageLike, day: PrayerDay): void {
  try {
    storage.setItem(prayerCacheKey(day.city.id, day.requestedDate), JSON.stringify(day));
  } catch {
    // A storage quota failure must not prevent a verified result from rendering.
  }
}
