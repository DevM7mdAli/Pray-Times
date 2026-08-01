import assert from "node:assert/strict";
import test from "node:test";
import {
  CITIES,
  KAABA,
  addDaysToLocalDate,
  assertCityCatalog,
  badgeRefreshAt,
  buildPrayerSchedule,
  cityById,
  dayTimeline,
  fastingStatusFor,
  fetchAyah,
  fetchPrayerDay,
  formatArabicTime,
  formatBadgeCountdown,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  isRamadan,
  nextPrayerFor,
  parseAyahResponse,
  parsePrayerDayResponse,
  compassPointFor,
  prayerName,
  prayerNameForCity,
  prayerKeysForCity,
  prayerTimestamp,
  qiblaFor,
  qiblaForCity,
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
        Sunrise: "05:24",
        Dhuhr: "12:00",
        Asr: "15:26",
        Maghrib: "18:38",
        Isha: "20:08",
      },
      date: {
        gregorian: { date: "31-07-2026" },
        hijri: { day: "17", month: { number: 2, ar: "صفر", en: "Safar" }, year: "1448" },
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

function ramadanPayload(options: { imsak?: boolean } = {}): unknown {
  return prayerPayload({
    timings: {
      ...(options.imsak === false ? {} : { Imsak: "03:44" }),
      Fajr: "03:54",
      Sunrise: "05:24",
      Dhuhr: "12:00",
      Asr: "15:26",
      Maghrib: "18:38",
      Isha: "20:08",
    },
    date: {
      gregorian: { date: "31-07-2026" },
      hijri: { day: "17", month: { number: 9, ar: "رمضان", en: "Ramadan" }, year: "1448" },
    },
  });
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

test("the badge countdown stays short in both languages", () => {
  assert.equal(formatBadgeCountdown(0, "en"), "0m");
  assert.equal(formatBadgeCountdown(1, "en"), "1m");
  assert.equal(formatBadgeCountdown(59, "en"), "59m");
  // A partial minute counts as the whole minute still to come.
  assert.equal(formatBadgeCountdown(44.2, "en"), "45m");
  assert.equal(formatBadgeCountdown(59.2, "en"), "1h");
  assert.equal(formatBadgeCountdown(60, "en"), "1h");
  assert.equal(formatBadgeCountdown(119, "en"), "1h");
  assert.equal(formatBadgeCountdown(659, "en"), "10h");
  assert.equal(formatBadgeCountdown(45, "ar"), "٤٥د");
  assert.equal(formatBadgeCountdown(150, "ar"), "٢س");
  // A negative countdown means the prayer has just passed, not a past time.
  assert.equal(formatBadgeCountdown(-5, "en"), "0m");
  assert.equal(formatBadgeCountdown(Number.NaN, "en"), "");
  for (const minutes of [0, 7, 59, 60, 599, 1439]) {
    for (const locale of ["ar", "en"] as const) {
      assert.ok(formatBadgeCountdown(minutes, locale).length <= 4);
    }
  }
});

test("the badge sleeps until the final hour, then ticks every minute", () => {
  const now = Date.UTC(2026, 6, 31, 12, 0, 0);
  const hour = 60 * 60_000;
  // Three hours out: one wake-up when the final hour begins, not sooner.
  assert.equal(badgeRefreshAt(now + 3 * hour, now), now + 2 * hour);
  // Exactly at the boundary and inside it: tick.
  assert.equal(badgeRefreshAt(now + hour, now), now + 60_000);
  assert.equal(badgeRefreshAt(now + 20 * 60_000, now), now + 60_000);
  // Already passed: still schedules forward so the worker re-derives.
  assert.equal(badgeRefreshAt(now - 60_000, now), now + 60_000);
  assert.ok(badgeRefreshAt(now + 3 * hour, now) > now);
});

test("sunrise is parsed when offered and never blocks a verified day", () => {
  const withSunrise = parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026");
  assert.equal(withSunrise.sunrise, "05:24");

  // A provider that omits or mangles sunrise still yields usable prayer times.
  for (const broken of [undefined, "", "not-a-time", 5]) {
    const payload = prayerPayload({
      timings: {
        Fajr: "03:54",
        Dhuhr: "12:00",
        Asr: "15:26",
        Maghrib: "18:38",
        Isha: "20:08",
        ...(broken === undefined ? {} : { Sunrise: broken }),
      },
    });
    const day = parsePrayerDayResponse(payload, riyadh, "31-07-2026");
    assert.equal(day.sunrise, undefined);
    assert.equal(day.timings.Fajr, "03:54");
  }
});

test("the day timeline places sunrise by its own clock time", () => {
  const day = parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026");
  const timeline = dayTimeline(day);
  assert.deepEqual(
    timeline.map((entry) => (entry.kind === "sunrise" ? "sunrise" : entry.key)),
    ["Fajr", "sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]
  );
  // Times stay in ascending order across the whole timeline.
  const minutes = timeline.map((entry) => entry.time);
  assert.deepEqual([...minutes].sort(), minutes);

  // A three-prayer city keeps its own key set and still gets sunrise.
  const qatifDay = parsePrayerDayResponse(qatifPrayerPayload(), qatif, "31-07-2026");
  assert.deepEqual(
    dayTimeline(qatifDay).map((entry) => (entry.kind === "sunrise" ? "sunrise" : entry.key)),
    ["Fajr", "sunrise", "Dhuhr", "Maghrib"]
  );

  // Without sunrise the timeline is exactly the prayers.
  assert.deepEqual(dayTimeline({ ...day, sunrise: undefined }).length, 5);
});

test("Ramadan is detected by month number, not by month name", () => {
  const ordinary = parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026");
  assert.equal(ordinary.hijri.month, 2);
  assert.equal(isRamadan(ordinary), false);
  assert.equal(fastingStatusFor(ordinary), undefined);

  const ramadan = parsePrayerDayResponse(ramadanPayload(), riyadh, "31-07-2026");
  assert.equal(ramadan.hijri.month, 9);
  assert.equal(ramadan.imsak, "03:44");
  assert.equal(isRamadan(ramadan), true);

  // A month name spelled "Ramadan" without a usable number is not enough.
  const unnumbered = parsePrayerDayResponse(
    prayerPayload({
      date: {
        gregorian: { date: "31-07-2026" },
        hijri: { day: "17", month: { ar: "رمضان", en: "Ramadan" }, year: "1448" },
      },
    }),
    riyadh,
    "31-07-2026"
  );
  assert.equal(unnumbered.hijri.month, undefined);
  assert.equal(isRamadan(unnumbered), false);
});

test("the fasting day moves from suhoor to fasting to completed", () => {
  const day = parsePrayerDayResponse(ramadanPayload(), riyadh, "31-07-2026");
  const at = (time: string) => fastingStatusFor(day, new Date(`2026-07-31T${time}+03:00`));

  const suhoor = at("03:00:00");
  assert.equal(suhoor?.phase, "suhoor");
  assert.equal(suhoor?.time, "03:44");
  assert.equal(suhoor?.minutesUntil, 44);

  // Imsak itself ends suhoor, and Maghrib ends the fast.
  assert.equal(at("03:44:00")?.phase, "fasting");
  const fasting = at("18:00:00");
  assert.equal(fasting?.phase, "fasting");
  assert.equal(fasting?.time, "18:38");
  assert.equal(fasting?.minutesUntil, 38);

  assert.equal(at("18:38:00")?.phase, "completed");
  const completed = at("21:00:00");
  assert.equal(completed?.phase, "completed");
  // Tomorrow's suhoor is not counted down from today's verified data.
  assert.equal(completed?.time, undefined);
  assert.equal(completed?.minutesUntil, undefined);
});

test("a Ramadan day without imsak falls back to Fajr for the end of suhoor", () => {
  const payload = ramadanPayload({ imsak: false });
  const day = parsePrayerDayResponse(payload, riyadh, "31-07-2026");
  assert.equal(day.imsak, undefined);
  const status = fastingStatusFor(day, new Date("2026-07-31T03:00:00+03:00"));
  assert.equal(status?.phase, "suhoor");
  assert.equal(status?.time, "03:54");
});

test("qibla bearings follow the great circle from fixed city coordinates", () => {
  // Due north of the Kaaba must face exactly south, and vice versa.
  assert.equal(
    qiblaFor({ latitude: KAABA.latitude + 10, longitude: KAABA.longitude }).bearing,
    180
  );
  assert.equal(qiblaFor({ latitude: KAABA.latitude - 10, longitude: KAABA.longitude }).bearing, 0);

  // Riyadh, verified against the great-circle formula for its declared coordinates.
  const riyadhQibla = qiblaForCity(riyadh);
  assert.ok(Math.abs(riyadhQibla.bearing - 243.78) < 0.05, `got ${riyadhQibla.bearing}`);
  assert.ok(Math.abs(riyadhQibla.distanceKm - 790) < 5, `got ${riyadhQibla.distanceKm}`);
  assert.equal(riyadhQibla.atHaram, false);

  // Cities west of Makkah face east; cities north of it face south.
  assert.equal(compassPointFor(qiblaForCity(cityById("jeddah") as City).bearing), "E");
  assert.equal(compassPointFor(qiblaForCity(cityById("madinah") as City).bearing), "S");
  assert.equal(compassPointFor(qiblaForCity(cityById("tabuk") as City).bearing), "SE");

  // Every city yields a usable bearing and a plausible distance.
  for (const city of CITIES) {
    const qibla = qiblaForCity(city);
    assert.ok(qibla.bearing >= 0 && qibla.bearing < 360, `${city.id}: ${qibla.bearing}`);
    assert.ok(qibla.distanceKm > 0 && qibla.distanceKm < 2000, `${city.id}: ${qibla.distanceKm}`);
  }
});

test("standing at the Kaaba reports no meaningful direction", () => {
  const atKaaba = qiblaFor(KAABA);
  assert.equal(atKaaba.atHaram, true);
  assert.ok(atKaaba.distanceKm < 0.001);
  // A few hundred metres away is still the Haram.
  assert.equal(
    qiblaFor({ latitude: KAABA.latitude + 0.003, longitude: KAABA.longitude }).atHaram,
    true
  );
  // Makkah's city coordinates sit outside it, where a bearing is real.
  assert.equal(qiblaForCity(cityById("makkah") as City).atHaram, false);
});

test("compass points round to the nearest of eight", () => {
  assert.equal(compassPointFor(0), "N");
  assert.equal(compassPointFor(360), "N");
  assert.equal(compassPointFor(359), "N");
  assert.equal(compassPointFor(22), "N");
  assert.equal(compassPointFor(23), "NE");
  assert.equal(compassPointFor(180), "S");
  assert.equal(compassPointFor(337.5), "N");
  assert.equal(compassPointFor(-45), "NW");
});
