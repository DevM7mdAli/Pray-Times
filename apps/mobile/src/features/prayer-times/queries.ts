import { useEffect, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ProviderError,
  VerificationError,
  addDaysToLocalDate,
  fetchAyah,
  fetchPrayerDay,
  localDateFor,
  parsePrayerDay,
  randomAyahNumber,
  searchPlaces,
  type City,
  type PrayerDay,
} from "@pray-times/core";

function cityAnchor(city: City) {
  return [city.id, city.latitude, city.longitude, city.timeZone, city.methodId ?? null] as const;
}

function ensurePrayerDay(day: PrayerDay): PrayerDay {
  const parsed = parsePrayerDay(day);
  if (!parsed) throw new Error("The saved prayer day is invalid");
  return parsed;
}

export function usePrayerDays(city: City, now: Date) {
  const todayDate = localDateFor(city.timeZone, now);
  const tomorrowDate = addDaysToLocalDate(todayDate, 1);
  const anchor = cityAnchor(city);
  const [today, tomorrow] = useQueries({
    queries: [todayDate, tomorrowDate].map((date) => ({
      queryKey: ["prayer-day", ...anchor, date] as const,
      queryFn: () => fetchPrayerDay(city, { date }),
      select: ensurePrayerDay,
      staleTime: 5 * 60_000,
      meta: { persist: true },
    })),
  });
  return { today: today!, tomorrow: tomorrow!, todayDate, tomorrowDate };
}

export function useAyah(number: number) {
  return useQuery({
    queryKey: ["ayah", number],
    queryFn: () => fetchAyah({ number }),
    staleTime: Infinity,
  });
}

export function useFreshAyahNumber(): [number, () => void] {
  const [number, setNumber] = useState(() => randomAyahNumber());
  return [number, () => setNumber(randomAyahNumber())];
}

function useDebouncedValue(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

export function usePlaceSearch(query: string) {
  const debounced = useDebouncedValue(query.trim());
  return useQuery({
    queryKey: ["place-search", debounced],
    queryFn: () => searchPlaces(debounced, { limit: 6 }),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60_000,
    retry: (failureCount, error) =>
      error instanceof VerificationError
        ? false
        : error instanceof ProviderError
          ? error.retryable && failureCount < 1
          : failureCount < 1,
  });
}
