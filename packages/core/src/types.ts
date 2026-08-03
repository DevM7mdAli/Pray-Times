import type { PrayerMethod, PrayerMethodId } from "./methods.js";

export const PRAYER_KEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export type PrayerKey = (typeof PRAYER_KEYS)[number];

export type IqamahTimeSetting =
  { mode: "offset"; minutes: number } | { mode: "exact"; time: string };

export type PrayerIqamahSettings = Partial<Record<PrayerKey, IqamahTimeSetting>>;
export type IqamahSettingsByCity = Record<string, PrayerIqamahSettings>;

/**
 * Where a place came from.
 *
 * Only the origin differs: a searched or detected place is pinned exactly like a
 * bundled one, and every response is checked against it the same way.
 */
export type CitySource = "preset" | "searched" | "detected";

export type City = {
  id: string;
  nameAr: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  /** IANA zone, verified against the one the provider returns. */
  timeZone: string;
  /** ISO 3166-1 alpha-2, which decides the default calculation method. */
  countryCode?: string;
  /**
   * Pins the calculation method, overriding the country default. Set when a
   * place follows an authority other than its country's, and whenever a reader
   * chooses one explicitly.
   */
  methodId?: PrayerMethodId;
  source?: CitySource;
};

export type HijriDate = {
  day: string;
  /** 1-12, where 9 is Ramadan. Absent from days cached before it was parsed. */
  month?: number;
  monthAr: string;
  monthEn: string;
  year: string;
};

/** The ninth Hijri month. */
export const RAMADAN_MONTH = 9;

export type PrayerDay = {
  requestedDate: string;
  city: City;
  method: PrayerMethod;
  timings: Record<PrayerKey, string>;
  /**
   * Solar sunrise, which closes the Fajr window. Not a prayer, and optional so
   * that a provider omitting it never invalidates the prayer times themselves.
   * Days cached before this was parsed also arrive without it.
   */
  sunrise?: string;
  /** Solar sunset (Al-Ghurub), kept distinct from the calculated Maghrib time. */
  sunset?: string;
  /**
   * The end of suhoor, shortly before Fajr. Optional for the same reason as
   * sunrise: it enriches Ramadan but must never block a verified day.
   */
  imsak?: string;
  hijri: HijriDate;
  fetchedAt: string;
};

export type FastingPhase = "suhoor" | "fasting" | "completed";

export type FastingStatus = {
  phase: FastingPhase;
  /** The moment the current phase ends; absent once the fast is complete. */
  time?: string;
  minutesUntil?: number;
};

export type Ayah = {
  number: number;
  text: string;
  edition: "quran-uthmani";
  surah: {
    number: number;
    name: string;
    englishName?: string;
  };
  numberInSurah: number;
};

export type RemoteData<T> =
  | { status: "idle"; data?: undefined; message?: undefined }
  | { status: "loading"; data?: T; message?: undefined }
  | { status: "success"; data: T; message?: undefined }
  | { status: "stale"; data: T; message: string }
  | { status: "error"; data?: undefined; message: string };

export type NextPrayer = {
  key: PrayerKey;
  time: string;
  minutesUntil: number;
  isTomorrow: boolean;
};

export type PrayerScheduleEntry = {
  id: string;
  key: PrayerKey;
  cityId: string;
  requestedDate: string;
  time: string;
  scheduledTime: number;
};
