-- A subscription may now name a place that is not in the bundled catalog, so
-- the whole verified place travels with it. Rows written before this migration
-- keep working from `city_id` alone until the browser next syncs them.
ALTER TABLE push_subscriptions ADD COLUMN place TEXT;

-- The cache is keyed by exactly what a response is checked against: the
-- coordinates, the time zone, the calculation method, and the date. Two places
-- that round to the same position share one fetch, while a place whose zone or
-- authority differs never reads a day that was verified for someone else.
CREATE TABLE IF NOT EXISTS prayer_day_cache (
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  time_zone TEXT NOT NULL,
  method_id INTEGER NOT NULL,
  requested_date TEXT NOT NULL,
  payload TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (latitude, longitude, time_zone, method_id, requested_date)
);

CREATE INDEX IF NOT EXISTS prayer_day_cache_age ON prayer_day_cache (fetched_at);

-- The previous cache was keyed by catalog id alone and cannot answer for a
-- searched or detected place. It held nothing but data that is re-fetched on
-- demand, so it is dropped rather than migrated.
DROP TABLE IF EXISTS prayer_days;
