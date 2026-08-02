import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { CITIES, cityById, localDateFor } from "@pray-times/core";
import { Eyebrow } from "../../../components/Eyebrow";
import { Reveal } from "../../../components/Reveal";
import { Shell } from "../../../components/Shell";
import { ArrowIcon, CheckIcon } from "../../../components/icons";
import { prayerDayQuery } from "../../../queries/prayerDay";
import { TODAY_ROUTE } from "../../../routes";
import { BUTTON_PRIMARY, HEADING } from "../../../styles/tokens";
import { MobileProductVisual } from "../components/MobileProductVisual";

export function HeroSection() {
  const { t } = useTranslation("landing");
  const [cityId, setCityId] = useState("riyadh");
  const city = useMemo(() => cityById(cityId) ?? CITIES[0]!, [cityId]);
  const prayerDay = useQuery(prayerDayQuery(city, localDateFor(city.timeZone)));

  return (
    <Shell className="grid min-h-[760px] grid-cols-[0.9fr_1.1fr] items-center gap-[clamp(45px,7vw,90px)] pb-[85px] pt-[45px] max-tablet:grid-cols-1 max-tablet:pb-20 max-tablet:pt-[50px]">
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
          <a className={BUTTON_PRIMARY} href="#features">
            {t("discoverApp")} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
          </a>
          <Link
            className="border-b border-line-strong text-13 font-extrabold text-layl transition-colors duration-200 hover:text-fajr"
            to={TODAY_ROUTE}
          >
            {t("useOnWeb")}
          </Link>
        </div>
        <p className="mb-0 mt-5 inline-flex items-center gap-[7px] text-xs text-ink-faint">
          <CheckIcon className="size-[15px] stroke-sama stroke-[2.2]" /> {t("localOnly")}
        </p>
      </Reveal>

      <Reveal variant="scale" delay={190} className="relative">
        <MobileProductVisual
          cityId={cityId}
          day={prayerDay.data}
          failed={prayerDay.isError}
          loading={prayerDay.isPending}
          onCityChange={setCityId}
        />
      </Reveal>
    </Shell>
  );
}
