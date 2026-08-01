import assert from "node:assert/strict";
import test from "node:test";
import {
  CITIES,
  DEFAULT_PRAYER_METHOD_ID,
  DETECTED_CITY_ID,
  KAABA,
  PRAYER_KEYS,
  PRAYER_METHODS,
  PRAYER_METHOD_IDS,
  UMM_AL_QURA,
  addDaysToLocalDate,
  allPrayerMethods,
  assertCity,
  assertCityCatalog,
  badgeRefreshAt,
  buildPrayerSchedule,
  cachePrayerDay,
  cityById,
  cityFromCoordinates,
  cityWithMethod,
  countryForTimeZone,
  dayTimeline,
  defaultMethodForCountry,
  fastingStatusFor,
  fetchAyah,
  fetchPrayerDay,
  formatArabicTime,
  formatBadgeCountdown,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  isPrayerMethodId,
  isRamadan,
  isSupportedTimeZone,
  isUsablePrayerDay,
  nextPrayerFor,
  parseAyahResponse,
  parsePrayerDayResponse,
  prayerCacheKey,
  parseMethodOverrides,
  parseSavedCities,
  parseSavedCity,
  compassPointFor,
  prayerName,
  prayerNameForCity,
  prayerKeysForCity,
  prayerKeysForMethod,
  prayerMethodById,
  prayerMethodForCity,
  prayerTimestamp,
  qiblaFor,
  qiblaForCity,
  readCachedPrayerDay,
  resolveCity,
  searchPlaces,
  timestampForLocalTime,
  trustedCity,
  VerificationError,
  type City,
} from "../src/index.ts";

const riyadh = cityById("riyadh") as City;

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

