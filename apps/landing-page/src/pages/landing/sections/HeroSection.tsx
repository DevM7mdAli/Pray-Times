import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { CITIES, cityById, cityName, localDateFor } from "@pray-times/core";
import { Eyebrow } from "../../../components/Eyebrow";
import { Reveal } from "../../../components/Reveal";
import { Shell } from "../../../components/Shell";
import { ArrowIcon, BrandMark, CheckIcon } from "../../../components/icons";
import { useLocale } from "../../../i18n/useLocale";
import { EXTENSION_URL } from "../../../lib/urls";
import { prayerDayQuery } from "../../../queries/prayerDay";
import { TODAY_ROUTE } from "../../../routes";
import { BUTTON_PRIMARY, HEADING } from "../../../styles/tokens";
import { PrayerPreviewCard } from "../components/PrayerPreviewCard";

export function HeroSection() {
  const { t } = useTranslation(["landing", "common"]);
  const locale = useLocale();
  // The previewed city is the hero's own concern; nothing else on the page
  // reads it, and it is deliberately not persisted like the dashboard's.
  const [cityId, setCityId] = useState("riyadh");
  const city = useMemo(() => cityById(cityId) ?? CITIES[0]!, [cityId]);
  const prayerDay = useQuery(prayerDayQuery(city, localDateFor(city.timeZone)));

  return (
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
          <Link className={BUTTON_PRIMARY} to={TODAY_ROUTE}>
            {t("useOnWeb")} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
          </Link>
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
  );
}
