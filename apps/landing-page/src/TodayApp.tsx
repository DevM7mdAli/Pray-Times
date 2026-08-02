import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CITIES,
  PRAYER_KEYS,
  addDaysToLocalDate,
  cachePrayerDay,
  allPrayerMethods,
  cityName,
  cityWithMethod,
  dayTimeline,
  fastingStatusFor,
  fetchAyah,
  fetchPrayerDay,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  formatUpdatedAt,
  localDateFor,
  nextPrayerFor,
  prayerKeysForCity,
  prayerMethodForCity,
  prayerMethodName,
  prayerNameForCity,
  isPrayerMethodId,
  parseMethodOverrides,
  parseSavedCities,
  readCachedPrayerDay,
  resolveCity,
  VerificationError,
  sunriseName,
  type Ayah,
  type City,
  type PrayerDay,
  type PrayerKey,
  type PrayerMethodId,
} from "@pray-times/core";
import { useDocumentLocale, useLocale, useToggleLocale } from "./i18n/useLocale";
import { LocationPicker } from "./LocationPicker";
import { Card, Kicker } from "./TodayUi";
import { QiblaCompass } from "./QiblaCompass";
import {
  currentWebPushSubscription,
  disableWebPush,
  enableWebPush,
  loadPushApiUrl,
  supportsWebPush,
  syncWebPush,
  testWebPush,
} from "./web-push";

const CITY_STORAGE_KEY = "pray-times:today-city";
const ALERT_PRAYERS_STORAGE_KEY = "pray-times:web-alert-prayers";
const SAVED_CITIES_STORAGE_KEY = "pray-times:saved-places:v1";
const METHOD_OVERRIDES_STORAGE_KEY = "pray-times:method-overrides:v1";
const EXTENSION_URL = "https://github.com/DevM7mdAli/Pray-Times/releases/latest";

const ALL_PRAYERS_ENABLED: Record<PrayerKey, boolean> = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

type LoadStatus = "loading" | "verified" | "cached" | "error" | "zone-mismatch";
type AyahStatus = "loading" | "ready" | "error";
type AlertStatus =
  | "checking"
  | "unconfigured"
  | "unsupported"
  | "denied"
  | "disabled"
  | "enabled"
  | "sent"
  | "error";

