import { PRAYER_KEYS, type Ayah, type City, type PrayerDay, type PrayerKey } from "./types.js";
import { prayerMethodForCity } from "./cities.js";
import { parseTime } from "./time.js";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(source: UnknownRecord, field: string): string {
  const value = source[field];
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`Missing ${field} in API response`);
  return value;
}

function optionalStringField(source: UnknownRecord, field: string): string | undefined {
  const value = source[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`Invalid ${field} in API response`);
  return value;
}

function numberField(source: UnknownRecord, field: string): number {
  const value = source[field];
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Missing ${field} in API response`);
  return value;
}

function recordField(source: UnknownRecord, field: string): UnknownRecord {
  const value = source[field];
  if (!isRecord(value)) throw new Error(`Missing ${field} object in API response`);
  return value;
}

/**
 * Reads a time that enriches the day without being a prayer, such as sunrise.
 * A missing or malformed value is dropped rather than thrown, because these
 * must never stop verified prayer times from being shown.
 */
function supplementaryTime(source: UnknownRecord, field: string): string | undefined {
  const value = source[field];
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try {
    parseTime(value);
    return value;
  } catch {
    return undefined;
  }
}

/** The Hijri month number, dropped unless it is a real 1-12 month. */
function supplementaryMonth(source: UnknownRecord, field: string): number | undefined {
  const value = source[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 12) {
    return undefined;
  }
  return value;
}

function assertApiSuccess(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) throw new Error("Malformed API response");
  if (payload.code !== 200 || payload.status !== "OK")
    throw new Error("Provider did not confirm a successful response");
  return recordField(payload, "data");
}

function closeEnough(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= 0.06;
}

export function parsePrayerDayResponse(
  payload: unknown,
  city: City,
  requestedDate: string,
  fetchedAt = new Date().toISOString()
): PrayerDay {
  const data = assertApiSuccess(payload);
  const timingsSource = recordField(data, "timings");
  const timings = {} as Record<PrayerKey, string>;

  for (const key of PRAYER_KEYS) {
    const value = stringField(timingsSource, key);
    parseTime(value);
    timings[key] = value;
  }

  const sunrise = supplementaryTime(timingsSource, "Sunrise");
  const imsak = supplementaryTime(timingsSource, "Imsak");

  const date = recordField(data, "date");
  const gregorian = recordField(date, "gregorian");
  if (stringField(gregorian, "date") !== requestedDate) {
    throw new Error("Provider returned a different Gregorian date");
  }
  const hijri = recordField(date, "hijri");
  const hijriMonth = recordField(hijri, "month");
  const hijriMonthNumber = supplementaryMonth(hijriMonth, "number");

  const meta = recordField(data, "meta");
  if (
    !closeEnough(numberField(meta, "latitude"), city.latitude) ||
    !closeEnough(numberField(meta, "longitude"), city.longitude)
  ) {
    throw new Error("Provider coordinates do not match the selected city");
  }
  if (stringField(meta, "timezone") !== city.timeZone) {
    throw new Error("Provider timezone does not match the selected city");
  }
  const method = recordField(meta, "method");
  const expectedMethod = prayerMethodForCity(city);
  if (numberField(method, "id") !== expectedMethod.id) {
    throw new Error("Provider calculation method does not match the selected city profile");
  }

  return {
    requestedDate,
    city,
    method: expectedMethod,
    timings,
    ...(sunrise ? { sunrise } : {}),
    ...(imsak ? { imsak } : {}),
    hijri: {
      day: stringField(hijri, "day"),
      // Ramadan is detected by number, so the month names stay display-only.
      ...(hijriMonthNumber ? { month: hijriMonthNumber } : {}),
      monthAr: stringField(hijriMonth, "ar"),
      monthEn: stringField(hijriMonth, "en"),
      year: stringField(hijri, "year"),
    },
    fetchedAt,
  };
}

export function parseAyahResponse(payload: unknown, requestedNumber: number): Ayah {
  const data = assertApiSuccess(payload);
  const edition = recordField(data, "edition");
  const editionIdentifier = stringField(edition, "identifier");
  if (editionIdentifier !== "quran-uthmani") {
    throw new Error("Provider returned an unexpected Qur'an edition");
  }
  const number = numberField(data, "number");
  if (number !== requestedNumber || number < 1 || number > 6236) {
    throw new Error("Provider returned a different Qur'an verse");
  }
  const surah = recordField(data, "surah");
  const numberInSurah = numberField(data, "numberInSurah");
  if (!Number.isInteger(numberInSurah) || numberInSurah < 1)
    throw new Error("Invalid verse number in surah");

  return {
    number,
    text: stringField(data, "text"),
    edition: "quran-uthmani",
    surah: {
      number: numberField(surah, "number"),
      name: stringField(surah, "name"),
      englishName: optionalStringField(surah, "englishName"),
    },
    numberInSurah,
  };
}
