import assert from "node:assert/strict";
import test from "node:test";
import {
  CITIES,
  PRAYER_METHODS,
  UMM_AL_QURA,
  cityById,
  cityWithMethod,
  prayerMethodForCity,
  type PrayerDay,
} from "@pray-times/core";
import { nextEnabledPrayer, notificationPayload, parseSubscriptionInput } from "../src/domain";

const day: PrayerDay = {
  requestedDate: "31-07-2026",
  city: CITIES[0]!,
  method: UMM_AL_QURA,
  timings: { Fajr: "04:00", Dhuhr: "12:00", Asr: "15:30", Maghrib: "18:30", Isha: "20:00" },
  hijri: { day: "16", monthAr: "صفر", monthEn: "Safar", year: "1448" },
  fetchedAt: "2026-07-31T00:00:00.000Z",
};

const push = { endpoint: "https://push.example/1", keys: { p256dh: "key", auth: "auth" } };
const allPrayers = { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true };

test("subscription input requires complete prayer preferences", () => {
  assert.equal(
    parseSubscriptionInput({
      subscription: push,
      cityId: "riyadh",
      locale: "en",
      enabledPrayers: { Fajr: true },
    }),
    undefined
  );
});

test("a subscription carries a whole place, however it was chosen", () => {
  // A browser predating the place field still sends only a catalog id.
  const legacy = parseSubscriptionInput({
    subscription: push,
    cityId: "riyadh",
    locale: "en",
    enabledPrayers: allPrayers,
  });
  assert.equal(legacy?.place.id, "riyadh");

  // A searched place travels in full, because the server cannot look it up.
  const searched = {
    id: "geo:360630",
    nameAr: "القاهرة",
    nameEn: "Cairo",
    latitude: 30.0626,
    longitude: 31.2497,
    timeZone: "Africa/Cairo",
    countryCode: "EG",
    source: "searched",
  };
  const custom = parseSubscriptionInput({
    subscription: push,
    cityId: searched.id,
    place: searched,
    locale: "en",
    enabledPrayers: allPrayers,
  });
  assert.deepEqual(custom?.place, searched);
  // The country decides the authority the worker will request and verify.
  assert.equal(prayerMethodForCity(custom!.place).id, 5);

  // A claimed id that exists in the catalog wins over the coordinates sent
  // beside it, so a caller cannot relocate a bundled city.
  const forged = parseSubscriptionInput({
    subscription: push,
    cityId: "riyadh",
    place: { ...searched, id: "riyadh" },
    locale: "en",
    enabledPrayers: allPrayers,
  });
  assert.deepEqual(forged?.place, cityById("riyadh"));

  // A place that fails validation is refused rather than half-accepted.
  assert.equal(
    parseSubscriptionInput({
      subscription: push,
      place: { ...searched, timeZone: "Mars/Olympus" },
      locale: "en",
      enabledPrayers: allPrayers,
    }),
    undefined
  );
  assert.equal(
    parseSubscriptionInput({ subscription: push, locale: "en", enabledPrayers: allPrayers }),
    undefined
  );
});

test("next enabled prayer skips disabled prayers", () => {
  const next = nextEnabledPrayer(
    [day],
    { Fajr: false, Dhuhr: false, Asr: true, Maghrib: false, Isha: false },
    new Date("2026-07-31T09:00:00.000Z")
  );
  assert.equal(next?.key, "Asr");
});

test("notification payload is localized and links to the web dashboard", () => {
  const payload = notificationPayload(day, "Maghrib", "ar", "https://example.com");
  assert.match(payload.title, /المغرب/);
  assert.equal(payload.url, "https://example.com/Pray-Times/today/?lang=ar");
});

test("a method that combines the pairs is named that way in a notification", () => {
  // The combined window follows the chosen authority, not the city.
  const combinedDay: PrayerDay = {
    ...day,
    city: cityWithMethod(CITIES[0]!, 0),
    method: PRAYER_METHODS[0],
  };
  assert.match(
    notificationPayload(combinedDay, "Dhuhr", "en", "https://example.com").title,
    /Dhuhr & Asr/
  );
  // The same place on its country default reads as five separate prayers.
  assert.match(notificationPayload(day, "Dhuhr", "en", "https://example.com").title, /Dhuhr$/);
});
