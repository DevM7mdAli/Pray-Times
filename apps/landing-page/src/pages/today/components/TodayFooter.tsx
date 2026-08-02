import { useTranslation } from "react-i18next";
import { HOME_PATH } from "../../../lib/urls";

export function TodayFooter() {
  const { t } = useTranslation("today");

  return (
    <footer className="flex justify-between gap-5 border-t border-nur/10 pb-[38px] pt-[25px] text-xs text-muted max-mobile:flex-col">
      <p className="m-0">{t("footer")}</p>
      <a className="text-raml no-underline" href={HOME_PATH}>
        Pray Times
      </a>
    </footer>
  );
}
