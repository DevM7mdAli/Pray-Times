CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint_hash TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  city_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('ar', 'en')),
  enabled_prayers TEXT NOT NULL,
  next_prayer_key TEXT,
  next_prayer_date TEXT,
  next_fire_at INTEGER,
  delivery_claimed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS push_subscriptions_due
  ON push_subscriptions (next_fire_at, delivery_claimed_at);

CREATE TABLE IF NOT EXISTS prayer_days (
  city_id TEXT NOT NULL,
  requested_date TEXT NOT NULL,
  payload TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (city_id, requested_date)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  endpoint_hash TEXT NOT NULL,
  prayer_date TEXT NOT NULL,
  prayer_key TEXT NOT NULL,
  delivered_at INTEGER NOT NULL,
  PRIMARY KEY (endpoint_hash, prayer_date, prayer_key)
);

CREATE INDEX IF NOT EXISTS notification_deliveries_age
  ON notification_deliveries (delivered_at);
