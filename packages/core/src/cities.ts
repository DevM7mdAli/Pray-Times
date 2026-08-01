import {
  defaultMethodForCountry,
  isPrayerMethodId,
  prayerMethodById,
  type PrayerMethod,
  type PrayerMethodId,
} from "./methods.js";
import { PRAYER_KEYS, type City, type PrayerKey } from "./types.js";

/**
 * Dhuhr stands for the Dhuhr and Asr window, Maghrib for the Maghrib and Isha
 * window. Used by any method whose practice combines them.
 */
const COMBINED_PRAYER_KEYS = ["Fajr", "Dhuhr", "Maghrib"] as const satisfies readonly PrayerKey[];

export const CITIES: readonly City[] = [
  {
    id: "riyadh",
    nameAr: "الرياض",
    nameEn: "Riyadh",
    latitude: 24.7136,
    longitude: 46.6753,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "jeddah",
    nameAr: "جدة",
    nameEn: "Jeddah",
    latitude: 21.4858,
    longitude: 39.1925,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "makkah",
    nameAr: "مكة المكرمة",
    nameEn: "Makkah",
    latitude: 21.3891,
    longitude: 39.8579,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "madinah",
    nameAr: "المدينة المنورة",
    nameEn: "Madinah",
    latitude: 24.5247,
    longitude: 39.5692,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "dammam",
    nameAr: "الدمام",
    nameEn: "Dammam",
    latitude: 26.4207,
    longitude: 50.0888,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "khobar",
    nameAr: "الخبر",
    nameEn: "Khobar",
    latitude: 26.2172,
    longitude: 50.1971,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "dhahran",
    nameAr: "الظهران",
    nameEn: "Dhahran",
    latitude: 26.2886,
    longitude: 50.1139,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "al-hofuf",
    nameAr: "الهفوف",
    nameEn: "Al Hofuf",
    latitude: 25.383,
    longitude: 49.5868,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "qatif",
    nameAr: "القطيف",
    nameEn: "Qatif",
    latitude: 26.5654,
    longitude: 50.0089,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "jubail",
    nameAr: "الجبيل",
    nameEn: "Jubail",
    latitude: 27.0174,
    longitude: 49.6225,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "buraydah",
    nameAr: "بريدة",
    nameEn: "Buraydah",
    latitude: 26.3592,
    longitude: 43.9818,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "unaizah",
    nameAr: "عنيزة",
    nameEn: "Unaizah",
    latitude: 26.09,
    longitude: 43.993,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "hail",
    nameAr: "حائل",
    nameEn: "Hail",
    latitude: 27.5114,
    longitude: 41.7208,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "tabuk",
    nameAr: "تبوك",
    nameEn: "Tabuk",
    latitude: 28.3838,
    longitude: 36.555,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "taif",
    nameAr: "الطائف",
    nameEn: "Taif",
    latitude: 21.2703,
    longitude: 40.4158,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "abha",
    nameAr: "أبها",
    nameEn: "Abha",
    latitude: 18.2164,
    longitude: 42.5053,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "khamis-mushait",
    nameAr: "خميس مشيط",
    nameEn: "Khamis Mushait",
    latitude: 18.3008,
    longitude: 42.7293,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "najran",
    nameAr: "نجران",
    nameEn: "Najran",
    latitude: 17.5656,
    longitude: 44.2289,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "jazan",
    nameAr: "جازان",
    nameEn: "Jazan",
    latitude: 16.8892,
    longitude: 42.5511,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "al-bahah",
    nameAr: "الباحة",
    nameEn: "Al Bahah",
    latitude: 20.0129,
    longitude: 41.4677,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "yanbu",
    nameAr: "ينبع",
    nameEn: "Yanbu",
    latitude: 24.0231,
    longitude: 38.189,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "sakaka",
    nameAr: "سكاكا",
    nameEn: "Sakaka",
    latitude: 29.9697,
    longitude: 40.2064,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "arar",
    nameAr: "عرعر",
    nameEn: "Arar",
    latitude: 30.9753,
    longitude: 41.0381,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "hafr-al-batin",
    nameAr: "حفر الباطن",
    nameEn: "Hafr Al Batin",
    latitude: 28.4328,
    longitude: 45.9708,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
  {
    id: "al-kharj",
    nameAr: "الخرج",
    nameEn: "Al Kharj",
    latitude: 24.1556,
    longitude: 47.312,
    timeZone: "Asia/Riyadh",
    countryCode: "SA",
  },
];

export function cityById(id: string | null | undefined): City | undefined {
  return CITIES.find((city) => city.id === id);
}

/**
 * Reads a place back out of storage.
 *
 * Stored data is not trusted: a place that has been tampered with, truncated, or
 * written by an older version is discarded rather than used as the anchor a
 * provider response is checked against.
 */
export function parseSavedCity(value: unknown): City | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Partial<City>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.nameAr !== "string" ||
    typeof candidate.nameEn !== "string" ||
    typeof candidate.latitude !== "number" ||
    typeof candidate.longitude !== "number" ||
    typeof candidate.timeZone !== "string"
  ) {
    return undefined;
  }
  const city: City = {
    id: candidate.id,
    nameAr: candidate.nameAr,
    nameEn: candidate.nameEn,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    timeZone: candidate.timeZone,
    ...(typeof candidate.countryCode === "string" ? { countryCode: candidate.countryCode } : {}),
    ...(isPrayerMethodId(candidate.methodId) ? { methodId: candidate.methodId } : {}),
    ...(candidate.source === "preset" ||
    candidate.source === "searched" ||
    candidate.source === "detected"
      ? { source: candidate.source }
      : {}),
  };
  try {
    assertCity(city);
  } catch {
    return undefined;
  }
  return city;
}

