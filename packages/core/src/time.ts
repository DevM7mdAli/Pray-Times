import type { PrayerMethod } from "./methods.js";
import {
  RAMADAN_MONTH,
  type City,
  type FastingStatus,
  type HijriDate,
  type NextPrayer,
  type PrayerDay,
  type PrayerKey,
  type PrayerScheduleEntry,
} from "./types.js";
import { prayerKeysForCity, prayerMethodForCity } from "./cities.js";

const TIME_PATTERN = /^(?<hour>[01]?\d|2[0-3]):(?<minute>[0-5]\d)/;
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export const SUPPORTED_LOCALES = ["ar", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const PRAYER_NAMES: Record<PrayerKey, Record<SupportedLocale, string>> = {
  Fajr: { ar: "الفجر", en: "Fajr" },
  Dhuhr: { ar: "الظهر", en: "Dhuhr" },
  Asr: { ar: "العصر", en: "Asr" },
  Maghrib: { ar: "المغرب", en: "Maghrib" },
  Isha: { ar: "العشاء", en: "Isha" },
};

/** Shown by any method that combines the two pairs. */
const COMBINED_WINDOW_NAMES: Partial<Record<PrayerKey, Record<SupportedLocale, string>>> = {
  Dhuhr: { ar: "الظهر والعصر", en: "Dhuhr & Asr" },
  Maghrib: { ar: "المغرب والعشاء", en: "Maghrib & Isha" },
};

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return value === "ar" || value === "en";
}

export function localeDirection(locale: SupportedLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function parseTime(value: string): { hour: number; minute: number } {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match?.groups) throw new Error(`Invalid prayer time: ${value}`);
  return { hour: Number(match.groups.hour), minute: Number(match.groups.minute) };
}

export function arabicNumerals(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)] ?? digit);
}

export function formatArabicTime(value: string): string {
  const { hour, minute } = parseTime(value);
  const period = hour < 12 ? "ص" : "م";
  const twelveHour = hour % 12 || 12;
  return `${arabicNumerals(twelveHour)}:${arabicNumerals(String(minute).padStart(2, "0"))} ${period}`;
}

export function formatPrayerTime(value: string, locale: SupportedLocale): string {
  if (locale === "ar") return formatArabicTime(value);
  const { hour, minute } = parseTime(value);
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export function minutesSinceMidnight(value: string): number {
  const { hour, minute } = parseTime(value);
  return hour * 60 + minute;
}

export function localDateFor(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(now);
  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const day = find("day");
  const month = find("month");
  const year = find("year");
  if (!day || !month || !year) throw new Error("Could not determine local date");
  return `${day}-${month}-${year}`;
}

export function localMinutesFor(timeZone: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const hour = find("hour");
  const minute = find("minute");
  if (!hour || !minute) throw new Error("Could not determine local time");
  return Number(hour) * 60 + Number(minute);
}

function dateParts(value: string): { day: number; month: number; year: number } {
  const match = /^(?<day>\d{2})-(?<month>\d{2})-(?<year>\d{4})$/.exec(value);
  if (!match?.groups) throw new Error(`Invalid local date: ${value}`);
  const day = Number(match.groups.day);
  const month = Number(match.groups.month);
  const year = Number(match.groups.year);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid local date: ${value}`);
  }
  return { day, month, year };
}

export function addDaysToLocalDate(value: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error("Days must be an integer");
  const { day, month, year } = dateParts(value);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${String(result.getUTCDate()).padStart(2, "0")}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${result.getUTCFullYear()}`;
}

function zonedParts(timeZone: string, timestamp: number): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])
  );
}

export function timestampForLocalTime(date: string, time: string, timeZone: string): number {
  const { day, month, year } = dateParts(date);
  const { hour, minute } = parseTime(time);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const first = zonedParts(timeZone, utcGuess);
  const firstAsUtc = Date.UTC(
    first.year ?? year,
    (first.month ?? month) - 1,
    first.day ?? day,
    first.hour ?? hour,
    first.minute ?? minute,
    first.second ?? 0
  );
  const firstResult = utcGuess - (firstAsUtc - utcGuess);
  const second = zonedParts(timeZone, firstResult);
  const secondAsUtc = Date.UTC(
    second.year ?? year,
    (second.month ?? month) - 1,
    second.day ?? day,
    second.hour ?? hour,
    second.minute ?? minute,
    second.second ?? 0
  );
  return firstResult - (secondAsUtc - utcGuess);
}

