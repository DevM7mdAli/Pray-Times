import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CITIES,
  PRAYER_KEYS,
  cityById,
  cityName,
  fetchAyah,
  fetchPrayerDay,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  isSupportedLocale,
  localeDirection,
  nextPrayerFor,
  prayerKeysForCity,
  prayerMethodName,
  prayerName,
  prayerNameForCity,
  type Ayah,
  type PrayerDay,
  type SupportedLocale,
} from "@pray-times/core";

const REPOSITORY_URL = "https://github.com/DevM7mdAli/Pray-Times";
const EXTENSION_URL = `${REPOSITORY_URL}/releases/latest`;
const BASE_URL = import.meta.env.BASE_URL;
const TODAY_URL = `${BASE_URL}today/`;
const LOCALE_STORAGE_KEY = "pray-times:landing-locale";

const COPY = {
  ar: {
    appName: "أوقات الصلاة",
    brandKicker: "مسار اليوم",
    documentTitle: "أوقات الصلاة — الوقت القادم، بثقة",
    documentDescription:
      "أوقات الصلاة: وقت الصلاة القادمة في مدينتك، بإحداثيات واضحة وطريقة حساب معلنة.",
    languageShort: "EN",
    switchLanguage: "التبديل إلى الإنجليزية",
    homeLabel: "أوقات الصلاة، بداية الصفحة",
    navigationLabel: "التنقل الرئيسي",
    featuresNav: "ما الجديد؟",
    verificationNav: "كيف نتحقق؟",
    privacyNav: "الخصوصية",
    openProject: "افتح المشروع",
    useOnWeb: "استخدمه على الويب مع التنبيهات",
    getExtension: "احصل على الإضافة",
    heroEyebrow: "لا ينبغي أن يكون وقت الصلاة تخمينًا",
    heroLead:
      "اعرف الصلاة القادمة في أي مدينة، وحدد اتجاه القبلة، وتابع رمضان، وفعّل تنبيهات موثوقة من الويب أو الإضافة.",
    learnVerification: "تعرّف على طريقة التحقق",
    localOnly: "بلا حساب — تحفظ اختياراتك على جهازك",
    livePreview: "معاينة مباشرة للإضافة",
    liveLabel: "معاينة مباشرة",
    city: "المدينة",
    choosePreviewCity: "اختر مدينة للمعاينة",
    loadingDay: "نتحقق من مسار اليوم…",
    unavailableTimes: "تعذّر عرض المواقيت",
    doNotShowUnverified: "لن نعرض توقيتًا غير متحقق.",
    nextPrayer: "الصلاة القادمة",
    nextPrayerTomorrow: "الصلاة القادمة غدًا",
    remaining: "متبقٍ",
    prayerPath: "مسار مواقيت الصلاة",
    verifiedNow: "تم التحقق الآن",
    daylineLead: "مواقيت الصلاة.",
    daylineAccent: "مسار واحد واضح.",
    featuresEyebrow: "من مواقيت مدينة إلى رفيق يومي",
    featuresTitle: "كل ما تحتاجه حول وقت الصلاة.",
    featuresIntro:
      "بدأ المشروع بعرض الصلاة القادمة لمدن سعودية محددة. الآن يرافقك في أي مكان ويضيف الأدوات التي تحتاجها قبل الصلاة وخلال يومك.",
    beforeLabel: "سابقًا",
    beforeText: "مدن سعودية جاهزة، مواقيت موثقة، وإضافة للمتصفح.",
    nowLabel: "الآن",
    nowText: "أي مدينة، تحديد اختياري للموقع، قبلة، رمضان، تنبيهات، وطريقة حساب تناسب المكان.",
    methodEyebrow: "دقة يفهمها المستخدم",
    methodLead: "لا نطلب منك أن تثق بنا بصمت.",
    methodBody:
      "الوقت المعروض يمر بثلاثة فحوص واضحة. إذا لم تطابق النتيجة المدينة أو اليوم أو طريقة الحساب، لا نعرضها.",
    coordinateTitle: "إحداثيات المدينة",
    coordinateBody:
      "اختر مدينة جاهزة، أو ابحث في أي مكان، أو استخدم موقعك باختيارك. نثبت الإحداثيات قبل التحقق من المواقيت.",
    dateTitle: "تاريخ ومنطقة زمنية",
    dateBody: "نقارن التاريخ والمنطقة الزمنية والإحداثيات التي يعيدها المزود قبل العرض.",
    methodTitle: "طريقة معلنة",
    methodBodyCard: "نقترح طريقة الحساب حسب البلد ويمكنك تغييرها لكل مكان.",
    privacyEyebrow: "خصوصيتك جزء من الدقة",
    privacyLead: "الموقع ليس استعلامًا غامضًا.",
    privacyBody:
      "لا حساب ولا تتبع. تحفظ الأماكن والتفضيلات على جهازك، ويُرسل نص البحث فقط أثناء البحث عن مدينة. عند اختيار الموقع الحالي نقلل دقة الإحداثيات قبل استخدامها.",
    verseEyebrow: "مساحة هادئة",
    verseLead: "آية مختارة، بلا تشتيت.",
    verseUnavailable: "تظهر الآية عند توفر الاتصال.",
    originalArabic: "النص القرآني بالعربية",
    verseNumber: "الآية",
    closingEyebrow: "وقتك بين يديك",
    closingLead: "افتح الويب. وفعّل التنبيهات مجانًا.",
    footer: "مصمم لليوم، من الفجر إلى العشاء.",
    providerError: "تعذّر التحقق من مزود المواقيت الآن.",
  },
  en: {
    appName: "Pray Times",
    brandKicker: "TODAY’S PATH",
    documentTitle: "Pray Times — the next prayer, with confidence",
    documentDescription:
      "Pray Times shows the next prayer in your city with clear coordinates and a declared calculation method.",
    languageShort: "ع",
    switchLanguage: "Switch to Arabic",
    homeLabel: "Pray Times, top of page",
    navigationLabel: "Main navigation",
    featuresNav: "What’s new",
    verificationNav: "How we verify",
    privacyNav: "Privacy",
    openProject: "View project",
    useOnWeb: "Use on the web with alerts",
    getExtension: "Get the extension",
    heroEyebrow: "Prayer time should not be a guess",
    heroLead:
      "Know the next prayer in any city, find the qibla, follow Ramadan, and enable verified alerts on the web or in the extension.",
    learnVerification: "See how verification works",
    localOnly: "No account — your choices stay on this device",
    livePreview: "Live extension preview",
    liveLabel: "LIVE PREVIEW",
    city: "City",
    choosePreviewCity: "Choose a city for the preview",
    loadingDay: "Checking today’s path…",
    unavailableTimes: "Prayer times are unavailable",
    doNotShowUnverified: "We will not show an unverified time.",
    nextPrayer: "Next prayer",
    nextPrayerTomorrow: "Next prayer tomorrow",
    remaining: "Remaining",
    prayerPath: "Prayer-time path",
    verifiedNow: "Verified now",
    daylineLead: "Prayer times.",
    daylineAccent: "One clear path.",
    featuresEyebrow: "FROM CITY TIMES TO A DAILY COMPANION",
    featuresTitle: "Everything around the prayer, in one place.",
    featuresIntro:
      "Pray Times began with verified schedules for selected Saudi cities. It now travels with you and adds the tools you need before prayer and throughout the day.",
    beforeLabel: "Before",
    beforeText: "Saudi city presets, verified prayer times, and a browser extension.",
    nowLabel: "Now",
    nowText:
      "Any city, optional location detection, qibla, Ramadan guidance, alerts, and a calculation method suited to the place.",
    methodEyebrow: "Accuracy you can understand",
    methodLead: "Trust should not be silent.",
    methodBody:
      "Every displayed time passes three clear checks. If the city, day, or calculation method does not match, we do not show it.",
    coordinateTitle: "City coordinates",
    coordinateBody:
      "Choose an offline preset, search anywhere, or use your location by choice. Coordinates are pinned before prayer times are verified.",
    dateTitle: "Date and time zone",
    dateBody:
      "We compare the date, time zone, and coordinates returned by the provider before displaying a result.",
    methodTitle: "A declared method",
    methodBodyCard: "We suggest a calculation method by country, and you can change it per place.",
    privacyEyebrow: "Privacy supports accuracy",
    privacyLead: "Location is not a vague request.",
    privacyBody:
      "No account or tracking. Places and preferences stay on your device; search text is sent only while finding a city, and current-location coordinates are reduced in precision before use.",
    verseEyebrow: "A quiet moment",
    verseLead: "A selected verse, without distraction.",
    verseUnavailable: "A verse appears when a connection is available.",
    originalArabic: "Original Arabic Qur’an text",
    verseNumber: "Verse",
    closingEyebrow: "Your time, in your hands",
    closingLead: "Open the web app. Enable free alerts.",
    footer: "Made for the day, from Fajr to Isha.",
    providerError: "We could not verify prayer times with the provider.",
  },
} as const;

