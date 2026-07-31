import { useEffect, useMemo, useState } from "react";
import {
  CITIES,
  PRAYER_KEYS,
  addDaysToLocalDate,
  cachePrayerDay,
  cityById,
  cityName,
  fetchPrayerDay,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  formatUpdatedAt,
  isSupportedLocale,
  localDateFor,
  localeDirection,
  nextPrayerFor,
  prayerMethodName,
  prayerName,
  readCachedPrayerDay,
  type PrayerDay,
  type SupportedLocale,
} from "@pray-times/core";

const CITY_STORAGE_KEY = "pray-times:today-city";
const LOCALE_STORAGE_KEY = "pray-times:landing-locale";
const EXTENSION_URL = "https://github.com/DevM7mdAli/Pray-Times/releases/latest";

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
    refreshing: "نتحقق من أحدث المواقيت…",
    verified: "تم التحقق من مواقيت اليوم",
    cached: "تعذر التحقق الآن — نعرض نسخة محفوظة ومتحققًا منها لهذا اليوم.",
    errorTitle: "تعذر عرض مواقيت اليوم",
    errorBody: "تحقق من الاتصال وحاول مجددًا. لن نعرض مواقيت غير متحققة.",
    retry: "إعادة المحاولة",
    refreshed: "آخر تحديث",
    accuracy: "قد تختلف المواقيت دقائق عن إعلان المسجد أو الجهة المحلية.",
    footer: "لا يحتاج إلى تثبيت أو حساب. تحفظ مدينتك على هذا الجهاز فقط.",
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
    refreshing: "Checking the latest prayer times…",
    verified: "Today’s prayer times are verified",
    cached: "Verification is unavailable — showing a verified copy saved for today.",
    errorTitle: "Today’s prayer times are unavailable",
    errorBody: "Check your connection and try again. We won’t show unverified times.",
    retry: "Try again",
    refreshed: "Last updated",
    accuracy: "Calculated times can differ by minutes from a mosque or local authority.",
    footer: "No installation or account needed. Your city stays on this device.",
  },
} as const;

type LoadStatus = "loading" | "verified" | "cached" | "error";

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
    const stored = localStorage.getItem(CITY_STORAGE_KEY);
    if (cityById(stored)) return stored ?? "riyadh";
  } catch {
    // Riyadh remains the visible default.
  }
  return "riyadh";
}

export function TodayApp() {
  const [locale, setLocale] = useState<SupportedLocale>(initialLocale);
  const [cityId, setCityId] = useState(initialCity);
  const [day, setDay] = useState<PrayerDay>();
  const [tomorrow, setTomorrow] = useState<PrayerDay>();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [now, setNow] = useState(() => new Date());
  const [refreshVersion, setRefreshVersion] = useState(0);

  const city = useMemo(() => cityById(cityId) ?? CITIES[0], [cityId]);
  const copy = COPY[locale];
  const localDate = city ? localDateFor(city.timeZone, now) : "";

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
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
    document.title = locale === "ar" ? "أوقات الصلاة اليوم" : "Today’s Prayer Times";
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      localStorage.setItem(CITY_STORAGE_KEY, cityId);
    } catch {
      // Preferences remain available for this visit.
    }
    const url = new URL(window.location.href);
    url.searchParams.set("lang", locale);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [cityId, locale]);

  useEffect(() => {
    if (!city || !localDate) return;
    let active = true;
    const tomorrowDate = addDaysToLocalDate(localDate, 1);
    let cached: PrayerDay | undefined;
    let cachedTomorrow: PrayerDay | undefined;
    try {
      cached = readCachedPrayerDay(localStorage, city.id, localDate);
      cachedTomorrow = readCachedPrayerDay(localStorage, city.id, tomorrowDate);
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
      } else {
        setStatus(cached ? "cached" : "error");
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

  const todayNext = day ? nextPrayerFor(day, now) : undefined;
  const next = todayNext?.isTomorrow
    ? tomorrow
      ? nextPrayerFor(tomorrow, now)
      : undefined
    : todayNext;
  const nextDay = todayNext?.isTomorrow ? tomorrow : day;

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
          <label className="today-city-picker">
            <span>{copy.city}</span>
            <select
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              aria-label={copy.selectCity}
            >
              {CITIES.map((option) => (
                <option key={option.id} value={option.id}>
                  {cityName(option, locale)}
                </option>
              ))}
            </select>
          </label>
        </section>

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
                    <strong>{prayerName(next.key, locale)}</strong>
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
                {PRAYER_KEYS.map((key) => (
                  <div className={key === next?.key && nextDay === day ? "is-next" : ""} key={key}>
                    <span className="prayer-marker" aria-hidden="true" />
                    <strong>{prayerName(key, locale)}</strong>
                    <time dateTime={day.timings[key]}>
                      {formatPrayerTime(day.timings[key], locale)}
                    </time>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : status === "error" ? (
          <section className="today-error" role="alert">
            <span aria-hidden="true">!</span>
            <h2>{copy.errorTitle}</h2>
            <p>{copy.errorBody}</p>
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
                <dt>{locale === "ar" ? "طريقة الحساب" : "Calculation"}</dt>
                <dd>{prayerMethodName(day.method, locale)}</dd>
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