export function prayerTimestamp(day: PrayerDay, key: PrayerKey): number {
  return timestampForLocalTime(day.requestedDate, day.timings[key], day.city.timeZone);
}

export function prayerAlarmId(day: PrayerDay, key: PrayerKey): string {
  return `pray-times:prayer:${day.city.id}:${day.requestedDate}:${key}`;
}

export function buildPrayerSchedule(
  days: readonly PrayerDay[],
  enabledPrayers: Readonly<Record<PrayerKey, boolean>>,
  now = new Date()
): PrayerScheduleEntry[] {
  return days
    .flatMap((day) =>
      prayerKeysForCity(day.city)
        .filter((key) => enabledPrayers[key])
        .map((key) => ({
          id: prayerAlarmId(day, key),
          key,
          cityId: day.city.id,
          requestedDate: day.requestedDate,
          time: day.timings[key],
          scheduledTime: prayerTimestamp(day, key),
        }))
    )
    .filter((entry) => entry.scheduledTime > now.getTime())
    .sort((left, right) => left.scheduledTime - right.scheduledTime);
}

export function nextPrayerFor(day: PrayerDay, now = new Date()): NextPrayer {
  const prayerKeys = prayerKeysForCity(day.city);
  for (const key of prayerKeys) {
    const time = day.timings[key];
    const target = prayerTimestamp(day, key);
    if (target >= now.getTime()) {
      return {
        key,
        time,
        minutesUntil: Math.ceil((target - now.getTime()) / 60_000),
        isTomorrow: false,
      };
    }
  }
  const firstKey = prayerKeys[0] ?? "Fajr";
  const firstTime = day.timings[firstKey];
  const nextDate = addDaysToLocalDate(day.requestedDate, 1);
  const target = timestampForLocalTime(nextDate, firstTime, day.city.timeZone);
  return {
    key: firstKey,
    time: firstTime,
    minutesUntil: Math.ceil((target - now.getTime()) / 60_000),
    isTomorrow: true,
  };
}

