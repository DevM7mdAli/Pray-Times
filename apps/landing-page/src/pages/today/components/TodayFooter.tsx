import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { HOME_ROUTE } from "../../../routes";

export function TodayFooter() {
  const { t } = useTranslation("today");

  return (
    <footer className="flex justify-between gap-5 border-t border-nur/10 pb-[38px] pt-[25px] text-xs text-muted max-mobile:flex-col">
      <p className="m-0">{t("footer")}</p>
      <Link className="text-raml no-underline" to={HOME_ROUTE}>
        Pray Times
      </Link>
    </footer>
  );
}
