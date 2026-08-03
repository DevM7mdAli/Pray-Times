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
  const navigationItems = [
    { href: "#features", label: t("featuresNav") },
    { href: "#everywhere", label: t("everywhereNav") },
    { href: "#widget", label: t("widgetNav") },
    { href: "#method", label: t("verificationNav") },
    { href: "#privacy", label: t("privacyNav") },
  ];

  return (
    <Reveal
      as="header"
      variant="down"
      delay={30}
      className="sticky top-4 z-20 mx-auto mt-4 flex min-h-16 w-shell items-center justify-between gap-5 rounded-20 border border-line bg-nur/90 px-3 shadow-lg backdrop-blur-xl max-mobile:top-3 max-mobile:mt-3 max-mobile:w-[calc(100%-24px)] max-mobile:gap-3 max-mobile:px-2"
    >
      <a
        className="inline-flex shrink-0 items-center gap-2.5 font-display text-base font-bold"
        href="#top"
        aria-label={t("homeLabel")}
      >
        <BrandMark className="size-[34px] rounded-10 shadow-[0_6px_15px_rgba(11,23,54,0.18)]" />
        <span className="max-mobile:hidden">{t("common:appName")}</span>
      </a>
      <nav
        className="rounded-full border border-line bg-white/70 p-1 shadow-sm backdrop-blur-md max-nav:hidden"
        aria-label={t("navigationLabel")}
      >
        <ul className="m-0 flex list-none items-center gap-0.5 p-0 text-13 text-ink">
          {navigationItems.map((item) => (
            <li key={item.href}>
              <a
                className="block rounded-full px-3 py-2 transition-[color,background] duration-200 hover:bg-surface-panel hover:text-layl"
                href={item.href}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex shrink-0 items-center gap-3.5 max-mobile:gap-2">
        <button
          className="inline-grid size-11 cursor-pointer place-items-center rounded-13 border border-line-strong bg-transparent font-display text-13 font-bold text-layl transition-[color,border-color,background] duration-200 hover:border-layl hover:bg-layl hover:text-nur max-mobile:size-10 max-mobile:rounded-xl"
          type="button"
          onClick={toggleLocale}
          aria-label={t("common:switchLanguage")}
        >
          {t("languageShort")}
        </button>
        <Link
          className={`${BUTTON} whitespace-nowrap bg-layl text-nur max-mobile:min-h-10 max-mobile:px-3 max-mobile:text-11`}
          to={TODAY_ROUTE}
        >
          <span className="max-mobile:hidden">{t("useOnWeb")}</span>
          <span className="hidden max-mobile:inline">{t("useOnWebShort")}</span>
          <ArrowIcon className="size-[17px] stroke-2 rtl:rotate-180" />
        </Link>
      </div>
    </Reveal>
  );
}
