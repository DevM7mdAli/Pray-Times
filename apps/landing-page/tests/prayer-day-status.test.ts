import assert from "node:assert/strict";
import test from "node:test";
import type { UseQueryResult } from "@tanstack/react-query";
import { VerificationError } from "@pray-times/core";
import type { PrayerDay } from "@pray-times/core";
import { loadStatusFor } from "../src/queries/prayerDay.js";

/**
 * What the reader is told about the times on screen is the whole trust story of
 * this app, so the mapping from query state onto it is pinned here rather than
 * only exercised through the UI.
 */
const day = { requestedDate: "2026-08-02" } as PrayerDay;

function result(state: Partial<UseQueryResult<PrayerDay>>): UseQueryResult<PrayerDay> {
  return {
    isError: false,
    isFetchedAfterMount: false,
    data: undefined,
    error: null,
    ...state,
  } as UseQueryResult<PrayerDay>;
}

test("a first load with nothing cached is still loading", () => {
  assert.equal(loadStatusFor(result({})), "loading");
});

test("a completed fetch is verified", () => {
  assert.equal(loadStatusFor(result({ data: day, isFetchedAfterMount: true })), "verified");
});

test("a cached day shown before the fetch lands is not claimed as verified", () => {
  assert.equal(loadStatusFor(result({ data: day, isFetchedAfterMount: false })), "cached");
});

test("a failed fetch falls back to the cached day rather than an error", () => {
  const failed = result({ data: day, isError: true, error: new Error("offline") });
  assert.equal(loadStatusFor(failed), "cached");
});

test("a failed fetch with no cached day is an error", () => {
  const failed = result({ isError: true, error: new Error("offline") });
  assert.equal(loadStatusFor(failed), "error");
});

test("a time zone that disagrees with the coordinates is reported as its own problem", () => {
  // Saying "check your connection" would send the reader chasing the wrong fix.
  const failed = result({
    isError: true,
    error: new VerificationError("timeZone", "Zone Asia/Riyadh did not match Europe/London"),
  });
  assert.equal(loadStatusFor(failed), "zone-mismatch");
});

test("a zone mismatch still prefers a cached day when there is one", () => {
  const failed = result({
    data: day,
    isError: true,
    error: new VerificationError("timeZone", "Zone Asia/Riyadh did not match Europe/London"),
  });
  assert.equal(loadStatusFor(failed), "cached");
});
