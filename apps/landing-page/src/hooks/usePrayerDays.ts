import { useQuery } from "@tanstack/react-query";
import {
  addDaysToLocalDate,
  fastingStatusFor,
  localDateFor,
  nextPrayerFor,
  type City,
  type FastingStatus,
  type NextPrayer,
  type PrayerDay,
} from "@pray-times/core";
import { useSelectedCity } from "../stores/preferences";
import { loadStatusFor, prayerDayQuery, type LoadStatus } from "../queries/prayerDay";
import { useNow } from "./useNow";

export type PrayerDays = {
  city: City;
  now: Date;
  day: PrayerDay | undefined;
  /** The prayer being counted down to, which may belong to tomorrow. */
  next: NextPrayer | undefined;
  nextDay: PrayerDay | undefined;
  fasting: FastingStatus | undefined;
  status: LoadStatus;
  retry: () => void;
};

/**
 * Everything the dashboard derives from the selected place and the current
 * time. Tomorrow is fetched alongside today so the countdown can roll past Isha
 * without waiting on a request at the moment it matters.
 */
export function usePrayerDays(): PrayerDays {
  const city = useSelectedCity();
  const now = useNow();
  const localDate = localDateFor(city.timeZone, now);
  const tomorrowDate = localDate ? addDaysToLocalDate(localDate, 1) : "";

  const today = useQuery(prayerDayQuery(city, localDate));
  const tomorrow = useQuery(prayerDayQuery(city, tomorrowDate));

  const day = today.data;
  const todayNext = day ? nextPrayerFor(day, now) : undefined;
  const next = todayNext?.isTomorrow
    ? tomorrow.data
      ? nextPrayerFor(tomorrow.data, now)
      : undefined
    : todayNext;

  return {
    city,
    now,
    day,
    next,
    nextDay: todayNext?.isTomorrow ? tomorrow.data : day,
    fasting: day ? fastingStatusFor(day, now) : undefined,
    status: loadStatusFor(today),
    retry: () => void today.refetch(),
  };
}
