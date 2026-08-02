import { useTranslation } from "react-i18next";
import { BrandMark } from "../../../components/icons";
import { REPOSITORY_URL } from "../../../lib/urls";

export function SiteFooter() {
  const { t } = useTranslation(["landing", "common"]);

  return (
    <footer className="flex items-center justify-between gap-5 border-t border-nur/10 bg-layl px-[max(24px,calc((100vw-1160px)/2))] py-[28px] text-xs text-muted max-mobile:flex-wrap max-mobile:px-4">
      <a
        className="inline-flex items-center gap-2.5 font-display text-13 font-bold text-nur"
        href="#top"
      >
        <BrandMark className="size-[27px] rounded-lg shadow-[0_6px_15px_rgba(11,23,54,0.18)]" />
        <span>{t("common:appName")}</span>
      </a>
      <span>{t("footer")}</span>
      <a className="hover:text-raml" href={REPOSITORY_URL} target="_blank" rel="noreferrer">
        GitHub
      </a>
    </footer>
  );
}
