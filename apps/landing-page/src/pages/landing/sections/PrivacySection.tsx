import { useTranslation } from "react-i18next";
import { Eyebrow } from "../../../components/Eyebrow";
import { Reveal } from "../../../components/Reveal";
import { Shell } from "../../../components/Shell";
import { HEADING } from "../../../styles/tokens";

const SIDE_DOT =
  "h-[11px] w-[11px] rounded-full border-[3px] border-layl-soft bg-raml shadow-[0_0_0_1px_theme(colors.raml.DEFAULT)]";

export function PrivacySection() {
  const { t } = useTranslation("landing");

  return (
    <Shell
      id="privacy"
      className="grid grid-cols-[255px_1fr] items-center gap-[90px] rounded-27 bg-layl-soft p-[70px] text-nur max-tablet:grid-cols-1 max-tablet:gap-7 max-tablet:px-[34px] max-tablet:py-[45px] max-mobile:rounded-21 max-mobile:px-6 max-mobile:py-[35px]"
    >
      <Reveal
        variant="scale"
        aria-hidden="true"
        className="relative flex h-[170px] items-end justify-center gap-2 before:absolute before:left-1/2 before:top-[10px] before:size-[84px] before:-translate-x-1/2 before:animate-compass-breathe before:rounded-t-[84px] before:border-[16px] before:border-b-0 before:border-sama before:content-[''] max-tablet:h-[120px] max-tablet:w-[200px] max-tablet:before:top-0"
      >
        <span className={SIDE_DOT} />
        <span className={SIDE_DOT} />
        <span className="mb-0.75 h-[15px] w-[15px] rounded-full border-[3px] border-layl-soft bg-fajr shadow-[0_0_0_5px_rgba(233,128,110,0.15)]" />
        <span className={SIDE_DOT} />
        <span className={SIDE_DOT} />
      </Reveal>
      <Reveal delay={90}>
        <Eyebrow tone="raml">{t("privacyEyebrow")}</Eyebrow>
        <h2 className={`${HEADING} text-display-lg text-nur`}>{t("privacyLead")}</h2>
        <p className="mb-0 mt-[22px] max-w-[420px] leading-[1.9] text-nur/85">{t("privacyBody")}</p>
      </Reveal>
    </Shell>
  );
}