const FEATURES = {
  ar: [
    {
      title: "أي مدينة في العالم",
      body: "ابحث بالعربية أو الإنجليزية، أو اختر مدينة سعودية جاهزة تعمل حتى قبل البحث.",
      tag: "بحث عالمي",
    },
    {
      title: "موقعي باختياري",
      body: "اطلب موقعك فقط عند الضغط، ثم نقلل دقة الإحداثيات ونثبت المنطقة الزمنية قبل الحساب.",
      tag: "خصوصية أولًا",
    },
    {
      title: "بوصلة القبلة",
      body: "اتجاه محسوب من مكانك إلى الكعبة، مع إمكانية محاذاته بحساس اتجاه الجهاز.",
      tag: "اتجاه واضح",
    },
    {
      title: "رمضان والشروق",
      body: "عداد للسحور والإفطار في رمضان، ووقت الشروق لمعرفة نهاية نافذة الفجر.",
      tag: "سياق يومي",
    },
    {
      title: "تنبيهات حيثما تستخدمه",
      body: "تنبيهات ويب مجانية، وتنبيهات الإضافة، وعدّاد للصلاة القادمة على أيقونة المتصفح.",
      tag: "حتى بعد الإغلاق",
    },
    {
      title: "طريقة تناسب المكان",
      body: "اقتراح حسب البلد مع اختيار يدوي لكل مكان، والتحقق من الطريقة قبل عرض أي وقت.",
      tag: "شفافية ودقة",
    },
  ],
  en: [
    {
      title: "Any city worldwide",
      body: "Search in Arabic or English, or choose a built-in Saudi preset that is ready before you search.",
      tag: "Worldwide search",
    },
    {
      title: "Location, only by choice",
      body: "Location is requested only after your tap, then coordinates are coarsened and the time zone is pinned.",
      tag: "Privacy first",
    },
    {
      title: "Qibla compass",
      body: "A direction calculated from your place to the Kaaba, with optional alignment to your device heading.",
      tag: "Clear direction",
    },
    {
      title: "Ramadan and sunrise",
      body: "Suhoor and iftar guidance during Ramadan, plus sunrise to show when the Fajr window closes.",
      tag: "Daily context",
    },
    {
      title: "Alerts wherever you use it",
      body: "Free Web Push, extension notifications, and a next-prayer countdown on the browser toolbar.",
      tag: "Even after closing",
    },
    {
      title: "A method suited to the place",
      body: "A country-based suggestion with a per-place override, verified before any time is displayed.",
      tag: "Transparent accuracy",
    },
  ],
} as const;

