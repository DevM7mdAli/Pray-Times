import { assertCity, cityById, isSupportedTimeZone, parseSavedCity } from "./cities.js";
import type { City } from "./types.js";

/**
 * Turning device coordinates into a pinned place.
 *
 * Coordinates are rounded before they are used for anything, so roughly a
 * kilometre of precision leaves the device. That is far finer than prayer times
 * need — a kilometre moves them by seconds — and it means a whole neighbourhood
 * shares one cache entry rather than each reader carving out their own.
 */

/** Roughly 1.1km. Prayer times move by seconds across that distance. */
export const DETECTED_COORDINATE_PRECISION = 2;

/**
 * One stable id, because "where I am now" is a single place that moves rather
 * than a new place each time. The caches compare coordinates as well as this
 * id, so moving still invalidates yesterday's times.
 */
export const DETECTED_CITY_ID = "gps:current";

export function roundDetectedCoordinate(value: number): number {
  return Number(value.toFixed(DETECTED_COORDINATE_PRECISION));
}

/**
 * The country a zone belongs to, used only to pick a starting authority.
 *
 * Device coordinates carry no country, and reverse geocoding would mean sending
 * a precise position to another provider. A zone is already on the device and
 * is a good enough hint: where it is wrong, the reader sees a named default and
 * can choose a different authority.
 *
 * Only zones whose country follows something other than the global default are
 * listed; everything else falls through to it anyway.
 */
const COUNTRY_BY_TIME_ZONE: Readonly<Record<string, string>> = {
  "Asia/Riyadh": "SA",
  "Asia/Kuwait": "KW",
  "Asia/Qatar": "QA",
  "Asia/Dubai": "AE",
  "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM",
  "Asia/Aden": "YE",
  "Asia/Amman": "JO",
  "Africa/Cairo": "EG",
  "Africa/Khartoum": "SD",
  "Africa/Tripoli": "LY",
  "Africa/Tunis": "TN",
  "Africa/Algiers": "DZ",
  "Africa/Casablanca": "MA",
  "Africa/El_Aaiun": "MA",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dhaka": "BD",
  "Asia/Kabul": "AF",
  "Asia/Colombo": "LK",
  "Asia/Tehran": "IR",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Kuching": "MY",
  "Asia/Brunei": "BN",
  "Asia/Jakarta": "ID",
  "Asia/Pontianak": "ID",
  "Asia/Makassar": "ID",
  "Asia/Jayapura": "ID",
  "Asia/Singapore": "SG",
  "Europe/Paris": "FR",
  "Europe/Lisbon": "PT",
  "Atlantic/Azores": "PT",
  "Atlantic/Madeira": "PT",
  "Europe/Istanbul": "TR",
  "Europe/Moscow": "RU",
  "Europe/Kaliningrad": "RU",
  "Europe/Samara": "RU",
  "Asia/Yekaterinburg": "RU",
  "Asia/Novosibirsk": "RU",
  "Asia/Krasnoyarsk": "RU",
  "Asia/Almaty": "KZ",
  "Asia/Aqtobe": "KZ",
  "Asia/Tashkent": "UZ",
  "Asia/Bishkek": "KG",
  "Asia/Dushanbe": "TJ",
  "Asia/Baku": "AZ",
  "America/New_York": "US",
  "America/Detroit": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Phoenix": "US",
  "America/Los_Angeles": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Montreal": "CA",
  "America/Winnipeg": "CA",
  "America/Edmonton": "CA",
  "America/Vancouver": "CA",
  "America/Halifax": "CA",
};

export function countryForTimeZone(timeZone: string | null | undefined): string | undefined {
  return typeof timeZone === "string" ? COUNTRY_BY_TIME_ZONE[timeZone.trim()] : undefined;
}

/**
 * The form of a place a server may act on after a client sent it.
 *
 * A bundled id always resolves to the catalog entry, so a caller cannot claim
 * different coordinates for a known city. Anything else is validated like any
 * stored place, and a detected position is coarsened again here rather than
 * trusting the sender to have done it.
 */
export function trustedCity(value: unknown): City | undefined {
  const claimedId =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { id?: unknown }).id
      : undefined;
  const preset = typeof claimedId === "string" ? cityById(claimedId) : undefined;
  if (preset) return preset;

  const city = parseSavedCity(value);
  if (!city) return undefined;
  if (city.source !== "detected") return city;
  return {
    ...city,
    latitude: roundDetectedCoordinate(city.latitude),
    longitude: roundDetectedCoordinate(city.longitude),
  };
}

/**
 * Builds the pinned place a detected position becomes.
 *
 * The result is an anchor like any other: once built, every provider response
 * is checked against these coordinates, this zone, and this method.
 */
export function cityFromCoordinates(input: {
  latitude: number;
  longitude: number;
  timeZone: string;
  nameAr: string;
  nameEn: string;
  countryCode?: string;
}): City {
  if (!isSupportedTimeZone(input.timeZone)) {
    throw new Error("The device did not report a usable time zone");
  }
  const countryCode = input.countryCode ?? countryForTimeZone(input.timeZone);
  const city: City = {
    id: DETECTED_CITY_ID,
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    latitude: roundDetectedCoordinate(input.latitude),
    longitude: roundDetectedCoordinate(input.longitude),
    timeZone: input.timeZone,
    ...(countryCode ? { countryCode } : {}),
    source: "detected",
  };
  assertCity(city);
  return city;
}
