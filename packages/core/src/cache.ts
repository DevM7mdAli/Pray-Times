import type { PrayerDay } from "./types.js";
import { cityById, prayerMethodForCity } from "./cities.js";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CACHE_PREFIX = "pray-times:prayer-day:";

export function prayerCacheKey(cityId: string, date: string): string {
  // Version 3 separates method-aware city profiles from older Umm Al-Qura-only data.
  return `${CACHE_PREFIX}${cityId}:${date}:method-profile:v3`;
}

export function readCachedPrayerDay(
  storage: StorageLike,
  cityId: string,
  date: string
): PrayerDay | undefined {
  try {
    const raw = storage.getItem(prayerCacheKey(cityId, date));
    if (!raw) return undefined;
    const candidate: unknown = JSON.parse(raw);
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
