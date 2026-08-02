import { useTranslation } from "react-i18next";
import { PRAYER_KEYS, prayerName } from "@pray-times/core";
import { Reveal } from "../../../components/Reveal";
import { useLocale } from "../../../i18n/useLocale";

/** The full-bleed band showing the five prayers as one flowing path. */
export function DaylineSection() {
  const { t } = useTranslation("landing");
  const locale = useLocale();

  return (
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
  );
}