function initialCity(): string {
  try {
    // A saved place is resolved later against the stored list, so any id is
    // accepted here and falls back to the default if it no longer resolves.
    const stored = localStorage.getItem(CITY_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // Riyadh remains the visible default.
  }
  return "riyadh";
}

function initialAlertPrayers(): Record<PrayerKey, boolean> {
  try {
    const value = JSON.parse(localStorage.getItem(ALERT_PRAYERS_STORAGE_KEY) ?? "null") as unknown;
    if (value && typeof value === "object") {
      const candidate = value as Record<string, unknown>;
      if (PRAYER_KEYS.every((key) => typeof candidate[key] === "boolean")) {
        return Object.fromEntries(PRAYER_KEYS.map((key) => [key, candidate[key]])) as Record<
          PrayerKey,
          boolean
        >;
      }
    }
  } catch {
    // All prayers remain enabled when the stored preference is unavailable.
  }
  return { ...ALL_PRAYERS_ENABLED };
}

function initialMethodOverrides(): Record<string, PrayerMethodId> {
  try {
    return parseMethodOverrides(
      JSON.parse(localStorage.getItem(METHOD_OVERRIDES_STORAGE_KEY) ?? "null")
    );
  } catch {
    // Country defaults apply when the stored choice cannot be read.
    return {};
  }
}

function initialSavedCities(): City[] {
  try {
    return parseSavedCities(JSON.parse(localStorage.getItem(SAVED_CITIES_STORAGE_KEY) ?? "null"));
  } catch {
    // Built-in cities remain available when storage cannot be read.
    return [];
  }
}

export function TodayApp() {
  const { t } = useTranslation(["today", "common"]);
  const locale = useLocale();
  const toggleLocale = useToggleLocale();
  const [cityId, setCityId] = useState(initialCity);
  const [savedCities, setSavedCities] = useState<City[]>(initialSavedCities);
  const [methodOverrides, setMethodOverrides] =
    useState<Record<string, PrayerMethodId>>(initialMethodOverrides);
  const [day, setDay] = useState<PrayerDay>();
  const [tomorrow, setTomorrow] = useState<PrayerDay>();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [now, setNow] = useState(() => new Date());
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [pushApiUrl, setPushApiUrl] = useState<string>();
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("checking");
  const [alertBusy, setAlertBusy] = useState(false);
  const [enabledPrayers, setEnabledPrayers] = useState(initialAlertPrayers);
  const [ayah, setAyah] = useState<Ayah>();
  const [ayahStatus, setAyahStatus] = useState<AyahStatus>("loading");
  const [ayahVersion, setAyahVersion] = useState(0);

  const city = useMemo(() => {
    const base = resolveCity(cityId, savedCities) ?? CITIES[0]!;
    // Layered on here so the override reaches the request and the cache check,
    // not only the selector.
    return cityWithMethod(base, methodOverrides[base.id]);
  }, [cityId, methodOverrides, savedCities]);
  const visiblePrayerKeys = prayerKeysForCity(city);
  const localDate = city ? localDateFor(city.timeZone, now) : "";
  const alertSettings = useMemo(
    () => ({ place: city, locale, enabledPrayers }),
    [city, enabledPrayers, locale]
  );

  useDocumentLocale({ title: t("documentTitle") });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    const refreshVisiblePage = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", refreshVisiblePage);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setAyah(undefined);
    setAyahStatus("loading");
    void fetchAyah()
      .then((result) => {
        if (!active) return;
        setAyah(result);
        setAyahStatus("ready");
      })
      .catch(() => {
        if (active) setAyahStatus("error");
      });
    return () => {
      active = false;
    };
  }, [ayahVersion]);

  useEffect(() => {
    let active = true;
    void loadPushApiUrl().then(async (apiUrl) => {
      if (!active) return;
      setPushApiUrl(apiUrl);
      if (!supportsWebPush()) {
        setAlertStatus("unsupported");
        return;
      }
      if (!apiUrl) {
        setAlertStatus("unconfigured");
        return;
      }
      if (Notification.permission === "denied") {
        setAlertStatus("denied");
        return;
      }
      try {
        const subscription = await currentWebPushSubscription();
        if (subscription) await syncWebPush(apiUrl, alertSettings);
        if (active) setAlertStatus(subscription ? "enabled" : "disabled");
      } catch {
        if (active) setAlertStatus("error");
      }
    });
    return () => {
      active = false;
    };
  }, []); // The initial preferences are synchronized once; later changes use the effect below.

  useEffect(() => {
    try {
      localStorage.setItem(CITY_STORAGE_KEY, cityId);
      localStorage.setItem(ALERT_PRAYERS_STORAGE_KEY, JSON.stringify(enabledPrayers));
      localStorage.setItem(SAVED_CITIES_STORAGE_KEY, JSON.stringify(savedCities));
      localStorage.setItem(METHOD_OVERRIDES_STORAGE_KEY, JSON.stringify(methodOverrides));
    } catch {
      // Preferences remain available for this visit.
    }
  }, [cityId, enabledPrayers, methodOverrides, savedCities]);

  useEffect(() => {
    if (!pushApiUrl || (alertStatus !== "enabled" && alertStatus !== "sent")) return;
    const timer = window.setTimeout(() => {
      void syncWebPush(pushApiUrl, alertSettings).catch(() => setAlertStatus("error"));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [alertSettings, alertStatus, pushApiUrl]);

  useEffect(() => {
    if (!city || !localDate) return;
    let active = true;
    const tomorrowDate = addDaysToLocalDate(localDate, 1);
    let cached: PrayerDay | undefined;
    let cachedTomorrow: PrayerDay | undefined;
    try {
      cached = readCachedPrayerDay(localStorage, city, localDate);
      cachedTomorrow = readCachedPrayerDay(localStorage, city, tomorrowDate);
    } catch {
      cached = undefined;
      cachedTomorrow = undefined;
    }
    setDay(cached);
    setTomorrow(cachedTomorrow);
    setStatus(cached ? "cached" : "loading");

    void Promise.allSettled([
      fetchPrayerDay(city, { date: localDate }),
      fetchPrayerDay(city, { date: tomorrowDate }),
    ]).then(([todayResult, tomorrowResult]) => {
      if (!active) return;
      if (todayResult.status === "fulfilled") {
        cachePrayerDay(localStorage, todayResult.value);
        setDay(todayResult.value);
        setStatus("verified");
      } else if (cached) {
        setStatus("cached");
      } else {
        // A zone that disagrees with the coordinates is not a network problem,
        // and saying so would send the reader chasing the wrong fix.
        const reason = todayResult.reason;
        setStatus(
          reason instanceof VerificationError && reason.field === "timeZone"
            ? "zone-mismatch"
            : "error"
        );
      }
      if (tomorrowResult.status === "fulfilled") {
        cachePrayerDay(localStorage, tomorrowResult.value);
        setTomorrow(tomorrowResult.value);
      }
    });
    return () => {
      active = false;
    };
  }, [city, localDate, refreshVersion]);

  const fasting = day ? fastingStatusFor(day, now) : undefined;
  const todayNext = day ? nextPrayerFor(day, now) : undefined;
  const next = todayNext?.isTomorrow
    ? tomorrow
      ? nextPrayerFor(tomorrow, now)
      : undefined
    : todayNext;
  const nextDay = todayNext?.isTomorrow ? tomorrow : day;

  const alertMessage =
    alertStatus === "checking"
      ? t("alertChecking")
      : alertStatus === "unconfigured"
        ? t("alertUnavailable")
        : alertStatus === "unsupported"
          ? t("alertUnsupported")
          : alertStatus === "denied"
            ? t("alertDenied")
            : alertStatus === "enabled"
              ? t("alertEnabled")
              : alertStatus === "sent"
                ? t("alertSent")
                : alertStatus === "error"
                  ? t("alertError")
                  : t("alertDisabled");

  const enableAlerts = async () => {
    if (!pushApiUrl) return;
    setAlertBusy(true);
    try {
      await enableWebPush(pushApiUrl, alertSettings);
      setAlertStatus("enabled");
    } catch (error) {
      setAlertStatus(
        error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error"
      );
    } finally {
      setAlertBusy(false);
    }
  };

  const disableAlerts = async () => {
    if (!pushApiUrl) return;
    setAlertBusy(true);
    try {
      await disableWebPush(pushApiUrl);
      setAlertStatus("disabled");
    } catch {
      setAlertStatus("error");
    } finally {
      setAlertBusy(false);
    }
  };

  const sendTestAlert = async () => {
    if (!pushApiUrl) return;
    setAlertBusy(true);
    try {
      await testWebPush(pushApiUrl, alertSettings);
      setAlertStatus("sent");
    } catch {
      setAlertStatus("error");
    } finally {
      setAlertBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-layl bg-[image:radial-gradient(circle_at_76%_8%,rgba(77,168,218,0.2),transparent_30rem),linear-gradient(155deg,theme(colors.layl.raised)_0%,theme(colors.layl.DEFAULT)_52%,theme(colors.layl.deep)_100%)] text-nur antialiased">
      <header className="mx-auto flex min-h-[86px] w-shell-today items-center justify-between gap-6 border-b border-nur/10 max-mobile:min-h-[74px] max-mobile:w-[calc(100%-28px)]">
        <a
          className="flex items-center gap-[11px] font-display font-bold text-nur no-underline"
          href="/Pray-Times/"
        >
          <img
            className="rounded-13 shadow-[0_9px_25px_rgba(0,0,0,0.25)]"
            src="/Pray-Times/icon.png"
            width="46"
            height="46"
            alt=""
          />
          <span>Pray Times</span>
        </a>
        <nav className="flex items-center gap-[18px]" aria-label={t("title")}>
          <a
            className="cursor-pointer border-0 bg-transparent text-muted no-underline hover:text-nur max-mobile:hidden"
            href="/Pray-Times/"
          >
            {t("back")}
          </a>
          <a
            className="rounded-full border border-raml/[0.42] px-[15px] py-2.5 text-raml no-underline max-mobile:hidden"
            href={EXTENSION_URL}
            target="_blank"
            rel="noreferrer"
          >
            {t("extension")}
          </a>
          <button
            className="cursor-pointer border-0 bg-transparent text-muted hover:text-nur"
            type="button"
            onClick={toggleLocale}
            aria-label={t("common:switchLanguage")}
          >
            {t("language")}
          </button>
        </nav>
      </header>

      <main className="mx-auto w-shell-today pb-14 pt-[72px] max-mobile:w-[calc(100%-28px)] max-mobile:pb-[38px] max-mobile:pt-12">
        <section className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-12 gap-y-3 max-tablet:grid-cols-1">
          <p className="col-start-1 m-0 text-xs font-extrabold tracking-[0.14em] text-raml">
            {locale === "ar" ? "مسار يومك" : "YOUR DAILY PATH"}
          </p>
          <h1 className="col-start-1 m-0 font-display text-display-xl leading-[1.08]">
            {t("title")}
          </h1>
          <p className="col-start-1 m-0 text-17 text-muted">{t("subtitle")}</p>
          <LocationPicker
            cityId={cityId}
            savedCities={savedCities}
            onSelect={setCityId}
            onSave={(place) =>
              setSavedCities((current) => {
                const index = current.findIndex((entry) => entry.id === place.id);
                if (index === -1) return [...current, place];
                // A detected place keeps one id as the reader moves, so a fresh
                // reading replaces the stored one rather than being ignored.
                const next = [...current];
                next[index] = place;
                return next;
              })
            }
          />
        </section>

        <Card
          className="mt-9 grid gap-[22px] bg-layl-soft/[0.72] bg-[image:linear-gradient(120deg,rgba(77,168,218,0.14),transparent_55%)] px-7.5 py-[27px] max-mobile:px-[19px] max-mobile:py-[22px]"
          data-state={alertStatus}
          aria-labelledby="web-alerts-title"
        >
          <div className="flex items-center justify-between gap-7 max-mobile:flex-col max-mobile:items-stretch">
            <div>
              <span className="me-2.5 inline-flex rounded-full border border-success/[0.38] px-[9px] py-1 text-10 font-extrabold uppercase text-success-pale">
                {t("free")}
              </span>
              <h2 className="m-0 inline font-display text-22 font-bold" id="web-alerts-title">
                {t("alertsTitle")}
              </h2>
              <p className="mb-0 mt-1.25 text-13 text-muted">{t("alertsBody")}</p>
            </div>
            <div className="flex shrink-0 gap-[9px] max-mobile:flex-col">
              {alertStatus === "enabled" || alertStatus === "sent" ? (
                <>
                  <button
                    className="min-h-[43px] cursor-pointer rounded-xl border-0 bg-raml px-[17px] font-extrabold text-layl disabled:cursor-not-allowed disabled:opacity-[0.48]"
                    type="button"
                    onClick={() => void sendTestAlert()}
                    disabled={alertBusy}
                  >
                    {t("testAlert")}
                  </button>
                  <button
                    className="min-h-[43px] cursor-pointer rounded-xl border border-nur/[0.18] bg-transparent px-[17px] font-extrabold text-muted disabled:cursor-not-allowed disabled:opacity-[0.48]"
                    type="button"
                    onClick={() => void disableAlerts()}
                    disabled={alertBusy}
                  >
                    {t("disableAlerts")}
                  </button>
                </>
              ) : (
                <button
                  className="min-h-[43px] cursor-pointer rounded-xl border-0 bg-raml px-[17px] font-extrabold text-layl disabled:cursor-not-allowed disabled:opacity-[0.48]"
                  type="button"
                  onClick={() => void enableAlerts()}
                  disabled={
                    alertBusy ||
                    alertStatus === "checking" ||
                    alertStatus === "unconfigured" ||
                    alertStatus === "unsupported" ||
                    alertStatus === "denied"
                  }
                >
                  {t("enableAlerts")}
                </button>
              )}
            </div>
          </div>

          <div
            className="grid grid-cols-[auto_1fr] items-center gap-x-[22px] gap-y-3.5 border-y border-nur/10 py-[18px] max-mobile:grid-cols-1"
            aria-label={t("choosePrayers")}
          >
            <span className="text-xs font-bold text-muted">{t("choosePrayers")}</span>
            <div className="flex flex-wrap gap-2">
              {visiblePrayerKeys.map((key) => (
                <label className="relative cursor-pointer" key={key}>
                  <input
                    className="peer pointer-events-none absolute opacity-0"
                    type="checkbox"
                    checked={enabledPrayers[key]}
                    onChange={(event) =>
                      setEnabledPrayers((current) => ({ ...current, [key]: event.target.checked }))
                    }
                  />
                  <span className="block rounded-full border border-nur/[0.13] px-[13px] py-2 text-xs text-muted transition-[border-color,background,color] duration-150 peer-checked:border-raml/[0.42] peer-checked:bg-raml/10 peer-checked:text-raml peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sama">
                    {prayerNameForCity(key, city, locale)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-[9px]" role="status" aria-live="polite">
            <span
              className={
                alertStatus === "enabled" || alertStatus === "sent"
                  ? "size-2 flex-none rounded-full bg-success shadow-[0_0_10px_rgba(105,212,162,0.65)]"
                  : alertStatus === "error" || alertStatus === "denied"
                    ? "size-2 flex-none rounded-full bg-fajr"
                    : "size-2 flex-none rounded-full bg-muted"
              }
              aria-hidden="true"
            />
            <p className="m-0">{alertMessage}</p>
          </div>
          <p className="mb-0 mt-[-11px] text-11">{t("iosHelp")}</p>
        </Card>

        {day && fasting ? (
          <section
            className="mt-6 rounded-22 border border-raml/[0.34] bg-layl-soft/[0.72] bg-[image:linear-gradient(120deg,rgba(242,214,162,0.16),rgba(233,128,110,0.08)_60%)] px-7 py-[22px]"
            data-phase={fasting.phase}
            aria-live="polite"
          >
            <Kicker className="mb-2.5 mt-0">{t("ramadanKicker")}</Kicker>
            {fasting.phase === "completed" ? (
              <div className="flex flex-wrap items-baseline gap-3.5">
                <strong className="font-display text-display-md leading-[1.1]">
                  {t("fastCompleted")}
                </strong>
                <span className="text-13 text-muted">
                  {t("fastCompletedDetail")} {formatPrayerTime(day.timings.Maghrib, locale)}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-baseline gap-3.5">
                <span className="text-13 text-muted">
                  {fasting.phase === "suhoor" ? t("suhoorLabel") : t("iftarLabel")}
                </span>
                <strong className="font-display text-display-md leading-[1.1]">
                  {formatRemainingTime(fasting.minutesUntil ?? 0, locale)}
                </strong>
                <time className="ms-auto text-xl text-raml" dateTime={fasting.time}>
                  {formatPrayerTime(fasting.time ?? "", locale)}
                </time>
              </div>
            )}
          </section>
        ) : null}

        {day ? (
          <div className="mt-[52px] grid grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] gap-6 max-tablet:grid-cols-1">
            <Card
              className="relative min-h-[380px] overflow-hidden bg-layl-soft bg-[image:linear-gradient(145deg,rgba(77,168,218,0.23),rgba(20,36,73,0.76))] p-[35px] max-mobile:min-h-[330px] max-mobile:p-[26px]"
              aria-labelledby="next-prayer-title"
            >
              {next && nextDay ? (
                <>
                  <p className="relative z-[1] m-0 font-bold text-raml" id="next-prayer-title">
                    {nextDay.requestedDate !== day.requestedDate
                      ? t("common:nextPrayerTomorrow")
                      : t("common:nextPrayer")}
                  </p>
                  <div className="relative z-[1] mt-12 grid gap-1.25">
                    <strong className="font-display text-display-xl leading-none">
                      {prayerNameForCity(next.key, nextDay.city, locale)}
                    </strong>
                    <time className="text-display-md text-raml" dateTime={next.time}>
                      {formatPrayerTime(next.time, locale)}
                    </time>
                  </div>
                  <div className="absolute inset-x-[35px] bottom-8 z-[1] flex items-center justify-between border-t border-nur/[0.14] pt-5 text-muted max-mobile:inset-x-[26px]">
                    <span>{t("common:remaining")}</span>
                    <b className="text-xl text-nur">
                      {formatRemainingTime(next.minutesUntil, locale)}
                    </b>
                  </div>
                </>
              ) : (
                <div className="relative z-[1] mt-12 grid gap-4" aria-live="polite">
                  <p className="relative z-[1] m-0 font-bold text-raml" id="next-prayer-title">
                    {t("common:nextPrayerTomorrow")}
                  </p>
                  <strong className="max-w-[25rem] font-display text-display-md font-semibold leading-[1.35] text-raml">
                    {t("refreshing")}
                  </strong>
                </div>
              )}
              <div
                className="absolute -end-[70px] top-[-70px] h-[250px] w-[250px] rounded-full bg-fajr/20 blur-[15px]"
                aria-hidden="true"
              />
            </Card>

            <Card className="bg-layl-soft/[0.72] p-7.5" aria-labelledby="today-schedule-title">
              <div className="mb-4 flex items-end justify-between gap-6 max-mobile:flex-col max-mobile:items-start max-mobile:gap-2">
                <div>
                  <p className="m-0 text-[12px] text-muted">{cityName(day.city, locale)}</p>
                  <h2
                    className="m-0 mt-0.75 font-display text-2xl font-bold"
                    id="today-schedule-title"
                  >
                    {t("schedule")}
                  </h2>
                </div>
                <span className="text-[12px] text-muted">{formatHijriDate(day.hijri, locale)}</span>
              </div>
              <div>
                {dayTimeline(day).map((entry) => {
                  const isNext =
                    entry.kind === "prayer" && entry.key === next?.key && nextDay === day;
                  const isMarker = entry.kind === "sunrise";
                  return (
                    <div
                      className={
                        isNext
                          ? "-mx-2 grid min-h-[57px] grid-cols-[14px_1fr_auto] items-center gap-3 rounded-13 border border-sama/[0.35] bg-sama/10 px-[18px]"
                          : "grid min-h-[57px] grid-cols-[14px_1fr_auto] items-center gap-3 border-t border-nur/10 px-2.5"
                      }
                      key={entry.kind === "sunrise" ? "sunrise" : entry.key}
                    >
                      <span
                        className={
                          isNext
                            ? "size-2 rounded-full border border-raml bg-raml shadow-[0_0_14px_rgba(242,214,162,0.7)]"
                            : isMarker
                              ? "size-1.5 rounded-full border border-dashed border-muted"
                              : "size-2 rounded-full border border-muted"
                        }
                        aria-hidden="true"
                      />
                      <div className="grid gap-0.5">
                        <strong className={isMarker ? "font-medium text-muted" : undefined}>
                          {entry.kind === "sunrise"
                            ? sunriseName(locale)
                            : prayerNameForCity(entry.key, day.city, locale)}
                        </strong>
                        {entry.kind === "sunrise" ? (
                          <span className="text-11 text-muted">{t("sunriseNote")}</span>
                        ) : null}
                      </div>
                      <time
                        className={isNext ? "font-bold text-raml" : "text-muted"}
                        dateTime={entry.time}
                      >
                        {formatPrayerTime(entry.time, locale)}
                      </time>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : status === "error" || status === "zone-mismatch" ? (
          <Card className="mt-[52px] bg-layl-soft/[0.72] px-7.5 py-[54px] text-center" role="alert">
            <span
              className="mx-auto mb-4 mt-0 grid size-[52px] place-items-center rounded-full border border-fajr/[0.55] font-extrabold text-fajr"
              aria-hidden="true"
            >
              !
            </span>
            <h2 className="mb-2">
              {status === "zone-mismatch" ? t("errorZoneTitle") : t("errorTitle")}
            </h2>
            <p className="text-muted">
              {status === "zone-mismatch" ? t("errorZoneBody") : t("errorBody")}
            </p>
            <button
              className="min-h-11 cursor-pointer rounded-xl border-0 bg-raml px-[22px] font-extrabold text-layl"
              type="button"
              onClick={() => setRefreshVersion((value) => value + 1)}
            >
              {t("retry")}
            </button>
          </Card>
        ) : (
          <Card
            className="mt-[52px] bg-layl-soft/[0.72] px-7.5 py-[54px] text-center"
            aria-live="polite"
          >
            <span
              className="mx-auto mb-4 mt-0 grid size-[52px] animate-spin place-items-center rounded-full border border-sama/[0.55] border-t-transparent font-extrabold text-fajr"
              aria-hidden="true"
            />
            <p className="text-muted">{t("refreshing")}</p>
          </Card>
        )}

        <QiblaCompass city={city} />

        <Card
          className="relative mt-6 overflow-hidden bg-layl-soft/[0.72] bg-[image:radial-gradient(circle_at_88%_0%,rgba(242,214,162,0.13),transparent_24rem)] px-[38px] pb-[38px] pt-[34px] before:absolute before:inset-y-[34px] before:start-0 before:w-0.75 before:rounded-full before:bg-[image:linear-gradient(theme(colors.raml.DEFAULT),theme(colors.fajr.DEFAULT))] before:content-[''] max-mobile:px-[22px] max-mobile:pb-7.5 max-mobile:pt-[27px] max-mobile:before:inset-y-[27px]"
          aria-labelledby="today-ayah-title"
          aria-busy={ayahStatus === "loading"}
        >
          <div className="relative z-[1] flex items-center justify-between gap-6 max-mobile:flex-col max-mobile:items-start">
            <div>
              <p className="m-0 text-11 font-extrabold tracking-[0.09em] text-raml">
                {t("ayahKicker")}
              </p>
              <h2 className="m-0 mt-1.25 font-display text-2xl font-bold" id="today-ayah-title">
                {t("ayahTitle")}
              </h2>
            </div>
            <button
              className="min-h-[42px] flex-none cursor-pointer rounded-xl border border-raml/[0.36] bg-raml/[0.08] px-[17px] font-bold text-raml transition-[color,border-color,background] duration-150 disabled:cursor-progress disabled:opacity-55 max-mobile:w-full [&:hover:not(:disabled)]:border-raml [&:hover:not(:disabled)]:bg-raml [&:hover:not(:disabled)]:text-layl"
              type="button"
              onClick={() => setAyahVersion((value) => value + 1)}
              disabled={ayahStatus === "loading"}
            >
              {t("ayahRefresh")}
            </button>
          </div>
          <div className="relative z-[1] mt-[26px] min-h-[118px]" aria-live="polite">
            {ayah ? (
              <blockquote className="m-0 border-0 p-0">
                <p
                  className="m-0 max-w-[58rem] font-quran text-display-md text-nur"
                  lang="ar"
                  dir="rtl"
                >
                  ﴿{ayah.text}﴾
                </p>
                <cite className="mt-3 block font-display text-xs font-bold not-italic text-fajr">
                  {locale === "en" && ayah.surah.englishName
                    ? ayah.surah.englishName
                    : ayah.surah.name}{" "}
                  · {t("common:verseNumber")} {ayah.numberInSurah}
                </cite>
              </blockquote>
            ) : (
              <p
                className={`mb-0 mt-[34px] ${ayahStatus === "error" ? "text-fajr" : "text-muted"}`}
              >
                {ayahStatus === "error" ? t("ayahError") : t("ayahLoading")}
              </p>
            )}
          </div>
        </Card>

        {day ? (
          <Card
            className="mt-6 bg-layl-soft/[0.72] px-7 py-6"
            data-state={status}
            aria-live="polite"
          >
            <div className="flex items-center gap-[9px]">
              <span
                className={
                  status === "cached"
                    ? "h-[9px] w-[9px] rounded-full bg-raml shadow-[0_0_12px_rgba(242,214,162,0.6)]"
                    : "h-[9px] w-[9px] rounded-full bg-success shadow-[0_0_12px_rgba(105,212,162,0.7)]"
                }
                aria-hidden="true"
              />
              <p className="m-0 text-sm font-bold text-nur">
                {status === "verified"
                  ? t("verified")
                  : status === "cached"
                    ? t("cached")
                    : t("refreshing")}
              </p>
            </div>
            <dl className="mb-3.5 mt-5 flex flex-wrap gap-x-[42px] gap-y-4">
              <div className="grid gap-0.75">
                <dt className="text-11 text-muted">{t("refreshed")}</dt>
                <dd className="m-0 text-raml">
                  {formatUpdatedAt(day.fetchedAt, day.city.timeZone, locale)}
                </dd>
              </div>
              <div className="grid gap-0.75">
                <dt className="text-11 text-muted">
                  <label htmlFor="method-select">
                    {locale === "ar" ? "طريقة الحساب" : "Calculation"}
                  </label>
                </dt>
                <dd className="m-0 text-raml">
                  <select
                    className="min-h-[38px] max-w-full rounded-11 border border-nur/[0.18] bg-layl-soft px-[11px] text-13 text-nur"
                    id="method-select"
                    value={
                      methodOverrides[city.id] === undefined ? "" : String(methodOverrides[city.id])
                    }
                    onChange={(event) => {
                      const chosen = Number(event.target.value);
                      setMethodOverrides((current) => {
                        const next = { ...current };
                        // An empty choice returns the place to its country default.
                        if (event.target.value === "" || !isPrayerMethodId(chosen))
                          delete next[city.id];
                        else next[city.id] = chosen;
                        return next;
                      });
                    }}
                  >
                    <option value="">
                      {t("methodAuto")} —{" "}
                      {prayerMethodName(
                        prayerMethodForCity(resolveCity(cityId, savedCities) ?? CITIES[0]!),
                        locale
                      )}
                    </option>
                    {allPrayerMethods().map((method) => (
                      <option key={method.id} value={method.id}>
                        {prayerMethodName(method, locale)}
                      </option>
                    ))}
                  </select>
                  {methodOverrides[city.id] === undefined ? null : (
                    <span className="mt-1.25 block text-11 text-raml">{t("methodOverridden")}</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted">{t("accuracy")}</p>
          </Card>
        ) : null}
      </main>

      <footer className="flex justify-between gap-5 border-t border-nur/10 pb-[38px] pt-[25px] text-xs text-muted max-mobile:flex-col">
        <p className="m-0">{t("footer")}</p>
        <a className="text-raml no-underline" href="/Pray-Times/">
          Pray Times
        </a>
      </footer>
    </div>
  );
}
