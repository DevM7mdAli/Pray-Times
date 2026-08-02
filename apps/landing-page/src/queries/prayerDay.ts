import { queryOptions, type UseQueryResult } from "@tanstack/react-query";
import {
  VerificationError,
  cachePrayerDay,
  fetchPrayerDay,
  prayerMethodForCity,
  readCachedPrayerDay,
  type City,
  type PrayerDay,
} from "@pray-times/core";

/** What the reader is told about the times on screen. */
export type LoadStatus = "loading" | "verified" | "cached" | "error" | "zone-mismatch";

/**
 * Core's cache is not a performance layer: it re-checks the coordinates and the
 * calculation method before returning a day, which is how a moved place or a
 * changed method invalidates itself. It stays the source of the offline copy
 * rather than being replaced by a generic query persister.
 */
function cachedDay(city: City, date: string): PrayerDay | undefined {
  try {
    return readCachedPrayerDay(localStorage, city, date);
  } catch {
    // A blocked storage means no offline copy, not a broken page.
    return undefined;
  }
}

export function prayerDayQuery(city: City, date: string) {
  return queryOptions({
    // The method is part of the key because two methods give the same city
    // different times, and the cache check keys on it too.
    queryKey: [
      "prayer-day",
      city.id,
      city.latitude,
      city.longitude,
      prayerMethodForCity(city).id,
      date,
    ],
    queryFn: async () => {
      const day = await fetchPrayerDay(city, { date });
      try {
        cachePrayerDay(localStorage, day);
      } catch {
        // A quota failure must not stop a verified result from rendering.
      }
      return day;
    },
    enabled: date !== "",
    // Present immediately when there is one, and still stale, so the verifying
    // request goes out on mount and the reader sees "cached" until it lands.
    initialData: () => cachedDay(city, date),
    initialDataUpdatedAt: 0,
  });
}

/**
 * Maps query state onto the four things the reader is actually told. A zone
 * that disagrees with the coordinates is not a network problem, and saying so
 * would send them chasing the wrong fix.
 */
export function loadStatusFor(query: UseQueryResult<PrayerDay>): LoadStatus {
  if (query.isError) {
    if (query.data) return "cached";
    return query.error instanceof VerificationError && query.error.field === "timeZone"
      ? "zone-mismatch"
      : "error";
  }
  if (!query.data) return "loading";
  return query.isFetchedAfterMount ? "verified" : "cached";
}
