export const PRAYER_KEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export type PrayerKey = (typeof PRAYER_KEYS)[number];

export type City = {
  id: string;
  nameAr: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  timeZone: "Asia/Riyadh";
};

export type PrayerMethod = {
  id: 4;
  name: "Umm Al-Qura University, Makkah";
  nameAr: "أم القرى، مكة المكرمة";
};

export const UMM_AL_QURA: PrayerMethod = {
  id: 4,
  name: "Umm Al-Qura University, Makkah",
  nameAr: "أم القرى، مكة المكرمة"
};

export type HijriDate = {
  day: string;
  monthAr: string;
  year: string;
};

export type PrayerDay = {
  requestedDate: string;
  city: City;
  method: PrayerMethod;
  timings: Record<PrayerKey, string>;
  hijri: HijriDate;
  fetchedAt: string;
};

export type Ayah = {
  number: number;
  text: string;
  edition: "quran-uthmani";
  surah: {
    number: number;
    name: string;
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
