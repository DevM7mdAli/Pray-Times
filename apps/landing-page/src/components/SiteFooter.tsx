import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { REPOSITORY_URL } from "../lib/urls";
import { HOME_ROUTE } from "../routes";
import { BrandMark } from "./icons";

/** The landing-page footer is the canonical footer across the public website. */
export function SiteFooter() {
  const { t } = useTranslation(["landing", "common"]);

  return (
    <footer className="border-t border-nur/10 bg-layl px-[max(24px,calc((100vw-1160px)/2))] py-7 text-xs text-muted max-mobile:px-4">
      <div className="flex items-center justify-between gap-5 max-mobile:flex-wrap">
        <Link
          className="inline-flex items-center gap-2.5 font-display text-13 font-bold text-nur"
          to={{ pathname: HOME_ROUTE, hash: "#top" }}
        >
          <BrandMark className="size-[27px] rounded-lg shadow-[0_6px_15px_rgba(11,23,54,0.18)]" />
          <span>{t("common:appName")}</span>
        </Link>
        <span>{t("footer")}</span>
        <a className="hover:text-raml" href={REPOSITORY_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
      <p className="mx-auto mb-0 mt-5 max-w-3xl border-t border-nur/10 pt-5 text-center leading-6 text-nur/75">
        {t("common:dedication")}
      </p>
    </footer>
  );
}
