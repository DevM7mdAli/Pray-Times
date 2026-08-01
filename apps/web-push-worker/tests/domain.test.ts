import assert from "node:assert/strict";
import test from "node:test";
import {
  CITIES,
  CUSTOM_PRAYER_METHOD,
  UMM_AL_QURA,
  cityById,
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

test("subscription input requires complete prayer preferences", () => {
  assert.equal(
    parseSubscriptionInput({
      subscription: { endpoint: "https://push.example/1", keys: { p256dh: "key", auth: "auth" } },
      cityId: "riyadh",
      locale: "en",
      enabledPrayers: { Fajr: true },
    }),
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

test("Qatif notifications identify the combined prayer window", () => {
  const qatifDay: PrayerDay = {
    ...day,
    city: cityById("qatif")!,
    method: CUSTOM_PRAYER_METHOD,
  };
  const payload = notificationPayload(qatifDay, "Dhuhr", "en", "https://example.com");
  assert.match(payload.title, /Dhuhr & Asr/);
});