export function formatRemainingArabic(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${arabicNumerals(remainder)} د`;
  return `${arabicNumerals(hours)} س ${arabicNumerals(String(remainder).padStart(2, "0"))} د`;
}

export function formatRemainingTime(minutes: number, locale: SupportedLocale): string {
  if (locale === "ar") return formatRemainingArabic(minutes);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  return `${hours} hr ${remainder} min`;
}

/**
 * Whether the day falls in Ramadan.
 *
 * Decided on the Hijri month number, never the month name, so it does not
 * depend on the provider's spelling or transliteration. A day cached before the
 * number was parsed simply reports false until it is refetched.
 */
export function isRamadan(day: PrayerDay): boolean {
  return day.hijri.month === RAMADAN_MONTH;
}

/**
 * Where the day stands against the fast.
 *
 * Suhoor runs until imsak, the fast until Maghrib, and after Maghrib the day is
 * complete. Tomorrow's suhoor is deliberately not counted down here, because
 * that would mean showing a time this day's verified data does not contain.
 */
export function fastingStatusFor(day: PrayerDay, now = new Date()): FastingStatus | undefined {
  if (!isRamadan(day)) return undefined;
  const current = now.getTime();
  const maghribAt = prayerTimestamp(day, "Maghrib");
  if (current >= maghribAt) return { phase: "completed" };

  // Imsak is optional, so Fajr closes suhoor whenever it is missing.
  const suhoorEnd = day.imsak ?? day.timings.Fajr;
  const suhoorEndsAt = timestampForLocalTime(day.requestedDate, suhoorEnd, day.city.timeZone);
  if (current < suhoorEndsAt) {
    return {
      phase: "suhoor",
      time: suhoorEnd,
      minutesUntil: Math.ceil((suhoorEndsAt - current) / 60_000),
    };
  }
  return {
    phase: "fasting",
    time: day.timings.Maghrib,
    minutesUntil: Math.ceil((maghribAt - current) / 60_000),
  };
}

const SUNRISE_NAMES: Record<SupportedLocale, string> = { ar: "الشروق", en: "Sunrise" };

export function sunriseName(locale: SupportedLocale): string {
  return SUNRISE_NAMES[locale];
}

/** A prayer, or a marker such as sunrise that only divides the day. */
export type DayTimelineEntry =
  { kind: "prayer"; key: PrayerKey; time: string } | { kind: "sunrise"; time: string };

/**
 * The day's rows in clock order, with sunrise placed by its own time rather
 * than assumed to follow Fajr. Both the popup and the dashboard read this so a
 * single rule decides what a day looks like.
 */
export function dayTimeline(day: PrayerDay): DayTimelineEntry[] {
  const entries: DayTimelineEntry[] = prayerKeysForCity(day.city).map((key) => ({
    kind: "prayer",
    key,
    time: day.timings[key],
  }));
  if (!day.sunrise) return entries;
  const sunrise: DayTimelineEntry = { kind: "sunrise", time: day.sunrise };
  const minutes = minutesSinceMidnight(day.sunrise);
  const index = entries.findIndex((entry) => minutesSinceMidnight(entry.time) > minutes);
  if (index === -1) entries.push(sunrise);
  else entries.splice(index, 0, sunrise);
  return entries;
}

/** Roughly what a toolbar badge can show before the engine truncates it. */
const BADGE_MAX_LENGTH = 4;

/**
 * The countdown shown on the toolbar icon. Minutes while the next prayer is
 * under an hour away, whole hours before that, kept short enough that no engine
 * truncates it.
 */
export function formatBadgeCountdown(minutesUntil: number, locale: SupportedLocale): string {
  if (!Number.isFinite(minutesUntil)) return "";
  const minutes = Math.max(0, Math.ceil(minutesUntil));
  const value = minutes < 60 ? minutes : Math.floor(minutes / 60);
  const unit = minutes < 60 ? (locale === "ar" ? "د" : "m") : locale === "ar" ? "س" : "h";
  const text = `${locale === "ar" ? arabicNumerals(value) : value}${unit}`;
  return text.length > BADGE_MAX_LENGTH ? "" : text;
}

/**
 * When the badge should next be redrawn.
 *
 * Inside the final hour the countdown changes every minute, so it ticks. Before
 * that a single wake-up at the top of the final hour is enough, which keeps the
 * background worker asleep for most of the gap between prayers.
 */
export function badgeRefreshAt(target: number, now: number): number {
  const finalHour = target - 60 * 60_000;
  return now < finalHour ? finalHour : now + 60_000;
}

export function prayerNameAr(key: PrayerKey): string {
  return prayerName(key, "ar");
}

export function prayerName(key: PrayerKey, locale: SupportedLocale): string {
  return PRAYER_NAMES[key][locale];
}

export function prayerNameForCity(key: PrayerKey, city: City, locale: SupportedLocale): string {
  if (prayerMethodForCity(city).combinesPrayers) {
    return COMBINED_WINDOW_NAMES[key]?.[locale] ?? PRAYER_NAMES[key][locale];
  }
  return prayerName(key, locale);
}

export function cityName(city: City, locale: SupportedLocale): string {
  return locale === "ar" ? city.nameAr : city.nameEn;
}

export function prayerMethodName(method: PrayerMethod, locale: SupportedLocale): string {
  return locale === "ar" ? method.nameAr : method.name;
}

export function formatHijriDate(hijri: HijriDate, locale: SupportedLocale): string {
  return locale === "ar"
    ? `${hijri.day} ${hijri.monthAr} ${hijri.year} هـ`
    : `${hijri.day} ${hijri.monthEn} ${hijri.year} AH`;
}

export function formatUpdatedAt(value: string, timeZone: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(value));
}