/** The same day, calculated by a method that combines the two pairs. */
function combinedMethodPayload(): unknown {
  return prayerPayload({
    meta: {
      latitude: riyadh.latitude,
      longitude: riyadh.longitude,
      timezone: riyadh.timeZone,
      method: { id: 0, name: "Shia Ithna-Ashari" },
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
    countryCode: "SA",
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

test("combined windows follow the method, and no city is singled out", () => {
  // Every bundled city is an ordinary entry on its country's authority.
  for (const city of CITIES) {
    assert.equal(city.methodId, undefined, `${city.id} pins a method`);
    assert.equal(prayerMethodForCity(city).id, 4, `${city.id} is not on the country default`);
    assert.deepEqual(prayerKeysForCity(city), PRAYER_KEYS, `${city.id} does not show five prayers`);
  }

  // The three-window reading so it
  // appears wherever that method is chosen and nowhere else.
  assert.equal(PRAYER_METHODS[0].combinesPrayers, true);
  assert.deepEqual(prayerKeysForMethod(PRAYER_METHODS[0]), ["Fajr", "Dhuhr", "Maghrib"]);
  for (const id of PRAYER_METHOD_IDS.filter((value) => value !== 0)) {
    assert.notEqual(PRAYER_METHODS[id].combinesPrayers, true, `method ${id} combines prayers`);
    assert.deepEqual(prayerKeysForMethod(PRAYER_METHODS[id]), PRAYER_KEYS);
  }
});

test("choosing the combine method gives the combined windows anywhere", () => {
  // Any place reaches it the same way: by choosing the method.
  const combined = cityWithMethod(riyadh, 0);
  assert.deepEqual(prayerKeysForCity(combined), ["Fajr", "Dhuhr", "Maghrib"]);
  assert.equal(prayerNameForCity("Dhuhr", combined, "en"), "Dhuhr & Asr");
  assert.equal(prayerNameForCity("Maghrib", combined, "ar"), "المغرب والعشاء");
  // The same place without that method reads as five separate prayers.
  assert.deepEqual(prayerKeysForCity(riyadh), PRAYER_KEYS);
  assert.equal(prayerNameForCity("Dhuhr", riyadh, "en"), "Dhuhr");

  const day = parsePrayerDayResponse(combinedMethodPayload(), combined, "31-07-2026");
  assert.equal(day.method.id, 0);
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

test("a response calculated by another authority is still rejected", () => {
  // The place asks for the combined method; the provider answered with another.
  assert.throws(
    () => parsePrayerDayResponse(prayerPayload(), cityWithMethod(riyadh, 0), "31-07-2026"),
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

  // A chosen method reaches the request, not just the display.
  const combinedFetch: typeof fetch = async (input) => {
    requested = String(input);
    return new Response(JSON.stringify(combinedMethodPayload()), { status: 200 });
  };
  await fetchPrayerDay(cityWithMethod(riyadh, 0), {
    date: "31-07-2026",
    fetchImpl: combinedFetch,
  });
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
  // A place on a method that combines the pairs shows three windows plus sunrise.
  const combinedDay = parsePrayerDayResponse(
    combinedMethodPayload(),
    cityWithMethod(riyadh, 0),
    "31-07-2026"
  );
  assert.deepEqual(
    dayTimeline(combinedDay).map((entry) => (entry.kind === "sunrise" ? "sunrise" : entry.key)),
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

test("the method registry keys every entry by the provider's own id", () => {
  for (const id of PRAYER_METHOD_IDS) {
    const method = PRAYER_METHODS[id];
    assert.equal(method.id, id, `entry ${id} is keyed by a different id`);
    assert.ok(method.name.length > 0 && method.nameAr.length > 0, `entry ${id} is missing a name`);
  }
  // Ids are the provider's and must never be renumbered; 6 does not exist.
  assert.equal(PRAYER_METHOD_IDS.includes(6 as never), false);
  assert.equal(allPrayerMethods().length, PRAYER_METHOD_IDS.length);
  assert.deepEqual(
    allPrayerMethods().map((method) => method.id),
    [...PRAYER_METHOD_IDS]
  );

  assert.equal(UMM_AL_QURA.id, 4);
  // The named constant and the table are the same object, so a display name
  // cannot drift between them.
  assert.equal(prayerMethodById(4), UMM_AL_QURA);
  assert.equal(prayerMethodById(6), undefined);
  assert.equal(prayerMethodById("4"), undefined);
  assert.equal(isPrayerMethodId(99), false);
});

test("each country defaults to its own authority and the rest to MWL", () => {
  const expected: Record<string, number> = {
    SA: 4,
    KW: 9,
    QA: 10,
    AE: 8,
    EG: 5,
    JO: 23,
    PK: 1,
    IN: 1,
    IR: 7,
    TR: 13,
    ID: 20,
    MY: 17,
    SG: 11,
    FR: 12,
    US: 2,
    CA: 2,
    MA: 21,
  };
  for (const [code, id] of Object.entries(expected)) {
    assert.equal(defaultMethodForCountry(code).id, id, `${code} defaulted wrongly`);
  }

  // Anywhere without a listed authority falls back to the Muslim World League.
  assert.equal(defaultMethodForCountry("GB").id, DEFAULT_PRAYER_METHOD_ID);
  assert.equal(defaultMethodForCountry("DE").id, 3);
  assert.equal(defaultMethodForCountry(undefined).id, 3);
  assert.equal(defaultMethodForCountry(null).id, 3);
  assert.equal(defaultMethodForCountry("").id, 3);
  assert.equal(defaultMethodForCountry("ZZ").id, 3);

  // Geocoders differ on casing and padding, so the lookup tolerates both.
  assert.equal(defaultMethodForCountry("sa").id, 4);
  assert.equal(defaultMethodForCountry(" eg ").id, 5);

  // A default never lands on the combined three-window profile's method.
  for (const code of [...Object.keys(expected), "GB", "ZZ"]) {
    assert.notEqual(defaultMethodForCountry(code).id, 0, `${code} defaulted to the custom method`);
  }
});

test("every Saudi city resolves through its country, with none pinned", () => {
  assert.equal(prayerMethodForCity(riyadh).id, 4);
  assert.equal(prayerMethodForCity(riyadh).name, "Umm Al-Qura University, Makkah");
  // Saudi Arabia's country default is what the whole catalog now relies on.
  assert.equal(defaultMethodForCountry("SA").id, prayerMethodForCity(riyadh).id);
});

test("presets keep their exact behaviour under the widened location model", () => {
  assert.doesNotThrow(() => assertCityCatalog());
  for (const city of CITIES) {
    assert.equal(city.countryCode, "SA", `${city.id} has no country`);
    assert.ok(isSupportedTimeZone(city.timeZone), `${city.id} has an unusable zone`);
  }
  // The method now comes from the country, and still resolves to Umm Al-Qura.
  assert.equal(prayerMethodForCity(riyadh).id, 4);
  assert.equal(riyadh.methodId, undefined);
});

test("a pinned method wins over the country, and the profile no longer decides it", () => {
  const cairo: City = {
    id: "cairo",
    nameAr: "القاهرة",
    nameEn: "Cairo",
    latitude: 30.0626,
    longitude: 31.2497,
    timeZone: "Africa/Cairo",
    countryCode: "EG",
    source: "searched",
  };
  assert.equal(prayerMethodForCity(cairo).id, 5);
  // A reader's override replaces the country default.
  assert.equal(prayerMethodForCity({ ...cairo, methodId: 3 }).id, 3);
  // A place with no country falls back to the global default.
  assert.equal(prayerMethodForCity({ ...cairo, countryCode: undefined }).id, 3);
  // Which prayers are shown follows from the chosen method, nothing else.
  assert.deepEqual(prayerKeysForCity(cairo), PRAYER_KEYS);
  assert.deepEqual(prayerKeysForCity(cityWithMethod(cairo, 0)), ["Fajr", "Dhuhr", "Maghrib"]);
});

test("a place is rejected before anything is calculated from it", () => {
  const base: City = {
    id: "jakarta",
    nameAr: "جاكرتا",
    nameEn: "Jakarta",
    latitude: -6.2146,
    longitude: 106.8451,
    timeZone: "Asia/Jakarta",
    countryCode: "ID",
    source: "searched",
  };
  // Southern hemisphere and eastern longitudes are ordinary now.
  assert.doesNotThrow(() => assertCity(base));
  assert.equal(prayerMethodForCity(base).id, 20);

  assert.throws(() => assertCity({ ...base, latitude: 91 }), /latitude is out of range/);
  assert.throws(() => assertCity({ ...base, longitude: -181 }), /longitude is out of range/);
  assert.throws(() => assertCity({ ...base, latitude: Number.NaN }), /latitude is out of range/);
  assert.throws(() => assertCity({ ...base, timeZone: "Mars/Olympus" }), /unusable time zone/);
  assert.throws(() => assertCity({ ...base, timeZone: "" }), /unusable time zone/);
  assert.throws(() => assertCity({ ...base, countryCode: "IDN" }), /alpha-2/);
  assert.throws(() => assertCity({ ...base, methodId: 6 as never }), /unknown calculation method/);
  assert.throws(() => assertCity({ ...base, id: "  " }), /missing an id/);

  // A catalog entry additionally has to declare its country.
  assert.throws(() => assertCityCatalog([{ ...base, countryCode: undefined }]), /has no country/);
});

test("time zone support is decided by the runtime, not a hard-coded list", () => {
  for (const zone of ["Asia/Riyadh", "Africa/Cairo", "America/New_York", "UTC", "Asia/Jakarta"]) {
    assert.ok(isSupportedTimeZone(zone), zone);
  }
  for (const zone of ["", "  ", "Not/AZone", 5, undefined, null]) {
    assert.equal(isSupportedTimeZone(zone), false, String(zone));
  }
});

function geocodingFetch(byLanguage: Record<string, unknown>): typeof fetch {
  return async (input) => {
    const url = new URL(String(input));
    const language = url.searchParams.get("language") ?? "en";
    const payload = byLanguage[language];
    if (payload === undefined) return new Response("upstream is down", { status: 503 });
    return new Response(JSON.stringify(payload), { status: 200 });
  };
}

const cairoEn = {
  results: [
    {
      id: 360630,
      name: "Cairo",
      latitude: 30.06263,
      longitude: 31.24967,
      country_code: "EG",
      timezone: "Africa/Cairo",
      population: 9606916,
      country: "Egypt",
      admin1: "Cairo Governorate",
    },
  ],
};

const cairoAr = {
  results: [
    {
      id: 360630,
      name: "القاهرة",
      latitude: 30.06263,
      longitude: 31.24967,
      country_code: "EG",
      timezone: "Africa/Cairo",
      population: 9606916,
      country: "مصر",
      admin1: "القاهرة",
    },
  ],
};

test("a searched place becomes a pinned, bilingual city", async () => {
  const [suggestion, ...rest] = await searchPlaces("Cairo", {
    fetchImpl: geocodingFetch({ en: cairoEn, ar: cairoAr }),
  });
  assert.equal(rest.length, 0);
  assert.deepEqual(suggestion?.city, {
    id: "geo:360630",
    nameAr: "القاهرة",
    nameEn: "Cairo",
    // Rounded to the precision the bundled catalog uses.
    latitude: 30.0626,
    longitude: 31.2497,
    timeZone: "Africa/Cairo",
    countryCode: "EG",
    source: "searched",
  });
  assert.equal(suggestion?.contextEn, "Cairo Governorate, Egypt");
  assert.equal(suggestion?.contextAr, "القاهرة، مصر");
  assert.equal(suggestion?.population, 9606916);

  // The pinned place carries everything the rest of the app needs.
  assert.doesNotThrow(() => assertCity(suggestion!.city));
  assert.equal(prayerMethodForCity(suggestion!.city).id, 5);
});

test("place search tolerates a provider that answers in only one language", async () => {
  const onlyEnglish = await searchPlaces("Cairo", {
    fetchImpl: geocodingFetch({ en: cairoEn }),
  });
  // Rather than invent a translation, the missing language reuses the other.
  assert.equal(onlyEnglish[0]?.city.nameAr, "Cairo");
  assert.equal(onlyEnglish[0]?.city.nameEn, "Cairo");

  const onlyArabic = await searchPlaces("القاهرة", {
    fetchImpl: geocodingFetch({ ar: cairoAr }),
  });
  assert.equal(onlyArabic[0]?.city.nameAr, "القاهرة");
  assert.equal(onlyArabic[0]?.city.id, "geo:360630");

  // Both languages failing is a real failure.
  await assert.rejects(() => searchPlaces("Cairo", { fetchImpl: geocodingFetch({}) }), /Provider/);
});

test("place search drops unusable results instead of failing the list", async () => {
  const mixed = {
    results: [
      { id: 1, name: "No zone", latitude: 1, longitude: 1, country_code: "EG" },
      {
        id: 2,
        name: "Bad zone",
        latitude: 1,
        longitude: 1,
        country_code: "EG",
        timezone: "Mars/X",
      },
      {
        id: 3,
        name: "Out of range",
        latitude: 99,
        longitude: 1,
        country_code: "EG",
        timezone: "Africa/Cairo",
      },
      { id: 4, name: "", latitude: 1, longitude: 1, country_code: "EG", timezone: "Africa/Cairo" },
      "not an object",
      cairoEn.results[0],
    ],
  };
  const results = await searchPlaces("anything", { fetchImpl: geocodingFetch({ en: mixed }) });
  assert.deepEqual(
    results.map((entry) => entry.city.id),
    ["geo:360630"]
  );
});

test("an empty query never reaches the network, and no match is an empty list", async () => {
  let called = false;
  const spy: typeof fetch = async () => {
    called = true;
    return new Response("{}", { status: 200 });
  };
  assert.deepEqual(await searchPlaces("", { fetchImpl: spy }), []);
  assert.deepEqual(await searchPlaces("   ", { fetchImpl: spy }), []);
  assert.equal(called, false);

  // A query with no matches comes back with no `results` key at all.
  assert.deepEqual(
    await searchPlaces("zzzq", { fetchImpl: geocodingFetch({ en: { generationtime_ms: 0.4 } }) }),
    []
  );
});

test("place search asks the provider for a sane, bounded query", async () => {
  const seen: URL[] = [];
  const spy: typeof fetch = async (input) => {
    seen.push(new URL(String(input)));
    return new Response(JSON.stringify(cairoEn), { status: 200 });
  };
  await searchPlaces("  Cairo  ", { limit: 500, fetchImpl: spy });
  assert.equal(seen.length, 2);
  assert.deepEqual(seen.map((url) => url.searchParams.get("language")).sort(), ["ar", "en"]);
  for (const url of seen) {
    // The query is trimmed and the count clamped before it leaves.
    assert.equal(url.searchParams.get("name"), "Cairo");
    assert.equal(url.searchParams.get("count"), "20");
    assert.equal(url.origin, "https://geocoding-api.open-meteo.com");
  }
});

const savedCairo = {
  id: "geo:360630",
  nameAr: "القاهرة",
  nameEn: "Cairo",
  latitude: 30.0626,
  longitude: 31.2497,
  timeZone: "Africa/Cairo",
  countryCode: "EG",
  source: "searched",
};

test("a saved place is validated before it is trusted as an anchor", () => {
  assert.deepEqual(parseSavedCity(savedCairo), savedCairo);

  // Anything unusable is discarded rather than repaired.
  for (const broken of [
    undefined,
    null,
    "cairo",
    [],
    { ...savedCairo, latitude: "30" },
    { ...savedCairo, timeZone: "Mars/Olympus" },
    { ...savedCairo, timeZone: undefined },
    { ...savedCairo, longitude: 999 },
    { ...savedCairo, id: 5 },
    { ...savedCairo, nameEn: undefined },
  ]) {
    assert.equal(parseSavedCity(broken), undefined, JSON.stringify(broken));
  }

  // Unknown extras are dropped instead of flowing through.
  const extra = parseSavedCity({ ...savedCairo, methodId: 6, source: "hacked", nickname: "x" });
  assert.equal(extra?.methodId, undefined);
  assert.equal(extra?.source, undefined);
  assert.equal("nickname" in (extra ?? {}), false);

  // A pinned override survives the round trip.
  assert.equal(parseSavedCity({ ...savedCairo, methodId: 3 })?.methodId, 3);
});

test("saved places are de-duplicated and bad entries skipped", () => {
  const parsed = parseSavedCities([
    savedCairo,
    savedCairo,
    { ...savedCairo, id: "geo:1", timeZone: "Mars/X" },
    "junk",
    { ...savedCairo, id: "geo:2", nameEn: "Giza" },
  ]);
  assert.deepEqual(
    parsed.map((city) => city.id),
    ["geo:360630", "geo:2"]
  );
  assert.deepEqual(parseSavedCities("not an array"), []);
  assert.deepEqual(parseSavedCities(undefined), []);
});

test("presets win over saved places when ids collide", () => {
  const saved = parseSavedCities([savedCairo]);
  assert.equal(resolveCity("geo:360630", saved)?.nameEn, "Cairo");
  assert.equal(resolveCity("riyadh", saved)?.id, "riyadh");
  assert.equal(resolveCity("unknown", saved), undefined);
  assert.equal(resolveCity(undefined, saved), undefined);
  assert.equal(resolveCity("riyadh"), cityById("riyadh"));

  // A saved entry cannot shadow a bundled city.
  const impostor = parseSavedCities([{ ...savedCairo, id: "riyadh" }]);
  assert.equal(resolveCity("riyadh", impostor)?.nameEn, "Riyadh");
});

test("a reader's chosen authority layers on top of a place", () => {
  // A bundled city is never mutated; the override produces a new place.
  const overridden = cityWithMethod(riyadh, 3);
  assert.equal(prayerMethodForCity(overridden).id, 3);
  assert.equal(prayerMethodForCity(riyadh).id, 4);
  assert.equal(riyadh.methodId, undefined);

  // No override returns the place to its country default.
  assert.equal(cityWithMethod(riyadh, undefined), riyadh);
  assert.equal(cityWithMethod(riyadh, null), riyadh);
  // An unusable value is ignored rather than pinning nonsense.
  assert.equal(cityWithMethod(riyadh, 6), riyadh);
  assert.equal(cityWithMethod(riyadh, "3"), riyadh);

  // It also replaces a method a place already carried.
  assert.equal(prayerMethodForCity(cityWithMethod({ ...riyadh, methodId: 0 }, 4)).id, 4);
});

test("stored method overrides are validated per entry", () => {
  assert.deepEqual(parseMethodOverrides({ riyadh: 3, "geo:1": 17 }), { riyadh: 3, "geo:1": 17 });
  // Unknown methods and empty ids are dropped, the rest survive.
  assert.deepEqual(parseMethodOverrides({ riyadh: 6, "geo:1": 17, "  ": 3, x: "3" }), {
    "geo:1": 17,
  });
  for (const broken of [null, undefined, [], "riyadh", 5]) {
    assert.deepEqual(parseMethodOverrides(broken), {});
  }
});

test("a detected position becomes a pinned place with coarse coordinates", () => {
  const city = cityFromCoordinates({
    latitude: 30.062634891,
    longitude: 31.249671234,
    timeZone: "Africa/Cairo",
    nameAr: "موقعي الحالي",
    nameEn: "Current location",
  });
  // Rounded before anything is done with it: roughly a kilometre.
  assert.equal(city.latitude, 30.06);
  assert.equal(city.longitude, 31.25);
  assert.equal(city.id, DETECTED_CITY_ID);
  assert.equal(city.source, "detected");
  // The zone supplies the country, which supplies the starting authority.
  assert.equal(city.countryCode, "EG");
  assert.equal(prayerMethodForCity(city).id, 5);
  assert.doesNotThrow(() => assertCity(city));

  // Southern and western hemispheres round the same way.
  const jakarta = cityFromCoordinates({
    latitude: -6.21462,
    longitude: 106.84513,
    timeZone: "Asia/Jakarta",
    nameAr: "x",
    nameEn: "x",
  });
  assert.equal(jakarta.latitude, -6.21);
  assert.equal(jakarta.longitude, 106.85);
  assert.equal(prayerMethodForCity(jakarta).id, 20);
});

test("a detected place refuses a zone the device cannot resolve", () => {
  for (const timeZone of ["", "   ", "Mars/Olympus"]) {
    assert.throws(
      () =>
        cityFromCoordinates({
          latitude: 1,
          longitude: 1,
          timeZone,
          nameAr: "x",
          nameEn: "x",
        }),
      /usable time zone/
    );
  }
});

test("the zone hints at a country only where that changes the authority", () => {
  assert.equal(countryForTimeZone("Europe/Istanbul"), "TR");
  assert.equal(countryForTimeZone("America/Toronto"), "CA");
  assert.equal(countryForTimeZone("Asia/Karachi"), "PK");
  assert.equal(countryForTimeZone("Asia/Calcutta"), "IN");
  // An unlisted zone yields no country, so the global default applies.
  assert.equal(countryForTimeZone("Europe/Berlin"), undefined);
  assert.equal(countryForTimeZone("Mars/Olympus"), undefined);
  assert.equal(countryForTimeZone(undefined), undefined);
  assert.equal(
    prayerMethodForCity(
      cityFromCoordinates({
        latitude: 52.52,
        longitude: 13.405,
        timeZone: "Europe/Berlin",
        nameAr: "x",
        nameEn: "x",
      })
    ).id,
    DEFAULT_PRAYER_METHOD_ID
  );
  // Every hinted zone names a country the method table actually knows.
  for (const zone of ["Asia/Riyadh", "Africa/Cairo", "Asia/Jakarta", "America/New_York"]) {
    const code = countryForTimeZone(zone) as string;
    assert.notEqual(defaultMethodForCountry(code).id, DEFAULT_PRAYER_METHOD_ID, zone);
  }
});

test("a cached day is rejected once the detected place has moved", () => {
  // Pinned to the authority the sample day was calculated by, so this exercises
  // the coordinate check rather than the method check.
  const here = cityWithMethod(
    cityFromCoordinates({
      latitude: 30.06,
      longitude: 31.25,
      timeZone: "Africa/Cairo",
      nameAr: "x",
      nameEn: "x",
    }),
    4
  );
  const day = { ...parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026"), city: here };
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
  cachePrayerDay(storage, day);
  // The same place reads its own cache back.
  assert.equal(readCachedPrayerDay(storage, here, "31-07-2026")?.city.id, DETECTED_CITY_ID);
  // The reader has moved, so the id matches but the coordinates do not.
  const moved = { ...here, latitude: 31.2 };
  assert.equal(readCachedPrayerDay(storage, moved, "31-07-2026"), undefined);
});

test("a failed check names the field so a surface can explain it", () => {
  const attempt = (payload: unknown) => {
    try {
      parsePrayerDayResponse(payload, riyadh, "31-07-2026");
      return undefined;
    } catch (error) {
      return error instanceof VerificationError ? error.field : "not-a-verification-error";
    }
  };

  const meta = (over: Record<string, unknown>) => ({
    meta: {
      latitude: riyadh.latitude,
      longitude: riyadh.longitude,
      timezone: "Asia/Riyadh",
      method: { id: 4, name: "Umm Al-Qura University, Makkah" },
      ...over,
    },
  });

  // The zone case is the one a detected place hits when a device is set wrong.
  assert.equal(attempt(prayerPayload(meta({ timezone: "Africa/Cairo" }))), "timeZone");
  assert.equal(attempt(prayerPayload(meta({ latitude: 8.88, longitude: 7.77 }))), "coordinates");
  assert.equal(attempt(prayerPayload(meta({ method: { id: 3, name: "MWL" } }))), "method");
  assert.equal(
    attempt(
      prayerPayload({
        date: {
          gregorian: { date: "01-01-2020" },
          hijri: { day: "17", month: { number: 2, ar: "صفر", en: "Safar" }, year: "1448" },
        },
      })
    ),
    "date"
  );
  assert.equal(attempt(prayerPayload()), undefined);
});

test("a place arriving from a client is not taken at its word", () => {
  // A known id always resolves to the catalog, so a caller cannot move a city.
  const forged = { ...riyadh, latitude: 0, longitude: 0, timeZone: "Africa/Cairo" };
  assert.deepEqual(trustedCity(forged), riyadh);
  assert.deepEqual(trustedCity({ id: "riyadh" }), riyadh);

  // A searched place is validated and kept as sent.
  assert.deepEqual(trustedCity(savedCairo), savedCairo);

  // A detected place is re-rounded rather than trusting the sender to have done
  // it, so precise coordinates cannot be smuggled past the client.
  const precise = {
    ...savedCairo,
    id: DETECTED_CITY_ID,
    source: "detected",
    latitude: 30.0626348,
    longitude: 31.2496712,
  };
  const trusted = trustedCity(precise);
  assert.equal(trusted?.latitude, 30.06);
  assert.equal(trusted?.longitude, 31.25);

  // Anything unusable is refused outright.
  for (const broken of [undefined, null, "riyadh", [], {}, { ...savedCairo, timeZone: "Mars/X" }]) {
    assert.equal(trustedCity(broken), undefined, JSON.stringify(broken));
  }
});

test("a cached day is checked for shape before anything reads it", () => {
  const day = parsePrayerDayResponse(prayerPayload(), riyadh, "31-07-2026");
  assert.equal(isUsablePrayerDay(day), true);

  // A shared cache can hold a row written by anything, so a partial or foreign
  // value must read as unusable rather than crash a formatter later.
  for (const broken of [
    undefined,
    null,
    "day",
    42,
    {},
    { a: 2 },
    { ...day, timings: undefined },
    { ...day, timings: { Fajr: "04:00" } },
    { ...day, timings: { ...day.timings, Isha: 5 } },
    { ...day, method: undefined },
    { ...day, city: undefined },
    { ...day, requestedDate: 20260731 },
  ]) {
    assert.equal(isUsablePrayerDay(broken), false, JSON.stringify(broken));
  }

  // A poisoned entry is dropped by the reader instead of being handed back.
  const store = new Map<string, string>([
    [prayerCacheKey(riyadh.id, "31-07-2026"), JSON.stringify({ a: 2 })],
  ]);
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
  assert.equal(readCachedPrayerDay(storage, riyadh, "31-07-2026"), undefined);
});
