import {
  PRAYER_KEYS,
  type City,
  type HijriDate,
  type NextPrayer,
  type PrayerDay,
  type PrayerKey,
  type PrayerMethod
} from "./types.js";

const TIME_PATTERN = /^(?<hour>[01]?\d|2[0-3]):(?<minute>[0-5]\d)/;
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export const SUPPORTED_LOCALES = ["ar", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const PRAYER_NAMES: Record<PrayerKey, Record<SupportedLocale, string>> = {
  Fajr: { ar: "الفجر", en: "Fajr" },
  Dhuhr: { ar: "الظهر", en: "Dhuhr" },
  Asr: { ar: "العصر", en: "Asr" },
  Maghrib: { ar: "المغرب", en: "Maghrib" },
  Isha: { ar: "العشاء", en: "Isha" }
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
    year: "numeric"
  }).formatToParts(now);
  const find = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
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
    hourCycle: "h23"
  }).formatToParts(now);
  const find = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const hour = find("hour");
  const minute = find("minute");
  if (!hour || !minute) throw new Error("Could not determine local time");
  return Number(hour) * 60 + Number(minute);
}

export function nextPrayerFor(day: PrayerDay, now = new Date()): NextPrayer {
  const currentMinute = localMinutesFor(day.city.timeZone, now);
  for (const key of PRAYER_KEYS) {
    const time = day.timings[key];
    const target = minutesSinceMidnight(time);
    if (target >= currentMinute) {
      return { key, time, minutesUntil: target - currentMinute, isTomorrow: false };
    }
  }
  const firstKey: PrayerKey = PRAYER_KEYS[0];
  const firstTime = day.timings[firstKey];
  return {
    key: firstKey,
    time: firstTime,
    minutesUntil: 24 * 60 - currentMinute + minutesSinceMidnight(firstTime),
    isTomorrow: true
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

export function prayerNameAr(key: PrayerKey): string {
  return prayerName(key, "ar");
}

export function prayerName(key: PrayerKey, locale: SupportedLocale): string {
  return PRAYER_NAMES[key][locale];
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
    timeZone
  }).format(new Date(value));
}
