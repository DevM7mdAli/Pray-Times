import { assertCity } from "./cities.js";
import { requestJson, type FetchLike } from "./request.js";
import type { City } from "./types.js";

/**
 * Place search.
 *
 * The provider answers with coordinates, an IANA zone, and a country code,
 * which is exactly the anchor a searched place needs: once chosen it is pinned
 * and every prayer response is checked against it the same way a bundled city
 * is. Nothing here asks for the reader's location.
 */

const GEOCODING_ORIGIN = "https://geocoding-api.open-meteo.com";

/** Matches the precision of the bundled catalog, roughly eleven metres. */
const COORDINATE_PRECISION = 4;

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

export type PlaceSuggestion = {
  city: City;
  /** Region and country, for telling identically named places apart. */
  contextAr: string;
  contextEn: string;
  population?: number;
};

type UnknownRecord = Record<string, unknown>;

type LocalizedPlace = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  countryCode: string;
  context: string;
  population?: number;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function round(value: number): number {
  return Number(value.toFixed(COORDINATE_PRECISION));
}

function text(source: UnknownRecord, field: string): string | undefined {
  const value = source[field];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function readPlace(entry: unknown, separator: string): LocalizedPlace | undefined {
  if (!isRecord(entry)) return undefined;
  const id = entry.id;
  const latitude = entry.latitude;
  const longitude = entry.longitude;
  const name = text(entry, "name");
  const timeZone = text(entry, "timezone");
  const countryCode = text(entry, "country_code");
  if (
    typeof id !== "number" ||
    !Number.isFinite(id) ||
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !name ||
    !timeZone ||
    !countryCode
  ) {
    return undefined;
  }
  const region = text(entry, "admin1");
  const country = text(entry, "country");
  const population = typeof entry.population === "number" ? entry.population : undefined;
  return {
    id,
    name,
    latitude: round(latitude),
    longitude: round(longitude),
    timeZone,
    countryCode,
    context: [region, country].filter(Boolean).join(separator) || countryCode,
    ...(population === undefined ? {} : { population }),
  };
}

function createSearchUrl(query: string, language: string, limit: number): URL {
  const url = new URL("/v1/search", GEOCODING_ORIGIN);
  url.searchParams.set("name", query);
  url.searchParams.set("count", String(limit));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  return url;
}

async function searchLanguage(
  query: string,
  language: string,
  limit: number,
  fetchImpl: FetchLike
): Promise<LocalizedPlace[]> {
  const payload = await requestJson(createSearchUrl(query, language, limit), fetchImpl);
  // A query with no matches comes back without a `results` key at all.
  if (!isRecord(payload) || !Array.isArray(payload.results)) return [];
  const separator = language === "ar" ? "، " : ", ";
  return payload.results.flatMap((entry) => {
    const place = readPlace(entry, separator);
    return place ? [place] : [];
  });
}

/**
 * Searches for a place by name.
 *
 * Both languages are requested together and merged by id so a saved place
 * carries an Arabic and an English name, as every bundled city does. A result
 * that fails validation is dropped rather than failing the whole list, and an
 * empty query never reaches the network.
 */
export async function searchPlaces(
  query: string,
  options: { limit?: number; fetchImpl?: FetchLike } = {}
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed === "") return [];
  const limit = Math.min(Math.max(1, Math.trunc(options.limit ?? DEFAULT_LIMIT)), MAX_LIMIT);
  const fetchImpl = options.fetchImpl ?? fetch;

  const [english, arabic] = await Promise.allSettled([
    searchLanguage(trimmed, "en", limit, fetchImpl),
    searchLanguage(trimmed, "ar", limit, fetchImpl),
  ]);
  if (english.status === "rejected" && arabic.status === "rejected") throw english.reason;

  const englishPlaces = english.status === "fulfilled" ? english.value : [];
  const arabicPlaces = arabic.status === "fulfilled" ? arabic.value : [];
  const arabicById = new Map(arabicPlaces.map((place) => [place.id, place]));
  // Whichever language answered drives the ordering.
  const ordered = englishPlaces.length > 0 ? englishPlaces : arabicPlaces;

  return ordered.flatMap((place) => {
    const localized = arabicById.get(place.id);
    const city: City = {
      id: `geo:${place.id}`,
      // A language the provider could not supply falls back to the other rather
      // than inventing a translation.
      nameAr: localized?.name ?? place.name,
      nameEn: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      timeZone: place.timeZone,
      countryCode: place.countryCode,
      source: "searched",
    };
    try {
      assertCity(city);
    } catch {
      return [];
    }
    return [
      {
        city,
        contextAr: localized?.context ?? place.context,
        contextEn: place.context,
        ...(place.population === undefined ? {} : { population: place.population }),
      },
    ];
  });
}