type Copy = { [Key in keyof (typeof COPY)["ar"]]: string };

function initialLocale(): SupportedLocale {
  const requested = new URLSearchParams(window.location.search).get("lang");
  if (isSupportedLocale(requested)) return requested;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // The page remains usable when storage is unavailable.
  }
  return navigator.languages.some((language) => language.toLowerCase().startsWith("ar"))
    ? "ar"
    : "en";
}

function BrandMark({ className = "" }: { className?: string }) {
  return <img className={className} src={`${BASE_URL}icon.png`} width="48" height="48" alt="" />;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Zm0 6v5m0 3h.01" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 6Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function prayerCard(
  day: PrayerDay | undefined,
  loading: boolean,
  failed: boolean,
  locale: SupportedLocale,
  copy: Copy
) {
  if (loading) {
    return (
      <div className="preview-empty">
        <span className="preview-orb" />
        <p>{copy.loadingDay}</p>
      </div>
    );
  }
  if (failed || !day) {
    return (
      <div className="preview-empty">
        <span className="preview-orb preview-orb-error" />
        <p>{copy.unavailableTimes}</p>
        <span>{copy.doNotShowUnverified}</span>
      </div>
    );
  }
  const next = nextPrayerFor(day);
  return (
    <>
      <div className="preview-date">
        {cityName(day.city, locale)} · {formatHijriDate(day.hijri, locale)}
      </div>
      <div className="next-block">
        <span>{next.isTomorrow ? copy.nextPrayerTomorrow : copy.nextPrayer}</span>
        <div>
          <strong>{prayerNameForCity(next.key, day.city, locale)}</strong>
          <time>{formatPrayerTime(next.time, locale)}</time>
        </div>
        <p>
          {copy.remaining} {formatRemainingTime(next.minutesUntil, locale)}
        </p>
      </div>
      <div className="preview-path" aria-label={copy.prayerPath}>
        {prayerKeysForCity(day.city).map((key) => (
          <div className={key === next.key ? "preview-stop is-current" : "preview-stop"} key={key}>
            <i aria-hidden="true" />
            <span>{prayerNameForCity(key, day.city, locale)}</span>
            <time>{formatPrayerTime(day.timings[key], locale)}</time>
          </div>
        ))}
      </div>
      <p className="preview-method">
        {prayerMethodName(day.method, locale)} · {copy.verifiedNow}
      </p>
    </>
  );
}

