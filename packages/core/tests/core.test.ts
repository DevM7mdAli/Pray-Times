import assert from "node:assert/strict";
import test from "node:test";
import {
  CITIES,
  addDaysToLocalDate,
  assertCityCatalog,
  buildPrayerSchedule,
  cityById,
  fetchAyah,
  fetchPrayerDay,
  formatArabicTime,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  nextPrayerFor,
  parseAyahResponse,
  parsePrayerDayResponse,
  prayerName,
  prayerNameForCity,
  prayerKeysForCity,
  prayerTimestamp,
  timestampForLocalTime,
  type City,
} from "../src/index.ts";

const riyadh = cityById("riyadh") as City;
const qatif = cityById("qatif") as City;

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
        Isha: "20:08",
      },
      date: {
        gregorian: { date: "31-07-2026" },
        hijri: { day: "17", month: { ar: "صفر", en: "Safar" }, year: "1448" },
      },
      meta: {
        latitude: riyadh.latitude,
        longitude: riyadh.longitude,
        timezone: "Asia/Riyadh",
        method: { id: 4, name: "Umm Al-Qura University, Makkah" },
      },
      ...overrides,
    },
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
      ...overrides,
    },
  };
}

function qatifPrayerPayload(): unknown {
  return prayerPayload({
    meta: {
      latitude: qatif.latitude,
      longitude: qatif.longitude,
      timezone: qatif.timeZone,
      method: { id: 0, name: "Custom time" },
    },
  });
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
    timeZone: "Asia/Riyadh",
  });
});

test("prayer payload is normalized only after all accuracy checks pass", () => {
  const day = parsePrayerDayResponse(
    prayerPayload(),
    riyadh,
    "31-07-2026",
    "2026-07-31T08:00:00.000Z"
  );
  assert.equal(day.timings.Asr, "15:26");
  assert.equal(day.hijri.monthAr, "صفر");
  assert.equal(day.hijri.monthEn, "Safar");
  assert.equal(day.method.id, 4);
});

test("mismatched coordinates are rejected even when the provider says OK", () => {
  const payload = prayerPayload({
    meta: {
      latitude: 8.8888888,
      longitude: 7.7777777,
      timezone: "Asia/Riyadh",
      method: { id: 4, name: "Umm Al-Qura University, Makkah" },
    },
  });
  assert.throws(
    () => parsePrayerDayResponse(payload, riyadh, "31-07-2026"),
    /coordinates do not match/
  );
});

test("a provider error encoded in a 200 body is rejected", () => {
  assert.throws(
    () =>
      parsePrayerDayResponse({ code: 400, status: "Bad Request", data: {} }, riyadh, "31-07-2026"),
    /did not confirm/
  );
});

test("Arabic time keeps leading-zero minutes and identifies the next prayer", () => {
  assert.equal(formatArabicTime("05:05"), "٥:٠٥ ص");
  assert.equal(formatPrayerTime("05:05", "en"), "5:05 AM");
  assert.equal(formatRemainingTime(65, "en"), "1 hr 5 min");
  assert.equal(prayerName("Dhuhr", "en"), "Dhuhr");
  assert.equal(
    formatHijriDate({ day: "17", monthAr: "صفر", monthEn: "Safar", year: "1448" }, "en"),
    "17 Safar 1448 AH"
  );
  const day = parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026");
  const next = nextPrayerFor(day, new Date("2026-07-31T11:30:00+03:00"));
  assert.equal(next.key, "Dhuhr");
  assert.equal(next.minutesUntil, 30);
});

test("prayer timestamps and schedules are independent of the machine timezone", () => {
  const day = parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026");
  assert.equal(new Date(prayerTimestamp(day, "Fajr")).toISOString(), "2026-07-31T00:54:00.000Z");
  assert.equal(
    timestampForLocalTime("31-07-2026", "18:38", "Asia/Riyadh"),
    Date.parse("2026-07-31T15:38:00.000Z")
  );
  assert.equal(addDaysToLocalDate("31-12-2026", 1), "01-01-2027");

  const enabled = {
    Fajr: true,
    Dhuhr: false,
    Asr: true,
    Maghrib: false,
    Isha: false,
  } as const;
  const schedule = buildPrayerSchedule([day], enabled, new Date("2026-07-31T08:00:00.000Z"));
  assert.deepEqual(
    schedule.map((entry) => entry.key),
    ["Asr"]
  );
  assert.equal(schedule[0]?.id, "pray-times:prayer:riyadh:31-07-2026:Asr");
});

test("next prayer advances immediately after a prayer timestamp", () => {
  const day = parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026");
  assert.equal(nextPrayerFor(day, new Date("2026-07-31T00:54:01.000Z")).key, "Dhuhr");
  const afterIsha = nextPrayerFor(day, new Date("2026-07-31T18:00:00.000Z"));
  assert.equal(afterIsha.key, "Fajr");
  assert.equal(afterIsha.isTomorrow, true);
  assert.equal(afterIsha.minutesUntil, 414);
});

test("Qatif uses the custom method and three combined prayer windows", () => {
  const day = parsePrayerDayResponse(qatifPrayerPayload(), qatif, "31-07-2026");
  assert.equal(day.method.id, 0);
  assert.deepEqual(prayerKeysForCity(qatif), ["Fajr", "Dhuhr", "Maghrib"]);
  assert.equal(prayerNameForCity("Dhuhr", qatif, "en"), "Dhuhr & Asr");
  assert.equal(prayerNameForCity("Maghrib", qatif, "ar"), "المغرب والعشاء");

  const next = nextPrayerFor(day, new Date("2026-07-31T10:00:00.000Z"));
  assert.equal(next.key, "Maghrib");
  const schedule = buildPrayerSchedule(
    [day],
    { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
    new Date("2026-07-30T22:00:00.000Z")
  );
  assert.deepEqual(
    schedule.map((entry) => entry.key),
    ["Fajr", "Dhuhr", "Maghrib"]
  );
});

test("Qatif rejects an Umm Al-Qura response", () => {
  assert.throws(
    () =>
      parsePrayerDayResponse(
        prayerPayload({
          meta: {
            latitude: qatif.latitude,
            longitude: qatif.longitude,
            timezone: qatif.timeZone,
            method: { id: 4, name: "Umm Al-Qura University, Makkah" },
          },
        }),
        qatif,
        "31-07-2026"
      ),
    /selected city profile/
  );
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

  const qatifFetch: typeof fetch = async (input) => {
    requested = String(input);
    return new Response(JSON.stringify(qatifPrayerPayload()), { status: 200 });
  };
  await fetchPrayerDay(qatif, { date: "31-07-2026", fetchImpl: qatifFetch });
  assert.match(requested, /method=0/);
  await assert.rejects(() => fetchAyah({ number: 0 }), /1 to 6236/);
});
