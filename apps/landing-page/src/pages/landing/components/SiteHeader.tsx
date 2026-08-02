import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Reveal } from "../../../components/Reveal";
import { ArrowIcon, BrandMark } from "../../../components/icons";
import { useToggleLocale } from "../../../i18n/useLocale";
import { TODAY_ROUTE } from "../../../routes";
import { BUTTON } from "../../../styles/tokens";

export function SiteHeader() {
  const { t } = useTranslation(["landing", "common"]);
  const toggleLocale = useToggleLocale();

  return (
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
        <Link
          className={`${BUTTON} bg-layl text-nur max-mobile:px-3 max-mobile:text-11`}
          to={TODAY_ROUTE}
        >
          {t("useOnWeb")} <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
        </Link>
      </div>
    </Reveal>
  );
}
