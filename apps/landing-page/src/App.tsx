import { useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";
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
import { Reveal } from "./Reveal";

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

const ICON_BASE = "fill-none stroke-current";

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${ICON_BASE} ${className}`}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${ICON_BASE} ${className}`}>
      <path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Zm0 6v5m0 3h.01" />
    </svg>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${ICON_BASE} ${className}`}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 6Z" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${ICON_BASE} ${className}`}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

/** Page-content column, shared by every top-level section. */
function Shell({
  as: Tag = "section",
  className = "",
  children,
  ...rest
}: {
  as?: "section" | "header";
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Tag className={`mx-auto w-shell max-mobile:w-[calc(100%-32px)] ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Small all-caps label above a section heading, with its leading hairline. */
function Eyebrow({ tone, children }: { tone: "raml" | "fajr"; children: ReactNode }) {
  return (
    <p
      className={`mb-[18px] mt-0 flex items-center gap-[9px] text-11 font-extrabold tracking-[0.075em] ${
        tone === "raml" ? "text-raml" : "text-fajr"
      }`}
    >
      <span
        className="block h-px w-7 bg-[image:linear-gradient(90deg,transparent,currentColor)]"
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

const HEADING = "m-0 font-display font-bold tracking-[-0.045em]";
const BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-13 px-[15px] py-2.5 text-13 font-extrabold transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:shadow-lift";
const BUTTON_PRIMARY = `${BUTTON} bg-raml text-layl shadow-[inset_0_1px_rgba(255,255,255,0.55),0_8px_18px_rgba(235,194,118,0.25)]`;

function prayerCard(
  day: PrayerDay | undefined,
  loading: boolean,
  failed: boolean,
  locale: SupportedLocale,
  copy: Copy
) {
  if (loading) {
    return (
      <div className="grid min-h-[250px] place-content-center justify-items-center text-center text-muted">
        <span className="size-[38px] rotate-45 animate-[float_2.6s_ease-in-out_infinite] rounded-orb border-8 border-sama" />
        <p className="mb-0.75 mt-3 font-display text-15 text-nur">{copy.loadingDay}</p>
      </div>
    );
  }
  if (failed || !day) {
    return (
      <div className="grid min-h-[250px] place-content-center justify-items-center text-center text-muted">
        <span className="size-[38px] rotate-45 rounded-orb border-8 border-fajr" />
        <p className="mb-0.75 mt-3 font-display text-15 text-nur">{copy.unavailableTimes}</p>
        <span className="text-11">{copy.doNotShowUnverified}</span>
      </div>
    );
  }
  const next = nextPrayerFor(day);
  return (
    <>
      <div className="mt-[15px] text-11 text-muted">
        {cityName(day.city, locale)} · {formatHijriDate(day.hijri, locale)}
      </div>
      <div className="mt-2.5 rounded-20 border border-sama/[0.45] bg-sama/[0.12] p-[18px]">
        <span className="text-11 font-extrabold text-raml">
          {next.isTomorrow ? copy.nextPrayerTomorrow : copy.nextPrayer}
        </span>
        <div className="mt-[7px] flex items-baseline justify-between gap-[13px]">
          <strong className="font-display text-27">
            {prayerNameForCity(next.key, day.city, locale)}
          </strong>
          <time className="font-display text-29 font-bold tabular-nums -tracking-wider">
            {formatPrayerTime(next.time, locale)}
          </time>
        </div>
        <p className="mb-0 mt-[9px] text-11 text-muted">
          {copy.remaining} {formatRemainingTime(next.minutesUntil, locale)}
        </p>
      </div>
      <div
        className="relative mt-[18px] grid grid-cols-5 gap-0.75 before:absolute before:inset-x-2 before:top-[7px] before:z-0 before:h-0.5 before:bg-[image:linear-gradient(90deg,theme(colors.fajr.DEFAULT),theme(colors.sama),theme(colors.raml.DEFAULT))] before:opacity-75 before:content-['']"
        aria-label={copy.prayerPath}
      >
        {prayerKeysForCity(day.city).map((key) => {
          const isCurrent = key === next.key;
          return (
            <div
              className={
                isCurrent
                  ? "z-1 relative grid justify-items-center gap-1.25 text-center text-10 font-extrabold text-nur max-mobile:text-[8px]"
                  : "z-1 relative grid justify-items-center gap-1.25 text-center text-10 text-muted max-mobile:text-[8px]"
              }
              key={key}
            >
              <i
                aria-hidden="true"
                className={
                  isCurrent
                    ? "-mt-0.75 h-[13px] w-[13px] rounded-full border-raml bg-fajr shadow-[0_0_0_4px_rgba(233,128,110,0.18)]"
                    : "size-2 rounded-full border-2 border-layl-soft bg-sama shadow-[0_0_0_1px_rgba(77,168,218,0.6)]"
                }
              />
              <span>{prayerNameForCity(key, day.city, locale)}</span>
              <time className="tabular-nums">{formatPrayerTime(day.timings[key], locale)}</time>
            </div>
          );
        })}
      </div>
      <p className="mb-0 mt-[15px] border-t border-nur/10 pt-[11px] text-10 text-muted">
        {prayerMethodName(day.method, locale)} · {copy.verifiedNow}
      </p>
    </>
  );
}

export function App() {
  const [locale, setLocale] = useState<SupportedLocale>(initialLocale);
  const [cityId, setCityId] = useState("riyadh");
  const [day, setDay] = useState<PrayerDay>();
  const [ayah, setAyah] = useState<Ayah>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const copy = COPY[locale];
  const city = useMemo(() => cityById(cityId) ?? CITIES[0], [cityId]);

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
    <div className="overflow-hidden bg-nur antialiased">
      <Reveal
        as="header"
        variant="down"
        delay={30}
        className="relative z-[5] mx-auto flex min-h-[85px] w-shell items-center justify-between gap-5 max-mobile:min-h-[72px] max-mobile:w-[calc(100%-32px)]"
      >
        <a
          className="inline-flex items-center gap-2.5 font-display text-base font-bold"
          href="#top"
          aria-label={copy.homeLabel}
        >
          <BrandMark className="size-[34px] rounded-10 shadow-[0_6px_15px_rgba(11,23,54,0.18)]" />
          <span>{copy.appName}</span>
        </a>
        <nav
          className="flex items-center gap-6 text-13 text-ink max-tablet:hidden"
          aria-label={copy.navigationLabel}
        >
          <a className="hover:text-fajr" href="#features">
            {copy.featuresNav}
          </a>
          <a className="hover:text-fajr" href="#method">
            {copy.verificationNav}
          </a>
          <a className="hover:text-fajr" href="#privacy">
            {copy.privacyNav}
          </a>
        </nav>
        <div className="flex items-center gap-3.5 max-mobile:gap-2">
          <button
            className="inline-grid size-11 cursor-pointer place-items-center rounded-13 border border-line-strong bg-transparent font-display text-13 font-bold text-layl transition-[color,border-color,background] duration-200 hover:border-layl hover:bg-layl hover:text-nur max-mobile:size-10 max-mobile:rounded-xl"
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            aria-label={copy.switchLanguage}
          >
            {copy.languageShort}
          </button>
          <a
            className={`${BUTTON} bg-layl text-nur max-mobile:px-3 max-mobile:text-11`}
            href={TODAY_URL}
          >
            {copy.useOnWeb} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
          </a>
        </div>
      </Reveal>

      <main id="top">
        <Shell className="grid min-h-[650px] grid-cols-[0.94fr_1.06fr] items-center gap-[clamp(45px,8vw,100px)] pb-[85px] pt-[65px] max-tablet:grid-cols-1 max-tablet:pb-20 max-tablet:pt-[50px]">
          <Reveal delay={110}>
            <Eyebrow tone="raml">{copy.heroEyebrow}</Eyebrow>
            <h1 className={`${HEADING} text-display-xl text-layl`}>
              {locale === "ar" ? (
                <>
                  اعرف الصلاة القادمة،
                  <br />
                  <em className="not-italic text-fajr">بثقة.</em>
                </>
              ) : (
                <>
                  Know the next prayer,
                  <br />
                  <em className="not-italic text-fajr">with confidence.</em>
                </>
              )}
            </h1>
            <p className="mb-0 mt-6 max-w-[505px] text-17 leading-[1.9] text-ink max-mobile:text-15">
              {copy.heroLead}
            </p>
            <div className="mt-[31px] flex flex-wrap items-center gap-[21px]">
              <a className={BUTTON_PRIMARY} href={TODAY_URL}>
                {copy.useOnWeb} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
              </a>
              <a
                className="border-b border-line-strong text-13 font-extrabold text-layl transition-colors duration-200 hover:text-fajr"
                href={EXTENSION_URL}
                target="_blank"
                rel="noreferrer"
              >
                {copy.getExtension}
              </a>
            </div>
            <p className="mb-0 mt-5 inline-flex items-center gap-[7px] text-xs text-ink-faint">
              <CheckIcon className="size-[15px] stroke-sama stroke-[2.2]" /> {copy.localOnly}
            </p>
          </Reveal>

          <Reveal
            variant="scale"
            delay={190}
            className="relative w-[min(100%,493px)] justify-self-end max-tablet:justify-self-start"
          >
            <div
              className="absolute inset-x-[-12%] bottom-[-8%] top-[8%] z-0 animate-aura-breathe rounded-full bg-[image:radial-gradient(ellipse,rgba(77,168,218,0.23),transparent_66%)] blur-lg"
              aria-hidden="true"
            />
            <section
              className="relative z-[1] min-h-[440px] overflow-hidden rounded-[28px] border border-nur/[0.18] bg-layl bg-[image:radial-gradient(circle_at_50%_-15%,rgba(77,168,218,0.33),transparent_36%),linear-gradient(150deg,theme(colors.layl.lift),theme(colors.layl.DEFAULT)_61%)] p-[22px] text-nur shadow-[0_35px_70px_-34px_rgba(11,23,54,0.52),inset_0_1px_rgba(255,255,255,0.13)] max-mobile:min-h-[416px] max-mobile:rounded-22 max-mobile:p-[17px]"
              aria-label={copy.livePreview}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-display text-sm font-bold">
                  <BrandMark className="size-[37px] rounded-11" />
                  <span>
                    <small className="mb-0.5 block font-[inherit] text-10 tracking-[0.08em] text-raml">
                      {copy.brandKicker}
                    </small>
                    {copy.appName}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-10 text-nur/85 before:block before:size-1.5 before:animate-live-pulse before:rounded-full before:bg-fajr before:shadow-[0_0_0_4px_rgba(233,128,110,0.13)] before:content-['']">
                  {copy.liveLabel}
                </span>
              </div>
              <label className="mt-5 flex items-center justify-between gap-[15px] rounded-13 border border-nur/[0.12] bg-layl-soft/[0.65] px-3 py-2.5 text-11 text-muted">
                {copy.city}
                <select
                  className="min-w-28 cursor-pointer border-0 bg-transparent text-start font-extrabold text-nur"
                  value={cityId}
                  onChange={(event) => setCityId(event.target.value)}
                  aria-label={copy.choosePreviewCity}
                >
                  {CITIES.map((option) => (
                    <option className="bg-layl-soft" key={option.id} value={option.id}>
                      {cityName(option, locale)}
                    </option>
                  ))}
                </select>
              </label>
              {prayerCard(day, loading, failed, locale, copy)}
            </section>
          </Reveal>
        </Shell>

        <Shell
          id="features"
          className="pb-[115px] pt-[125px] max-tablet:pb-20 max-tablet:pt-[90px] max-mobile:pb-[65px] max-mobile:pt-[75px]"
        >
          <Reveal className="grid grid-cols-[1fr_0.82fr] items-end gap-[clamp(40px,8vw,110px)] max-tablet:grid-cols-1 max-tablet:gap-7">
            <div>
              <Eyebrow tone="fajr">{copy.featuresEyebrow}</Eyebrow>
              <h2 className={`${HEADING} max-w-[650px] text-display-lg text-layl`}>
                {copy.featuresTitle}
              </h2>
            </div>
            <p className="m-0 max-w-[480px] text-15 leading-[1.9] text-ink-soft">
              {copy.featuresIntro}
            </p>
          </Reveal>

          <Reveal
            delay={90}
            className="mt-[54px] grid grid-cols-[0.78fr_1.22fr] gap-px overflow-hidden rounded-22 border border-line bg-line max-mobile:mt-[38px] max-mobile:grid-cols-1"
            aria-label={copy.featuresTitle}
          >
            <div className="min-h-[135px] bg-surface-panel px-7.5 py-[26px]">
              <span className="text-10 font-extrabold uppercase tracking-[0.08em] text-fajr">
                {copy.beforeLabel}
              </span>
              <p className="mb-0 mt-[9px] max-w-[620px] font-display text-15 font-semibold leading-[1.7] text-ink">
                {copy.beforeText}
              </p>
            </div>
            <div className="min-h-[135px] bg-layl-soft bg-[image:radial-gradient(circle_at_85%_-40%,rgba(77,168,218,0.42),transparent_43%)] px-7.5 py-[26px] text-nur">
              <span className="text-10 font-extrabold uppercase tracking-[0.08em] text-raml">
                {copy.nowLabel}
              </span>
              <p className="mb-0 mt-[9px] max-w-[620px] font-display text-15 font-semibold leading-[1.7] text-nur/90">
                {copy.nowText}
              </p>
            </div>
          </Reveal>

          <div className="mt-4 grid grid-cols-3 gap-[15px] max-tablet:grid-cols-2 max-mobile:grid-cols-1">
            {FEATURES[locale].map((feature, index) => (
              <Reveal key={index} delay={index % 3 === 1 ? 70 : index % 3 === 2 ? 140 : 0}>
                <article className="group relative h-full min-h-[260px] overflow-hidden rounded-20 border border-line bg-white/[0.62] p-7.5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.75 hover:border-line-hover hover:shadow-[0_18px_35px_-28px_rgba(11,23,54,0.58)] max-mobile:min-h-0 max-mobile:p-[25px]">
                  <div
                    className="mb-7.5 grid size-[42px] place-items-center rounded-13 border border-line-soft bg-surface-chip font-display text-11 font-bold text-layl transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-rotate-3 rtl:group-hover:rotate-3"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <span className="text-10 font-extrabold uppercase tracking-[0.08em] text-fajr">
                    {feature.tag}
                  </span>
                  <h3 className="mb-0 mt-[11px] font-display text-19 leading-[1.45] text-layl">
                    {feature.title}
                  </h3>
                  <p className="mb-0 mt-[11px] text-13 leading-[1.8] text-ink-faint">
                    {feature.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </Shell>

        <section
          className="grid min-h-[125px] grid-cols-[0.8fr_1.2fr] items-center bg-layl px-[max(24px,calc((100vw-1160px)/2))] text-nur max-tablet:grid-cols-1 max-tablet:gap-[22px] max-tablet:py-8 max-mobile:px-4"
          aria-label={copy.prayerPath}
        >
          <Reveal as="p" className="m-0 font-display text-xl font-bold max-mobile:text-17">
            {copy.daylineLead} <span className="text-raml">{copy.daylineAccent}</span>
          </Reveal>
          <Reveal
            delay={90}
            className="relative grid grid-cols-5 gap-1 pt-[21px] before:absolute before:inset-x-0 before:top-[7px] before:h-0.5 before:animate-path-flow before:bg-[image:linear-gradient(90deg,theme(colors.fajr.DEFAULT),theme(colors.sama)_53%,theme(colors.raml.DEFAULT))] before:bg-[length:220%_100%] before:content-['']"
          >
            {PRAYER_KEYS.map((key) => (
              <span
                className="relative text-center text-11 text-nur/80 before:absolute before:end-[calc(50%-4px)] before:top-[-17px] before:size-2 before:rounded-full before:border-2 before:border-layl before:bg-sama before:content-[''] max-mobile:text-10"
                key={key}
              >
                {prayerName(key, locale)}
              </span>
            ))}
          </Reveal>
        </section>

        <Shell
          id="method"
          className="grid grid-cols-[0.9fr_1.1fr] gap-[95px] py-[130px] max-tablet:grid-cols-1 max-tablet:gap-[45px] max-tablet:py-[85px] max-mobile:py-[70px]"
        >
          <Reveal delay={110}>
            <Eyebrow tone="fajr">{copy.methodEyebrow}</Eyebrow>
            <h2 className={`${HEADING} text-display-lg text-layl`}>{copy.methodLead}</h2>
            <p className="mb-0 mt-[22px] max-w-[420px] leading-[1.9] text-ink-soft">
              {copy.methodBody}
            </p>
          </Reveal>
          <Reveal delay={90} className="border-t border-line">
            <article className="grid grid-cols-[44px_1fr] gap-4 border-b border-line py-[25px]">
              <PinIcon className="size-[33px] rounded-11 bg-surface-chip stroke-[1.7] p-[7px] text-layl" />
              <div>
                <span className="font-display text-15 font-bold text-layl">
                  {copy.coordinateTitle}
                </span>
                <p className="mb-0 mt-1.5 text-13 leading-[1.8] text-ink-faint">
                  {copy.coordinateBody}
                </p>
              </div>
            </article>
            <article className="grid grid-cols-[44px_1fr] gap-4 border-b border-line py-[25px]">
              <CheckIcon className="size-[33px] rounded-11 bg-surface-chip stroke-[1.7] p-[7px] text-layl" />
              <div>
                <span className="font-display text-15 font-bold text-layl">{copy.dateTitle}</span>
                <p className="mb-0 mt-1.5 text-13 leading-[1.8] text-ink-faint">{copy.dateBody}</p>
              </div>
            </article>
            <article className="grid grid-cols-[44px_1fr] gap-4 border-b border-line py-[25px]">
              <ShieldIcon className="size-[33px] rounded-11 bg-surface-chip stroke-[1.7] p-[7px] text-layl" />
              <div>
                <span className="font-display text-15 font-bold text-layl">{copy.methodTitle}</span>
                <p className="mb-0 mt-1.5 text-13 leading-[1.8] text-ink-faint">
                  {copy.methodBodyCard}
                </p>
              </div>
            </article>
          </Reveal>
        </Shell>

        <Shell
          id="privacy"
          className="grid grid-cols-[255px_1fr] items-center gap-[90px] rounded-27 bg-layl-soft p-[70px] text-nur max-tablet:grid-cols-1 max-tablet:gap-7 max-tablet:px-[34px] max-tablet:py-[45px] max-mobile:rounded-21 max-mobile:px-6 max-mobile:py-[35px]"
        >
          <Reveal
            variant="scale"
            aria-hidden="true"
            className="relative flex h-[170px] items-end justify-center gap-2 before:absolute before:left-1/2 before:top-[10px] before:size-[84px] before:-translate-x-1/2 before:animate-compass-breathe before:rounded-t-[84px] before:border-[16px] before:border-b-0 before:border-sama before:content-[''] max-tablet:h-[120px] max-tablet:w-[200px] max-tablet:before:top-0"
          >
            <span className="h-[11px] w-[11px] rounded-full border-[3px] border-layl-soft bg-raml shadow-[0_0_0_1px_theme(colors.raml.DEFAULT)]" />
            <span className="h-[11px] w-[11px] rounded-full border-[3px] border-layl-soft bg-raml shadow-[0_0_0_1px_theme(colors.raml.DEFAULT)]" />
            <span className="mb-0.75 h-[15px] w-[15px] rounded-full border-[3px] border-layl-soft bg-fajr shadow-[0_0_0_5px_rgba(233,128,110,0.15)]" />
            <span className="h-[11px] w-[11px] rounded-full border-[3px] border-layl-soft bg-raml shadow-[0_0_0_1px_theme(colors.raml.DEFAULT)]" />
            <span className="h-[11px] w-[11px] rounded-full border-[3px] border-layl-soft bg-raml shadow-[0_0_0_1px_theme(colors.raml.DEFAULT)]" />
          </Reveal>
          <Reveal delay={90}>
            <Eyebrow tone="raml">{copy.privacyEyebrow}</Eyebrow>
            <h2 className={`${HEADING} text-display-lg text-nur`}>{copy.privacyLead}</h2>
            <p className="mb-0 mt-[22px] max-w-[420px] leading-[1.9] text-nur/85">
              {copy.privacyBody}
            </p>
          </Reveal>
        </Shell>

        <Shell className="grid grid-cols-[0.8fr_1.2fr] items-center gap-[100px] py-[135px] max-tablet:grid-cols-1 max-tablet:gap-[45px] max-tablet:py-[85px] max-mobile:py-[70px]">
          <Reveal delay={110}>
            <Eyebrow tone="fajr">{copy.verseEyebrow}</Eyebrow>
            <h2 className={`${HEADING} text-display-lg text-layl`}>{copy.verseLead}</h2>
          </Reveal>
          <Reveal
            as="blockquote"
            delay={90}
            className="m-0 border-s-2 border-raml ps-[35px] max-mobile:ps-[22px]"
          >
            {ayah ? (
              <>
                <p className="m-0 font-quran text-display-md text-layl-soft" lang="ar" dir="rtl">
                  ﴿{ayah.text}﴾
                </p>
                <cite className="mt-3 block font-display text-xs font-bold not-italic text-fajr">
                  {locale === "en" && ayah.surah.englishName
                    ? ayah.surah.englishName
                    : ayah.surah.name}{" "}
                  · {copy.verseNumber} {ayah.numberInSurah}
                </cite>
              </>
            ) : (
              <>
                <p className="m-0 font-body text-display-sm text-layl-soft">
                  {copy.verseUnavailable}
                </p>
                <cite className="mt-3 block font-display text-xs font-bold not-italic text-fajr">
                  {copy.originalArabic}
                </cite>
              </>
            )}
          </Reveal>
        </Shell>

        <Reveal
          as="section"
          variant="scale"
          className="mx-auto grid w-shell justify-items-center rounded-[28px_28px_0_0] bg-layl bg-[image:radial-gradient(circle_at_50%_-50%,rgba(77,168,218,0.46),transparent_46%)] px-[25px] py-[125px] text-center text-nur max-mobile:w-[calc(100%-32px)]"
        >
          <Eyebrow tone="raml">{copy.closingEyebrow}</Eyebrow>
          <h2 className={`${HEADING} max-w-[650px] text-display-xl text-nur`}>
            {locale === "ar" ? (
              <>
                افتح الويب.
                <br />
                <em className="not-italic text-fajr">وفعّل التنبيهات مجانًا.</em>
              </>
            ) : (
              <>
                Open the web app.
                <br />
                <em className="not-italic text-fajr">Enable free alerts.</em>
              </>
            )}
          </h2>
          <a className={`${BUTTON_PRIMARY} mt-8`} href={TODAY_URL}>
            {copy.useOnWeb} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
          </a>
        </Reveal>
      </main>

      <footer className="flex items-center justify-between gap-5 border-t border-nur/10 bg-layl px-[max(24px,calc((100vw-1160px)/2))] py-[28px] text-xs text-muted max-mobile:flex-wrap max-mobile:px-4">
        <a
          className="inline-flex items-center gap-2.5 font-display text-13 font-bold text-nur"
          href="#top"
        >
          <BrandMark className="size-[27px] rounded-lg shadow-[0_6px_15px_rgba(11,23,54,0.18)]" />
          <span>{copy.appName}</span>
        </a>
        <span>{copy.footer}</span>
        <a className="hover:text-raml" href={REPOSITORY_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
