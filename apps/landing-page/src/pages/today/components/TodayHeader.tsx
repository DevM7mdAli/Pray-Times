import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useToggleLocale } from "../../../i18n/useLocale";
import { EXTENSION_URL, ICON_URL } from "../../../lib/urls";
import { HOME_ROUTE } from "../../../routes";

export function TodayHeader() {
  const { t } = useTranslation(["today", "common"]);
  const toggleLocale = useToggleLocale();

  return (
    <header className="mx-auto flex min-h-[86px] w-shell-today items-center justify-between gap-6 border-b border-nur/10 max-mobile:min-h-[74px] max-mobile:w-[calc(100%-28px)]">
      <Link
        className="flex items-center gap-[11px] font-display font-bold text-nur no-underline"
        to={HOME_ROUTE}
      >
        <img
          className="rounded-13 shadow-[0_9px_25px_rgba(0,0,0,0.25)]"
          src={ICON_URL}
          width="46"
          height="46"
          alt=""
        />
        <span>Pray Times</span>
      </Link>
      <nav className="flex items-center gap-[18px]" aria-label={t("title")}>
        <Link
          className="cursor-pointer border-0 bg-transparent text-muted no-underline hover:text-nur max-mobile:hidden"
          to={HOME_ROUTE}
        >
          {t("back")}
        </Link>
        <a
          className="rounded-full border border-raml/[0.42] px-[15px] py-2.5 text-raml no-underline max-mobile:hidden"
          href={EXTENSION_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t("extension")}
        </a>
        <button
          className="cursor-pointer border-0 bg-transparent text-muted hover:text-nur"
          type="button"
          onClick={toggleLocale}
          aria-label={t("common:switchLanguage")}
        >
          {t("language")}
        </button>
      </nav>
    </header>
  );
}
