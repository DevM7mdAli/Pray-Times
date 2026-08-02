import { useTranslation } from "react-i18next";
import { useLocale } from "../../../i18n/useLocale";
import { LocationPicker } from "../components/LocationPicker";

export function TodayIntro() {
  const { t } = useTranslation("today");
  const locale = useLocale();

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-12 gap-y-3 max-tablet:grid-cols-1">
      <p className="col-start-1 m-0 text-xs font-extrabold tracking-[0.14em] text-raml">
        {locale === "ar" ? "مسار يومك" : "YOUR DAILY PATH"}
      </p>
      <h1 className="col-start-1 m-0 font-display text-display-xl leading-[1.08]">{t("title")}</h1>
      <p className="col-start-1 m-0 text-17 text-muted">{t("subtitle")}</p>
      <LocationPicker />
    </section>
  );
}
