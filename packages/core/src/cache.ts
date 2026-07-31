import type { PrayerDay } from "./types.js";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CACHE_PREFIX = "pray-times:prayer-day:";

export function prayerCacheKey(cityId: string, date: string): string {
  return `${CACHE_PREFIX}${cityId}:${date}:umm-al-qura-4`;
}

export function readCachedPrayerDay(storage: StorageLike, cityId: string, date: string): PrayerDay | undefined {
  try {
    const raw = storage.getItem(prayerCacheKey(cityId, date));
    if (!raw) return undefined;
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== "object") return undefined;
    return candidate as PrayerDay;
  } catch {
    return undefined;
  }
}

export function cachePrayerDay(storage: StorageLike, day: PrayerDay): void {
  storage.setItem(prayerCacheKey(day.city.id, day.requestedDate), JSON.stringify(day));
}
