import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import {
  CITIES,
  PRAYER_KEYS,
  cityById,
  cityName,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  localDateFor,
  nextPrayerFor,
  prayerKeysForCity,
  prayerMethodName,
  prayerName,
  prayerNameForCity,
  type PrayerDay,
} from "@pray-times/core";
import { useDocumentLocale, useLocale, useToggleLocale } from "./i18n/useLocale";
import { ayahQuery } from "./queries/ayah";
import { prayerDayQuery } from "./queries/prayerDay";
import { AyahQuote } from "./components/AyahQuote";
import { Eyebrow } from "./components/Eyebrow";
import { Reveal } from "./components/Reveal";
import { Shell } from "./components/Shell";
import { ArrowIcon, BrandMark, CheckIcon, PinIcon, ShieldIcon } from "./components/icons";
import { EXTENSION_URL, REPOSITORY_URL, TODAY_PATH } from "./lib/urls";
import { BUTTON, BUTTON_PRIMARY, HEADING } from "./styles/tokens";

/** The extension preview inside the hero, showing one city's day. */
function PrayerPreviewCard({
  day,
  loading,
  failed,
}: {
  day: PrayerDay | undefined;
  loading: boolean;
  failed: boolean;
}) {
  const { t } = useTranslation(["landing", "common"]);
  const locale = useLocale();

  if (loading) {
    return (
      <div className="grid min-h-[250px] place-content-center justify-items-center text-center text-muted">
        <span className="size-[38px] rotate-45 animate-[float_2.6s_ease-in-out_infinite] rounded-orb border-8 border-sama" />
        <p className="mb-0.75 mt-3 font-display text-15 text-nur">{t("loadingDay")}</p>
      </div>
    );
  }
  if (failed || !day) {
    return (
      <div className="grid min-h-[250px] place-content-center justify-items-center text-center text-muted">
        <span className="size-[38px] rotate-45 rounded-orb border-8 border-fajr" />
        <p className="mb-0.75 mt-3 font-display text-15 text-nur">{t("unavailableTimes")}</p>
        <span className="text-11">{t("doNotShowUnverified")}</span>
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
          {next.isTomorrow ? t("common:nextPrayerTomorrow") : t("common:nextPrayer")}
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
          {t("common:remaining")} {formatRemainingTime(next.minutesUntil, locale)}
        </p>
      </div>
      <div
        className="relative mt-[18px] grid grid-cols-5 gap-0.75 before:absolute before:inset-x-2 before:top-[7px] before:z-0 before:h-0.5 before:bg-[image:linear-gradient(90deg,theme(colors.fajr.DEFAULT),theme(colors.sama),theme(colors.raml.DEFAULT))] before:opacity-75 before:content-['']"
        aria-label={t("prayerPath")}
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
        {prayerMethodName(day.method, locale)} · {t("verifiedNow")}
      </p>
    </>
  );
}

export function App() {
  const { t } = useTranslation(["landing", "common"]);
  const locale = useLocale();
  const toggleLocale = useToggleLocale();
  const [cityId, setCityId] = useState("riyadh");

  const city = useMemo(() => cityById(cityId) ?? CITIES[0]!, [cityId]);

  useDocumentLocale({ title: t("documentTitle"), description: t("documentDescription") });

  const prayerDay = useQuery(prayerDayQuery(city, localDateFor(city.timeZone)));
  const ayah = useQuery(ayahQuery());

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
          aria-label={t("homeLabel")}
        >
          <BrandMark className="size-[34px] rounded-10 shadow-[0_6px_15px_rgba(11,23,54,0.18)]" />
          <span>{t("common:appName")}</span>
        </a>
        <nav
          className="flex items-center gap-6 text-13 text-ink max-tablet:hidden"
          aria-label={t("navigationLabel")}
        >
          <a className="hover:text-fajr" href="#features">
            {t("featuresNav")}
          </a>
          <a className="hover:text-fajr" href="#method">
            {t("verificationNav")}
          </a>
          <a className="hover:text-fajr" href="#privacy">
            {t("privacyNav")}
          </a>
        </nav>
        <div className="flex items-center gap-3.5 max-mobile:gap-2">
          <button
            className="inline-grid size-11 cursor-pointer place-items-center rounded-13 border border-line-strong bg-transparent font-display text-13 font-bold text-layl transition-[color,border-color,background] duration-200 hover:border-layl hover:bg-layl hover:text-nur max-mobile:size-10 max-mobile:rounded-xl"
            type="button"
            onClick={toggleLocale}
            aria-label={t("common:switchLanguage")}
          >
            {t("languageShort")}
          </button>
          <a
            className={`${BUTTON} bg-layl text-nur max-mobile:px-3 max-mobile:text-11`}
            href={TODAY_PATH}
          >
            {t("useOnWeb")} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
          </a>
        </div>
      </Reveal>

      <main id="top">
        <Shell className="grid min-h-[650px] grid-cols-[0.94fr_1.06fr] items-center gap-[clamp(45px,8vw,100px)] pb-[85px] pt-[65px] max-tablet:grid-cols-1 max-tablet:pb-20 max-tablet:pt-[50px]">
          <Reveal delay={110}>
            <Eyebrow tone="raml">{t("heroEyebrow")}</Eyebrow>
            <h1 className={`${HEADING} text-display-xl text-layl`}>
              <Trans
                ns="landing"
                i18nKey="heroTitle"
                components={{ br: <br />, accent: <em className="not-italic text-fajr" /> }}
              />
            </h1>
            <p className="mb-0 mt-6 max-w-[505px] text-17 leading-[1.9] text-ink max-mobile:text-15">
              {t("heroLead")}
            </p>
            <div className="mt-[31px] flex flex-wrap items-center gap-[21px]">
              <a className={BUTTON_PRIMARY} href={TODAY_PATH}>
                {t("useOnWeb")} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
              </a>
              <a
                className="border-b border-line-strong text-13 font-extrabold text-layl transition-colors duration-200 hover:text-fajr"
                href={EXTENSION_URL}
                target="_blank"
                rel="noreferrer"
              >
                {t("getExtension")}
              </a>
            </div>
            <p className="mb-0 mt-5 inline-flex items-center gap-[7px] text-xs text-ink-faint">
              <CheckIcon className="size-[15px] stroke-sama stroke-[2.2]" /> {t("localOnly")}
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
              aria-label={t("livePreview")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-display text-sm font-bold">
                  <BrandMark className="size-[37px] rounded-11" />
                  <span>
                    <small className="mb-0.5 block font-[inherit] text-10 tracking-[0.08em] text-raml">
                      {t("brandKicker")}
                    </small>
                    {t("common:appName")}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-10 text-nur/85 before:block before:size-1.5 before:animate-live-pulse before:rounded-full before:bg-fajr before:shadow-[0_0_0_4px_rgba(233,128,110,0.13)] before:content-['']">
                  {t("liveLabel")}
                </span>
              </div>
              <label className="mt-5 flex items-center justify-between gap-[15px] rounded-13 border border-nur/[0.12] bg-layl-soft/[0.65] px-3 py-2.5 text-11 text-muted">
                {t("common:city")}
                <select
                  className="min-w-28 cursor-pointer border-0 bg-transparent text-start font-extrabold text-nur"
                  value={cityId}
                  onChange={(event) => setCityId(event.target.value)}
                  aria-label={t("choosePreviewCity")}
                >
                  {CITIES.map((option) => (
                    <option className="bg-layl-soft" key={option.id} value={option.id}>
                      {cityName(option, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <PrayerPreviewCard
                day={prayerDay.data}
                loading={prayerDay.isPending}
                failed={prayerDay.isError}
              />
            </section>
          </Reveal>
        </Shell>

        <Shell
          id="features"
          className="pb-[115px] pt-[125px] max-tablet:pb-20 max-tablet:pt-[90px] max-mobile:pb-[65px] max-mobile:pt-[75px]"
        >
          <Reveal className="grid grid-cols-[1fr_0.82fr] items-end gap-[clamp(40px,8vw,110px)] max-tablet:grid-cols-1 max-tablet:gap-7">
            <div>
              <Eyebrow tone="fajr">{t("featuresEyebrow")}</Eyebrow>
              <h2 className={`${HEADING} max-w-[650px] text-display-lg text-layl`}>
                {t("featuresTitle")}
              </h2>
            </div>
            <p className="m-0 max-w-[480px] text-15 leading-[1.9] text-ink-soft">
              {t("featuresIntro")}
            </p>
          </Reveal>

          <Reveal
            delay={90}
            className="mt-[54px] grid grid-cols-[0.78fr_1.22fr] gap-px overflow-hidden rounded-22 border border-line bg-line max-mobile:mt-[38px] max-mobile:grid-cols-1"
            aria-label={t("featuresTitle")}
          >
            <div className="min-h-[135px] bg-surface-panel px-7.5 py-[26px]">
              <span className="text-10 font-extrabold uppercase tracking-[0.08em] text-fajr">
                {t("beforeLabel")}
              </span>
              <p className="mb-0 mt-[9px] max-w-[620px] font-display text-15 font-semibold leading-[1.7] text-ink">
                {t("beforeText")}
              </p>
            </div>
            <div className="min-h-[135px] bg-layl-soft bg-[image:radial-gradient(circle_at_85%_-40%,rgba(77,168,218,0.42),transparent_43%)] px-7.5 py-[26px] text-nur">
              <span className="text-10 font-extrabold uppercase tracking-[0.08em] text-raml">
                {t("nowLabel")}
              </span>
              <p className="mb-0 mt-[9px] max-w-[620px] font-display text-15 font-semibold leading-[1.7] text-nur/90">
                {t("nowText")}
              </p>
            </div>
          </Reveal>

          <div className="mt-4 grid grid-cols-3 gap-[15px] max-tablet:grid-cols-2 max-mobile:grid-cols-1">
            {t("features", { returnObjects: true }).map((feature, index) => (
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
          aria-label={t("prayerPath")}
        >
          <Reveal as="p" className="m-0 font-display text-xl font-bold max-mobile:text-17">
            {t("daylineLead")} <span className="text-raml">{t("daylineAccent")}</span>
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
            <Eyebrow tone="fajr">{t("methodEyebrow")}</Eyebrow>
            <h2 className={`${HEADING} text-display-lg text-layl`}>{t("methodLead")}</h2>
            <p className="mb-0 mt-[22px] max-w-[420px] leading-[1.9] text-ink-soft">
              {t("methodBody")}
            </p>
          </Reveal>
          <Reveal delay={90} className="border-t border-line">
            <article className="grid grid-cols-[44px_1fr] gap-4 border-b border-line py-[25px]">
              <PinIcon className="size-[33px] rounded-11 bg-surface-chip stroke-[1.7] p-[7px] text-layl" />
              <div>
                <span className="font-display text-15 font-bold text-layl">
                  {t("coordinateTitle")}
                </span>
                <p className="mb-0 mt-1.5 text-13 leading-[1.8] text-ink-faint">
                  {t("coordinateBody")}
                </p>
              </div>
            </article>
            <article className="grid grid-cols-[44px_1fr] gap-4 border-b border-line py-[25px]">
              <CheckIcon className="size-[33px] rounded-11 bg-surface-chip stroke-[1.7] p-[7px] text-layl" />
              <div>
                <span className="font-display text-15 font-bold text-layl">{t("dateTitle")}</span>
                <p className="mb-0 mt-1.5 text-13 leading-[1.8] text-ink-faint">{t("dateBody")}</p>
              </div>
            </article>
            <article className="grid grid-cols-[44px_1fr] gap-4 border-b border-line py-[25px]">
              <ShieldIcon className="size-[33px] rounded-11 bg-surface-chip stroke-[1.7] p-[7px] text-layl" />
              <div>
                <span className="font-display text-15 font-bold text-layl">{t("methodTitle")}</span>
                <p className="mb-0 mt-1.5 text-13 leading-[1.8] text-ink-faint">
                  {t("methodBodyCard")}
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
            <Eyebrow tone="raml">{t("privacyEyebrow")}</Eyebrow>
            <h2 className={`${HEADING} text-display-lg text-nur`}>{t("privacyLead")}</h2>
            <p className="mb-0 mt-[22px] max-w-[420px] leading-[1.9] text-nur/85">
              {t("privacyBody")}
            </p>
          </Reveal>
        </Shell>

        <Shell className="grid grid-cols-[0.8fr_1.2fr] items-center gap-[100px] py-[135px] max-tablet:grid-cols-1 max-tablet:gap-[45px] max-tablet:py-[85px] max-mobile:py-[70px]">
          <Reveal delay={110}>
            <Eyebrow tone="fajr">{t("verseEyebrow")}</Eyebrow>
            <h2 className={`${HEADING} text-display-lg text-layl`}>{t("verseLead")}</h2>
          </Reveal>
          <Reveal
            as="blockquote"
            delay={90}
            className="m-0 border-s-2 border-raml ps-[35px] max-mobile:ps-[22px]"
          >
            {ayah.data ? (
              <AyahQuote ayah={ayah.data} className="text-layl-soft" />
            ) : (
              <>
                <p className="m-0 font-body text-display-sm text-layl-soft">
                  {t("verseUnavailable")}
                </p>
                <cite className="mt-3 block font-display text-xs font-bold not-italic text-fajr">
                  {t("originalArabic")}
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
          <Eyebrow tone="raml">{t("closingEyebrow")}</Eyebrow>
          <h2 className={`${HEADING} max-w-[650px] text-display-xl text-nur`}>
            <Trans
              ns="landing"
              i18nKey="closingTitle"
              components={{ br: <br />, accent: <em className="not-italic text-fajr" /> }}
            />
          </h2>
          <a className={`${BUTTON_PRIMARY} mt-8`} href={TODAY_PATH}>
            {t("useOnWeb")} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
          </a>
        </Reveal>
      </main>

      <footer className="flex items-center justify-between gap-5 border-t border-nur/10 bg-layl px-[max(24px,calc((100vw-1160px)/2))] py-[28px] text-xs text-muted max-mobile:flex-wrap max-mobile:px-4">
        <a
          className="inline-flex items-center gap-2.5 font-display text-13 font-bold text-nur"
          href="#top"
        >
          <BrandMark className="size-[27px] rounded-lg shadow-[0_6px_15px_rgba(11,23,54,0.18)]" />
          <span>{t("common:appName")}</span>
        </a>
        <span>{t("footer")}</span>
        <a className="hover:text-raml" href={REPOSITORY_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
