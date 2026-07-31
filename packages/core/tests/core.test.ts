import assert from "node:assert/strict";
import test from "node:test";
import {
  CITIES,
  assertCityCatalog,
  cityById,
  fetchAyah,
  fetchPrayerDay,
  formatArabicTime,
  nextPrayerFor,
  parseAyahResponse,
  parsePrayerDayResponse,
  type City
} from "../src/index.ts";

const riyadh = cityById("riyadh") as City;

function prayerPayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    code: 200,
    status: "OK",
    data: {
      timings: {
        Fajr: "03:54",
        Dhuhr: "12:00",
        Asr: "15:26",
        Maghrib: "18:38",
        Isha: "20:08"
      },
      date: {
        gregorian: { date: "31-07-2026" },
        hijri: { day: "17", month: { ar: "صفر" }, year: "1448" }
      },
      meta: {
        latitude: riyadh.latitude,
        longitude: riyadh.longitude,
        timezone: "Asia/Riyadh",
        method: { id: 4, name: "Umm Al-Qura University, Makkah" }
      },
      ...overrides
    }
  };
}

function ayahPayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    code: 200,
    status: "OK",
    data: {
      number: 1,
      text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      edition: { identifier: "quran-uthmani" },
      surah: { number: 1, name: "سُورَةُ ٱلْفَاتِحَةِ" },
      numberInSurah: 1,
      ...overrides
    }
  };
}

test("the curated Saudi city catalog is unique and keeps Riyadh coordinates", () => {
  assert.doesNotThrow(() => assertCityCatalog());
  assert.equal(CITIES.length >= 20, true);
  assert.deepEqual(cityById("riyadh"), {
    id: "riyadh",
    nameAr: "الرياض",
    nameEn: "Riyadh",
    latitude: 24.7136,
    longitude: 46.6753,
    timeZone: "Asia/Riyadh"
  });
});

test("prayer payload is normalized only after all accuracy checks pass", () => {
  const day = parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026", "2026-07-31T08:00:00.000Z");
  assert.equal(day.timings.Asr, "15:26");
  assert.equal(day.hijri.monthAr, "صفر");
  assert.equal(day.method.id, 4);
});

test("mismatched coordinates are rejected even when the provider says OK", () => {
  const payload = prayerPayload({
    meta: {
      latitude: 8.8888888,
      longitude: 7.7777777,
      timezone: "Asia/Riyadh",
      method: { id: 4, name: "Umm Al-Qura University, Makkah" }
    }
  });
  assert.throws(
    () => parsePrayerDayResponse(payload, riyadh, "31-07-2026"),
    /coordinates do not match/
  );
});

test("a provider error encoded in a 200 body is rejected", () => {
  assert.throws(
    () => parsePrayerDayResponse({ code: 400, status: "Bad Request", data: {} }, riyadh, "31-07-2026"),
    /did not confirm/
  );
});

test("Arabic time keeps leading-zero minutes and identifies the next prayer", () => {
  assert.equal(formatArabicTime("05:05"), "٥:٠٥ ص");
  const day = parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026");
  const next = nextPrayerFor(day, new Date("2026-07-31T11:30:00+03:00"));
  assert.equal(next.key, "Dhuhr");
  assert.equal(next.minutesUntil, 30);
});

test("Qur'an verse labels use numberInSurah and require the requested edition", () => {
  const ayah = parseAyahResponse(ayahPayload(), 1);
  assert.equal(ayah.numberInSurah, 1);
  assert.equal(ayah.surah.number, 1);
  assert.throws(
    () => parseAyahResponse(ayahPayload({ edition: { identifier: "quran-simple" } }), 1),
    /unexpected Qur'an edition/
  );
});

test("request clients use coordinates and reject invalid verse numbers before network access", async () => {
  let requested = "";
  const fetchImpl: typeof fetch = async (input) => {
    requested = String(input);
    return new Response(JSON.stringify(prayerPayload()), { status: 200 });
  };
  await fetchPrayerDay(riyadh, { date: "31-07-2026", fetchImpl });
  assert.match(requested, /latitude=24.7136/);
  assert.match(requested, /longitude=46.6753/);
  assert.doesNotMatch(requested, /timingsByCity/);
  await assert.rejects(() => fetchAyah({ number: 0 }), /1 to 6236/);
});
