import { parseAyahResponse, parsePrayerDayResponse } from "./schemas.js";
import { localDateFor } from "./time.js";
import type { Ayah, City, PrayerDay } from "./types.js";

const PRAYER_API_ORIGIN = "https://api.aladhan.com";
const QURAN_API_ORIGIN = "https://api.alquran.cloud";
const REQUEST_TIMEOUT_MS = 7000;

type FetchLike = typeof fetch;

export class ProviderError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = "ProviderError";
    this.retryable = retryable;
  }
}

function createPrayerUrl(city: City, date: string): URL {
  const url = new URL(`/v1/timings/${date}`, PRAYER_API_ORIGIN);
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set("method", "4");
  return url;
}

function createAyahUrl(number: number): URL {
  return new URL(`/v1/ayah/${number}/quran-uthmani`, QURAN_API_ORIGIN);
}

async function requestJson(url: URL, fetchImpl: FetchLike, retry = true): Promise<unknown> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      const retryable = response.status >= 500;
      if (retry && retryable) return requestJson(url, fetchImpl, false);
      throw new ProviderError(`Provider request failed (${response.status})`, retryable);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (retry) return requestJson(url, fetchImpl, false);
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "The provider did not respond in time"
        : "Could not reach the provider";
    throw new ProviderError(message, true);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function fetchPrayerDay(
  city: City,
  options: { date?: string; now?: Date; fetchImpl?: FetchLike } = {}
): Promise<PrayerDay> {
  const date = options.date ?? localDateFor(city.timeZone, options.now);
  const payload = await requestJson(createPrayerUrl(city, date), options.fetchImpl ?? fetch);
  return parsePrayerDayResponse(payload, city, date);
}

export function randomAyahNumber(random = Math.random): number {
  return Math.floor(random() * 6236) + 1;
}

export async function fetchAyah(
  options: { number?: number; fetchImpl?: FetchLike } = {}
): Promise<Ayah> {
  const number = options.number ?? randomAyahNumber();
  if (!Number.isInteger(number) || number < 1 || number > 6236) {
    throw new RangeError("Qur'an verse number must be an integer from 1 to 6236");
  }
  const payload = await requestJson(createAyahUrl(number), options.fetchImpl ?? fetch);
  return parseAyahResponse(payload, number);
}
