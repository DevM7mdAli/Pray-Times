import {
  cityName,
  dayTimeline,
  formatHijriDate,
  formatPrayerTime,
  iqamahTimeFor,
  prayerKeysForCity,
  prayerNameForCity,
  prayerTimestamp,
  sunriseName,
  sunsetName,
  type City,
  type IqamahSettingsByCity,
  type PrayerDay,
  type PrayerKey,
  type SupportedLocale,
} from "@pray-times/core";

export type WidgetPrayerEntry = {
  key: PrayerKey;
  name: string;
  time: string;
  timestampMs: number;
  iqamahTime?: string;
};

export type WidgetTimelineEntry = {
  id: string;
  kind: "prayer" | "sunrise" | "sunset";
  prayerKey?: PrayerKey;
  name: string;
  time: string;
  iqamahTime?: string;
};

export type WidgetDayPayload = {
  date: string;
  prayers: WidgetPrayerEntry[];
  timeline: WidgetTimelineEntry[];
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

function buildDayPayload(
  day: PrayerDay,
  locale: SupportedLocale,
  iqamahByCity: IqamahSettingsByCity
): WidgetDayPayload {
  const cityIqamah = iqamahByCity[day.city.id] ?? {};
  return {
    date: day.requestedDate,
    prayers: prayerKeysForCity(day.city).map((key) => {
      const iqamah = cityIqamah[key];
      return {
        key,
        name: prayerNameForCity(key, day.city, locale),
        time: formatPrayerTime(day.timings[key], locale),
        timestampMs: prayerTimestamp(day, key),
        ...(iqamah
          ? { iqamahTime: formatPrayerTime(iqamahTimeFor(day.timings[key], iqamah), locale) }
          : {}),
      };
    }),
    timeline: dayTimeline(day).map((entry) => {
      if (entry.kind !== "prayer") {
        return {
          id: entry.kind,
          kind: entry.kind,
          name: entry.kind === "sunrise" ? sunriseName(locale) : sunsetName(locale),
          time: formatPrayerTime(entry.time, locale),
        };
      }
      const iqamah = cityIqamah[entry.key];
      return {
        id: entry.key,
        kind: entry.kind,
        prayerKey: entry.key,
        name: prayerNameForCity(entry.key, day.city, locale),
        time: formatPrayerTime(entry.time, locale),
        ...(iqamah
          ? { iqamahTime: formatPrayerTime(iqamahTimeFor(entry.time, iqamah), locale) }
          : {}),
      };
    }),
  };
}

export function buildWidgetPayload(options: {
  today: PrayerDay;
  tomorrow: PrayerDay;
  city: City;
  locale: SupportedLocale;
  isRtl: boolean;
  iqamahByCity: IqamahSettingsByCity;
}): WidgetPayload {
  const { today, tomorrow, city, locale, isRtl, iqamahByCity } = options;
  return {
    locale,
    isRtl,
    cityName: cityName(city, locale),
    hijriDate: formatHijriDate(today.hijri, locale),
    updatedAt: Date.now(),
    today: buildDayPayload(today, locale, iqamahByCity),
    tomorrow: buildDayPayload(tomorrow, locale, iqamahByCity),
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
