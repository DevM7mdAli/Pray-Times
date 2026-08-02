import { useEffect, useMemo, useState } from "react";
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
  isSupportedLocale,
  localDateFor,
  localeDirection,
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
  type SupportedLocale,
} from "@pray-times/core";
import { LocationPicker } from "./LocationPicker";
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
const LOCALE_STORAGE_KEY = "pray-times:landing-locale";
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

const COPY = {
  ar: {
    title: "أوقات الصلاة اليوم",
    subtitle: "مواقيت موثقة لمدينتك، مباشرة من المتصفح.",
    back: "الرئيسية",
    extension: "احصل على الإضافة للتنبيهات",
    language: "English",
    switchLanguage: "التبديل إلى الإنجليزية",
    city: "المدينة",
    selectCity: "اختر المدينة",
    nextPrayer: "الصلاة القادمة",
    nextPrayerTomorrow: "الصلاة القادمة غدًا",
    remaining: "متبقٍ",
    schedule: "مواقيت اليوم",
    sunriseNote: "نهاية وقت الفجر",
    methodAuto: "الافتراضي للدولة",
    methodOverridden: "اختيارك، بدل الافتراضي للدولة",
    ramadanKicker: "رمضان",
    suhoorLabel: "يتبقى على الإمساك",
    iftarLabel: "يتبقى على الإفطار",
    fastCompleted: "تقبل الله صيامكم",
    fastCompletedDetail: "كان الإفطار عند",
    refreshing: "نتحقق من أحدث المواقيت…",
    verified: "تم التحقق من مواقيت اليوم",
    cached: "تعذر التحقق الآن — نعرض نسخة محفوظة ومتحققًا منها لهذا اليوم.",
    errorTitle: "تعذر عرض مواقيت اليوم",
    errorBody: "تحقق من الاتصال وحاول مجددًا. لن نعرض مواقيت غير متحققة.",
    errorZoneTitle: "المنطقة الزمنية لجهازك لا توافق موقعك",
    errorZoneBody:
      "يقول جهازك إنه في منطقة زمنية أخرى غير إحداثياته، فلم نعرض مواقيت غير متحققة. صحّح المنطقة الزمنية للجهاز، أو اختر مدينتك من القائمة.",
    retry: "إعادة المحاولة",
    refreshed: "آخر تحديث",
    accuracy: "قد تختلف المواقيت دقائق عن إعلان المسجد أو الجهة المحلية.",
    alertsTitle: "تنبيهات الصلاة على الويب",
    alertsBody: "فعّلها مرة واحدة، وسيصلك التنبيه حتى بعد إغلاق الصفحة.",
    free: "مجاني",
    enableAlerts: "تفعيل التنبيهات",
    disableAlerts: "إيقاف التنبيهات",
    testAlert: "إرسال تنبيه تجريبي",
    alertChecking: "نتحقق من حالة التنبيهات…",
    alertEnabled: "التنبيهات مفعلة لهذا الجهاز",
    alertDisabled: "التنبيهات متوقفة",
    alertDenied: "الإشعارات محظورة. اسمح بها من إعدادات المتصفح ثم أعد المحاولة.",
    alertUnsupported: "هذا المتصفح لا يدعم تنبيهات الويب.",
    alertUnavailable: "خدمة التنبيهات المجانية تحتاج إلى ربطها قبل النشر.",
    alertError: "تعذر تحديث التنبيهات. تحقق من الاتصال وحاول مجددًا.",
    alertSent: "أُرسل التنبيه التجريبي. تحقق من إشعارات جهازك.",
    choosePrayers: "نبّهني عند",
    iosHelp: "على iPhone وiPad: أضف الصفحة إلى الشاشة الرئيسية أولًا، ثم افتحها وفعّل التنبيهات.",
    ayahKicker: "آية مختارة",
    ayahTitle: "وقفة هادئة من القرآن",
    ayahLoading: "نختار لك آية…",
    ayahError: "تعذّر جلب الآية الآن.",
    ayahRefresh: "آية أخرى",
    verseNumber: "الآية",
    footer: "لا يحتاج إلى تثبيت أو حساب. لا نحفظ اشتراكًا مجهولًا إلا عند تفعيل التنبيهات.",
  },
  en: {
    title: "Today’s prayer times",
    subtitle: "Verified times for your city, directly in the browser.",
    back: "Home",
    extension: "Get the extension for alerts",
    language: "العربية",
    switchLanguage: "Switch to Arabic",
    city: "City",
    selectCity: "Choose a city",
    nextPrayer: "Next prayer",
    nextPrayerTomorrow: "Next prayer tomorrow",
    remaining: "Remaining",
    schedule: "Today’s schedule",
    sunriseNote: "Fajr window ends",
    methodAuto: "Default for this country",
    methodOverridden: "Your choice, replacing the country default",
    ramadanKicker: "RAMADAN",
    suhoorLabel: "Until imsak",
    iftarLabel: "Until iftar",
    fastCompleted: "May your fast be accepted",
    fastCompletedDetail: "Iftar was at",
    refreshing: "Checking the latest prayer times…",
    verified: "Today’s prayer times are verified",
    cached: "Verification is unavailable — showing a verified copy saved for today.",
    errorTitle: "Today’s prayer times are unavailable",
    errorBody: "Check your connection and try again. We won’t show unverified times.",
    errorZoneTitle: "Your device’s time zone doesn’t match where it is",
    errorZoneBody:
      "Your device reports a time zone that disagrees with its coordinates, so we did not show unverified times. Correct the device time zone, or pick your city from the list instead.",
    retry: "Try again",
    refreshed: "Last updated",
    accuracy: "Calculated times can differ by minutes from a mosque or local authority.",
    alertsTitle: "Web prayer alerts",
    alertsBody: "Enable once and alerts can arrive even after you close this page.",
    free: "Free",
    enableAlerts: "Enable alerts",
    disableAlerts: "Turn off alerts",
    testAlert: "Send test alert",
    alertChecking: "Checking alert status…",
    alertEnabled: "Alerts are enabled on this device",
    alertDisabled: "Alerts are off",
    alertDenied: "Notifications are blocked. Allow them in browser settings, then try again.",
    alertUnsupported: "This browser does not support web push alerts.",
    alertUnavailable: "The free alert service must be connected before publishing.",
    alertError: "Could not update alerts. Check your connection and try again.",
    alertSent: "Test alert sent. Check your device notifications.",
    choosePrayers: "Alert me for",
    iosHelp:
      "On iPhone and iPad, add this page to your Home Screen first, then open it and enable alerts.",
    ayahKicker: "SELECTED AYAH",
    ayahTitle: "A quiet moment from the Qur’an",
    ayahLoading: "Choosing an ayah…",
    ayahError: "The ayah is unavailable right now.",
    ayahRefresh: "Another ayah",
    verseNumber: "Verse",
    footer:
      "No installation or account needed. An anonymous subscription is stored only when you enable alerts.",
  },
} as const;

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