export function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [locale, setLocale] = useState<SupportedLocale>(initialLocale);
  const [cityId, setCityId] = useState("riyadh");
  const [day, setDay] = useState<PrayerDay>();
  const [ayah, setAyah] = useState<Ayah>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const copy = COPY[locale];
  const city = useMemo(() => cityById(cityId) ?? CITIES[0], [cityId]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!shell || reducedMotion || !("IntersectionObserver" in window)) return;

    const targets = Array.from(shell.querySelectorAll<HTMLElement>("[data-reveal]"));
    shell.classList.add("motion-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 }
    );

    targets.forEach((target) => observer.observe(target));
    return () => {
      observer.disconnect();
      shell.classList.remove("motion-ready");
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = localeDirection(locale);
    document.title = copy.documentTitle;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", copy.documentDescription);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", copy.documentTitle);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute("content", copy.documentDescription);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Storage is optional; the URL still reflects a manually selected language.
    }
    const url = new URL(window.location.href);
    url.searchParams.set("lang", locale);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [copy.documentDescription, copy.documentTitle, locale]);

  useEffect(() => {
    if (!city) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    void fetchPrayerDay(city)
      .then((result) => {
        if (active) setDay(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    void fetchAyah()
      .then((result) => {
        if (active) setAyah(result);
      })
      .catch(() => {
        if (active) setAyah(undefined);
      });
    return () => {
      active = false;
    };
  }, [city]);

  return (
    <div ref={shellRef} className="site-shell antialiased">
      <header className="site-header" data-reveal="down">
        <a className="site-brand" href="#top" aria-label={copy.homeLabel}>
          <BrandMark />
          <span>{copy.appName}</span>
        </a>
        <nav aria-label={copy.navigationLabel}>
          <a href="#features">{copy.featuresNav}</a>
          <a href="#method">{copy.verificationNav}</a>
          <a href="#privacy">{copy.privacyNav}</a>
        </nav>
        <div className="header-actions">
          <button
            className="language-toggle"
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            aria-label={copy.switchLanguage}
          >
            {copy.languageShort}
          </button>
          <a className="header-cta" href={TODAY_URL}>
            {copy.useOnWeb} <ArrowIcon />
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy" data-reveal="up">
            <p className="eyebrow">
              <span /> {copy.heroEyebrow}
            </p>
            <h1>
              {locale === "ar" ? (
                <>
                  اعرف الصلاة القادمة،
                  <br />
                  <em>بثقة.</em>
                </>
              ) : (
                <>
                  Know the next prayer,
                  <br />
                  <em>with confidence.</em>
                </>
              )}
            </h1>
            <p className="hero-lede">{copy.heroLead}</p>
            <div className="hero-actions">
              <a className="button button-primary" href={TODAY_URL}>
                {copy.useOnWeb} <ArrowIcon />
              </a>
              <a className="text-link" href={EXTENSION_URL} target="_blank" rel="noreferrer">
                {copy.getExtension}
              </a>
            </div>
            <p className="micro-proof">
              <CheckIcon /> {copy.localOnly}
            </p>
          </div>

          <div className="hero-preview-wrap" data-reveal="scale">
            <div className="light-aura" aria-hidden="true" />
            <section className="live-preview" aria-label={copy.livePreview}>
              <div className="preview-top">
                <div className="preview-brand">
                  <BrandMark />
                  <span>
                    <small>{copy.brandKicker}</small>
                    {copy.appName}
                  </span>
                </div>
                <span className="live-dot">{copy.liveLabel}</span>
              </div>
              <label className="preview-city">
                {copy.city}
                <select
                  value={cityId}
                  onChange={(event) => setCityId(event.target.value)}
                  aria-label={copy.choosePreviewCity}
                >
                  {CITIES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {cityName(option, locale)}
                    </option>
                  ))}
                </select>
              </label>
              {prayerCard(day, loading, failed, locale, copy)}
            </section>
          </div>
        </section>

        <section id="features" className="features section-wrap">
          <div className="features-heading" data-reveal="up">
            <div>
              <p className="eyebrow eyebrow-dark">
                <span /> {copy.featuresEyebrow}
              </p>
              <h2>{copy.featuresTitle}</h2>
            </div>
            <p>{copy.featuresIntro}</p>
          </div>

          <div className="feature-comparison" aria-label={copy.featuresTitle} data-reveal="up">
            <div>
              <span>{copy.beforeLabel}</span>
              <p>{copy.beforeText}</p>
            </div>
            <div className="is-now">
              <span>{copy.nowLabel}</span>
              <p>{copy.nowText}</p>
            </div>
          </div>

          <div className="feature-grid">
            {FEATURES[locale].map((feature, index) => (
              <article key={index} data-reveal="up">
                <div className="feature-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <span>{feature.tag}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dayline" aria-label={copy.prayerPath}>
          <p data-reveal="up">
            {copy.daylineLead} <span>{copy.daylineAccent}</span>
          </p>
          <div className="dayline-track" data-reveal="up">
            {PRAYER_KEYS.map((key) => (
              <span key={key}>{prayerName(key, locale)}</span>
            ))}
          </div>
        </section>

        <section id="method" className="method section-wrap">
          <div className="method-intro" data-reveal="up">
            <p className="eyebrow eyebrow-dark">
              <span /> {copy.methodEyebrow}
            </p>
            <h2>{copy.methodLead}</h2>
            <p>{copy.methodBody}</p>
          </div>
          <div className="verification-list" data-reveal="up">
            <article>
              <PinIcon />
              <div>
                <span>{copy.coordinateTitle}</span>
                <p>{copy.coordinateBody}</p>
              </div>
            </article>
            <article>
              <CheckIcon />
              <div>
                <span>{copy.dateTitle}</span>
                <p>{copy.dateBody}</p>
              </div>
            </article>
            <article>
              <ShieldIcon />
              <div>
                <span>{copy.methodTitle}</span>
                <p>{copy.methodBodyCard}</p>
              </div>
            </article>
          </div>
        </section>

        <section id="privacy" className="privacy section-wrap">
          <div className="privacy-symbol" aria-hidden="true" data-reveal="scale">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div data-reveal="up">
            <p className="eyebrow">
              <span /> {copy.privacyEyebrow}
            </p>
            <h2>{copy.privacyLead}</h2>
            <p>{copy.privacyBody}</p>
          </div>
        </section>

        <section className="ayah-section section-wrap">
          <div data-reveal="up">
            <p className="eyebrow eyebrow-dark">
              <span /> {copy.verseEyebrow}
            </p>
            <h2>{copy.verseLead}</h2>
          </div>
          <blockquote data-reveal="up">
            {ayah ? (
              <>
                <p lang="ar" dir="rtl">
                  ﴿{ayah.text}﴾
                </p>
                <cite>
                  {locale === "en" && ayah.surah.englishName
                    ? ayah.surah.englishName
                    : ayah.surah.name}{" "}
                  · {copy.verseNumber} {ayah.numberInSurah}
                </cite>
              </>
            ) : (
              <>
                <p>{copy.verseUnavailable}</p>
                <cite>{copy.originalArabic}</cite>
              </>
            )}
          </blockquote>
        </section>

        <section className="closing section-wrap" data-reveal="scale">
          <p className="eyebrow">
            <span /> {copy.closingEyebrow}
          </p>
          <h2>
            {locale === "ar" ? (
              <>
                افتح الويب.
                <br />
                <em>وفعّل التنبيهات مجانًا.</em>
              </>
            ) : (
              <>
                Open the web app.
                <br />
                <em>Enable free alerts.</em>
              </>
            )}
          </h2>
          <a className="button button-primary" href={TODAY_URL}>
            {copy.useOnWeb} <ArrowIcon />
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <a className="site-brand" href="#top">
          <BrandMark />
          <span>{copy.appName}</span>
        </a>
        <span>{copy.footer}</span>
        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
