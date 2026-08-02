import { Link } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import { Eyebrow } from "../../../components/Eyebrow";
import { Reveal } from "../../../components/Reveal";
import { ArrowIcon } from "../../../components/icons";
import { TODAY_ROUTE } from "../../../routes";
import { BUTTON_PRIMARY, HEADING } from "../../../styles/tokens";

export function ClosingSection() {
  const { t } = useTranslation("landing");

  return (
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
      <Link className={`${BUTTON_PRIMARY} mt-8`} to={TODAY_ROUTE}>
        {t("useOnWeb")} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
      </Link>
    </Reveal>
  );
}
