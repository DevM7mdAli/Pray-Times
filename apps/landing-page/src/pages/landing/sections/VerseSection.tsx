import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AyahQuote } from "../../../components/AyahQuote";
import { Eyebrow } from "../../../components/Eyebrow";
import { Reveal } from "../../../components/Reveal";
import { Shell } from "../../../components/Shell";
import { ayahQuery } from "../../../queries/ayah";
import { HEADING } from "../../../styles/tokens";

export function VerseSection() {
  const { t } = useTranslation("landing");
  const ayah = useQuery(ayahQuery());

  return (
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
            <p className="m-0 font-body text-display-sm text-layl-soft">{t("verseUnavailable")}</p>
            <cite className="mt-3 block font-display text-xs font-bold not-italic text-fajr">
              {t("originalArabic")}
            </cite>
          </>
        )}
      </Reveal>
    </Shell>
  );
}