function initialLocale(): SupportedLocale {
  const queryLocale = new URLSearchParams(window.location.search).get("lang");
  if (isSupportedLocale(queryLocale)) return queryLocale;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // Browser preference is a safe fallback when storage is unavailable.
  }
  return navigator.languages.some((language) => language.toLowerCase().startsWith("ar"))
    ? "ar"
    : "en";
}

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
  const [locale, setLocale] = useState<SupportedLocale>(initialLocale);
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
  const copy = COPY[locale];
  const localDate = city ? localDateFor(city.timeZone, now) : "";
  const alertSettings = useMemo(
    () => ({ place: city, locale, enabledPrayers }),
    [city, enabledPrayers, locale]
  );

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
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
    document.title = locale === "ar" ? "أوقات الصلاة اليوم" : "Today’s Prayer Times";
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      localStorage.setItem(CITY_STORAGE_KEY, cityId);
      localStorage.setItem(ALERT_PRAYERS_STORAGE_KEY, JSON.stringify(enabledPrayers));
      localStorage.setItem(SAVED_CITIES_STORAGE_KEY, JSON.stringify(savedCities));
      localStorage.setItem(METHOD_OVERRIDES_STORAGE_KEY, JSON.stringify(methodOverrides));
    } catch {
      // Preferences remain available for this visit.
    }
    const url = new URL(window.location.href);
    url.searchParams.set("lang", locale);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [cityId, enabledPrayers, locale, methodOverrides, savedCities]);

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
      ? copy.alertChecking
      : alertStatus === "unconfigured"
        ? copy.alertUnavailable
        : alertStatus === "unsupported"
          ? copy.alertUnsupported
          : alertStatus === "denied"
            ? copy.alertDenied
            : alertStatus === "enabled"
              ? copy.alertEnabled
              : alertStatus === "sent"
                ? copy.alertSent
                : alertStatus === "error"
                  ? copy.alertError
                  : copy.alertDisabled;

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
    <div className="today-shell antialiased">
      <header className="today-header">
        <a className="today-brand" href="/Pray-Times/">
          <img src="/Pray-Times/icon.png" width="46" height="46" alt="" />
          <span>Pray Times</span>
        </a>
        <nav aria-label={copy.title}>
          <a href="/Pray-Times/">{copy.back}</a>
          <a className="today-extension-link" href={EXTENSION_URL} target="_blank" rel="noreferrer">
            {copy.extension}
          </a>
          <button
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            aria-label={copy.switchLanguage}
          >
            {copy.language}
          </button>
        </nav>
      </header>

      <main className="today-main">
        <section className="today-intro">
          <p className="today-kicker">{locale === "ar" ? "مسار يومك" : "YOUR DAILY PATH"}</p>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
          <LocationPicker
            cityId={cityId}
            savedCities={savedCities}
            locale={locale}
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

        <section
          className="today-alerts"
          data-state={alertStatus}
          aria-labelledby="web-alerts-title"
        >
          <div className="today-alerts-heading">
            <div>
              <span className="today-alerts-badge">{copy.free}</span>
              <h2 id="web-alerts-title">{copy.alertsTitle}</h2>
              <p>{copy.alertsBody}</p>
            </div>
            <div className="today-alert-actions">
              {alertStatus === "enabled" || alertStatus === "sent" ? (
                <>
                  <button type="button" onClick={() => void sendTestAlert()} disabled={alertBusy}>
                    {copy.testAlert}
                  </button>
                  <button
                    className="is-secondary"
                    type="button"
                    onClick={() => void disableAlerts()}
                    disabled={alertBusy}
                  >
                    {copy.disableAlerts}
                  </button>
                </>
              ) : (
                <button
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
                  {copy.enableAlerts}
                </button>
              )}
            </div>
          </div>

          <div className="today-alert-prayers" aria-label={copy.choosePrayers}>
            <span>{copy.choosePrayers}</span>
            <div>
              {visiblePrayerKeys.map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={enabledPrayers[key]}
                    onChange={(event) =>
                      setEnabledPrayers((current) => ({ ...current, [key]: event.target.checked }))
                    }
                  />
                  <span>{prayerNameForCity(key, city, locale)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="today-alert-status" role="status" aria-live="polite">
            <span aria-hidden="true" />
            <p>{alertMessage}</p>
          </div>
          <p className="today-alert-ios">{copy.iosHelp}</p>
        </section>

        {day && fasting ? (
          <section className="today-ramadan" data-phase={fasting.phase} aria-live="polite">
            <p className="today-ramadan-kicker">{copy.ramadanKicker}</p>
            {fasting.phase === "completed" ? (
              <div>
                <strong>{copy.fastCompleted}</strong>
                <span>
                  {copy.fastCompletedDetail} {formatPrayerTime(day.timings.Maghrib, locale)}
                </span>
              </div>
            ) : (
              <div>
                <span>{fasting.phase === "suhoor" ? copy.suhoorLabel : copy.iftarLabel}</span>
                <strong>{formatRemainingTime(fasting.minutesUntil ?? 0, locale)}</strong>
                <time dateTime={fasting.time}>{formatPrayerTime(fasting.time ?? "", locale)}</time>
              </div>
            )}
          </section>
        ) : null}

        {day ? (
          <div className="today-dashboard">
            <section className="today-next" aria-labelledby="next-prayer-title">
              {next && nextDay ? (
                <>
                  <p id="next-prayer-title">
                    {nextDay.requestedDate !== day.requestedDate
                      ? copy.nextPrayerTomorrow
                      : copy.nextPrayer}
                  </p>
                  <div className="today-next-main">
                    <strong>{prayerNameForCity(next.key, nextDay.city, locale)}</strong>
                    <time dateTime={next.time}>{formatPrayerTime(next.time, locale)}</time>
                  </div>
                  <div className="today-countdown">
                    <span>{copy.remaining}</span>
                    <b>{formatRemainingTime(next.minutesUntil, locale)}</b>
                  </div>
                </>
              ) : (
                <div className="today-next-pending" aria-live="polite">
                  <p id="next-prayer-title">{copy.nextPrayerTomorrow}</p>
                  <strong>{copy.refreshing}</strong>
                </div>
              )}
              <div className="today-glow" aria-hidden="true" />
            </section>

            <section className="today-schedule" aria-labelledby="today-schedule-title">
              <div className="today-section-heading">
                <div>
                  <p>{cityName(day.city, locale)}</p>
                  <h2 id="today-schedule-title">{copy.schedule}</h2>
                </div>
                <span>{formatHijriDate(day.hijri, locale)}</span>
              </div>
              <div className="today-prayer-list">
                {dayTimeline(day).map((entry) => {
                  const isNext =
                    entry.kind === "prayer" && entry.key === next?.key && nextDay === day;
                  return (
                    <div
                      className={`${isNext ? "is-next" : ""}${entry.kind === "sunrise" ? " is-marker" : ""}`}
                      key={entry.kind === "sunrise" ? "sunrise" : entry.key}
                    >
                      <span className="prayer-marker" aria-hidden="true" />
                      <div className="today-prayer-label">
                        <strong>
                          {entry.kind === "sunrise"
                            ? sunriseName(locale)
                            : prayerNameForCity(entry.key, day.city, locale)}
                        </strong>
                        {entry.kind === "sunrise" ? <span>{copy.sunriseNote}</span> : null}
                      </div>
                      <time dateTime={entry.time}>{formatPrayerTime(entry.time, locale)}</time>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : status === "error" || status === "zone-mismatch" ? (
          <section className="today-error" role="alert">
            <span aria-hidden="true">!</span>
            <h2>{status === "zone-mismatch" ? copy.errorZoneTitle : copy.errorTitle}</h2>
            <p>{status === "zone-mismatch" ? copy.errorZoneBody : copy.errorBody}</p>
            <button type="button" onClick={() => setRefreshVersion((value) => value + 1)}>
              {copy.retry}
            </button>
          </section>
        ) : (
          <section className="today-loading" aria-live="polite">
            <span aria-hidden="true" />
            <p>{copy.refreshing}</p>
          </section>
        )}

        <QiblaCompass city={city} locale={locale} />

        <section
          className="today-ayah"
          aria-labelledby="today-ayah-title"
          aria-busy={ayahStatus === "loading"}
        >
          <div className="today-ayah-heading">
            <div>
              <p>{copy.ayahKicker}</p>
              <h2 id="today-ayah-title">{copy.ayahTitle}</h2>
            </div>
            <button
              type="button"
              onClick={() => setAyahVersion((value) => value + 1)}
              disabled={ayahStatus === "loading"}
            >
              {copy.ayahRefresh}
            </button>
          </div>
          <div className="today-ayah-content" aria-live="polite">
            {ayah ? (
              <blockquote>
                <p lang="ar" dir="rtl">
                  ﴿{ayah.text}﴾
                </p>
                <cite>
                  {locale === "en" && ayah.surah.englishName
                    ? ayah.surah.englishName
                    : ayah.surah.name}{" "}
                  · {copy.verseNumber} {ayah.numberInSurah}
                </cite>
              </blockquote>
            ) : (
              <p className={ayahStatus === "error" ? "is-error" : ""}>
                {ayahStatus === "error" ? copy.ayahError : copy.ayahLoading}
              </p>
            )}
          </div>
        </section>

        {day ? (
          <section className="today-verification" data-state={status} aria-live="polite">
            <div>
              <span className="verification-dot" aria-hidden="true" />
              <p>
                {status === "verified"
                  ? copy.verified
                  : status === "cached"
                    ? copy.cached
                    : copy.refreshing}
              </p>
            </div>
            <dl>
              <div>
                <dt>{copy.refreshed}</dt>
                <dd>{formatUpdatedAt(day.fetchedAt, day.city.timeZone, locale)}</dd>
              </div>
              <div>
                <dt>
                  <label htmlFor="method-select">
                    {locale === "ar" ? "طريقة الحساب" : "Calculation"}
                  </label>
                </dt>
                <dd>
                  <select
                    id="method-select"
                    className="today-method-select"
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
                      {copy.methodAuto} —{" "}
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
                    <span className="today-method-hint">{copy.methodOverridden}</span>
                  )}
                </dd>
              </div>
            </dl>
            <p>{copy.accuracy}</p>
          </section>
        ) : null}
      </main>

      <footer className="today-footer">
        <p>{copy.footer}</p>
        <a href="/Pray-Times/">Pray Times</a>
      </footer>
    </div>
  );
}