export function parseSavedCities(value: unknown): City[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((entry) => {
    const city = parseSavedCity(entry);
    if (!city || seen.has(city.id)) return [];
    seen.add(city.id);
    return [city];
  });
}

/**
 * Applies a reader's chosen authority on top of a place.
 *
 * Bundled cities are immutable, so an override is held separately and layered
 * on at resolution time rather than written into the catalog. Passing no method
 * returns the place to its country default.
 */
export function cityWithMethod(city: City, methodId?: unknown): City {
  if (methodId === undefined || methodId === null) return city;
  return isPrayerMethodId(methodId) ? { ...city, methodId } : city;
}

/** Reads the stored `city id -> method` map, dropping anything unusable. */
export function parseMethodOverrides(value: unknown): Record<string, PrayerMethodId> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const overrides: Record<string, PrayerMethodId> = {};
  for (const [id, methodId] of Object.entries(value)) {
    if (id.trim() !== "" && isPrayerMethodId(methodId)) overrides[id] = methodId;
  }
  return overrides;
}

/** A bundled preset always wins over a saved place with the same id. */
export function resolveCity(
  id: string | null | undefined,
  saved: readonly City[] = []
): City | undefined {
  return cityById(id) ?? saved.find((city) => city.id === id);
}

/**
 * The authority a place is calculated by.
 *
 * A pinned method always wins, whether it came from the catalog or from a
 * reader choosing one. Otherwise the country decides.
 */
export function prayerMethodForCity(city: City): PrayerMethod {
  return prayerMethodById(city.methodId) ?? defaultMethodForCountry(city.countryCode);
}

/**
 * Which prayers a method shows.
 *
 * A method whose practice combines Dhuhr with Asr and Maghrib with Isha reads
 * as three windows. That belongs to the authority rather than to any city, so
 * choosing such a method anywhere gives the combined view.
 */
export function prayerKeysForMethod(method: PrayerMethod): readonly PrayerKey[] {
  return method.combinesPrayers ? COMBINED_PRAYER_KEYS : PRAYER_KEYS;
}

export function prayerKeysForCity(city: City): readonly PrayerKey[] {
  return prayerKeysForMethod(prayerMethodForCity(city));
}

/** Whether a string is a zone this runtime can actually resolve times in. */
export function isSupportedTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || timeZone.trim() === "") return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks that a place is usable before anything is calculated from it.
 *
 * Applies to searched and detected places as much as bundled ones, since all
 * three become the anchor a provider response is verified against.
 */
export function assertCity(city: City): void {
  if (!city.id.trim()) throw new Error("City is missing an id");
  if (!Number.isFinite(city.latitude) || city.latitude < -90 || city.latitude > 90) {
    throw new Error(`City latitude is out of range: ${city.id}`);
  }
  if (!Number.isFinite(city.longitude) || city.longitude < -180 || city.longitude > 180) {
    throw new Error(`City longitude is out of range: ${city.id}`);
  }
  if (!isSupportedTimeZone(city.timeZone)) {
    throw new Error(`City has an unusable time zone: ${city.id}`);
  }
  if (city.countryCode !== undefined && !/^[A-Za-z]{2}$/.test(city.countryCode)) {
    throw new Error(`City country code is not ISO 3166-1 alpha-2: ${city.id}`);
  }
  if (city.methodId !== undefined && !isPrayerMethodId(city.methodId)) {
    throw new Error(`City pins an unknown calculation method: ${city.id}`);
  }
}

export function assertCityCatalog(cities: readonly City[] = CITIES): void {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const seenCoordinates = new Set<string>();

  for (const city of cities) {
    if (seenIds.has(city.id) || seenNames.has(city.nameAr)) {
      throw new Error(`City catalog has a duplicate entry: ${city.id}`);
    }
    assertCity(city);
    // A preset without a country would silently fall back to a global default
    // rather than its own authority.
    if (!city.countryCode) throw new Error(`City catalog entry has no country: ${city.id}`);
    const coordinateKey = `${city.latitude},${city.longitude}`;
    if (seenCoordinates.has(coordinateKey)) {
      throw new Error(`City catalog has duplicate coordinates: ${city.id}`);
    }
    seenIds.add(city.id);
    seenNames.add(city.nameAr);
    seenCoordinates.add(coordinateKey);
  }
}
