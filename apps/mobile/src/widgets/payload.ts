import {
  cityName,
  formatHijriDate,
  formatPrayerTime,
  prayerKeysForCity,
  prayerNameForCity,
  prayerTimestamp,
  type City,
  type PrayerDay,
  type PrayerKey,
  type SupportedLocale,
} from "@pray-times/core";

export type WidgetPrayerEntry = {
  key: PrayerKey;
  name: string;
  time: string;
  timestampMs: number;
};

export type WidgetDayPayload = {
  date: string;
  prayers: WidgetPrayerEntry[];
};

export type WidgetPayload = {
  locale: SupportedLocale;
  isRtl: boolean;
  cityName: string;
  hijriDate: string;
  updatedAt: number;
  today: WidgetDayPayload;
  tomorrow: WidgetDayPayload;
};

function buildDayPayload(day: PrayerDay, locale: SupportedLocale): WidgetDayPayload {
  return {
    date: day.requestedDate,
    prayers: prayerKeysForCity(day.city).map((key) => ({
      key,
      name: prayerNameForCity(key, day.city, locale),
      time: formatPrayerTime(day.timings[key], locale),
      timestampMs: prayerTimestamp(day, key),
    })),
  };
}

export function buildWidgetPayload(options: {
  today: PrayerDay;
  tomorrow: PrayerDay;
  city: City;
  locale: SupportedLocale;
  isRtl: boolean;
}): WidgetPayload {
  const { today, tomorrow, city, locale, isRtl } = options;
  return {
    locale,
    isRtl,
    cityName: cityName(city, locale),
    hijriDate: formatHijriDate(today.hijri, locale),
    updatedAt: Date.now(),
    today: buildDayPayload(today, locale),
    tomorrow: buildDayPayload(tomorrow, locale),
  };
}

/**
 * Picks the next upcoming prayer purely from precomputed timestamps — no
 * timezone/locale math, so this is safe to run natively or in a headless JS
 * task, not just in the foreground app.
 */
export function pickNextEntry(
  payload: WidgetPayload,
  now = Date.now()
): (WidgetPrayerEntry & { isTomorrow: boolean }) | undefined {
  const todayEntry = payload.today.prayers.find((entry) => entry.timestampMs >= now);
  if (todayEntry) return { ...todayEntry, isTomorrow: false };
  const tomorrowEntry = payload.tomorrow.prayers.find((entry) => entry.timestampMs >= now);
  if (tomorrowEntry) return { ...tomorrowEntry, isTomorrow: true };
  return undefined;
}
