export const PRAYER_KEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export type PrayerKey = (typeof PRAYER_KEYS)[number];

export type PrayerProfile = "default-five" | "custom-three";

export type City = {
  id: string;
  nameAr: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  timeZone: "Asia/Riyadh";
  prayerProfile?: PrayerProfile;
};

export type PrayerMethod =
  | {
      id: 4;
      name: "Umm Al-Qura University, Makkah";
      nameAr: "أم القرى، مكة المكرمة";
    }
  | {
      id: 0;
      name: "Custom time";
      nameAr: "توقيت مخصص";
    };

export const UMM_AL_QURA: PrayerMethod = {
  id: 4,
  name: "Umm Al-Qura University, Makkah",
  nameAr: "أم القرى، مكة المكرمة",
};

export const CUSTOM_PRAYER_METHOD: PrayerMethod = {
  id: 0,
  name: "Custom time",
  nameAr: "توقيت مخصص",
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
