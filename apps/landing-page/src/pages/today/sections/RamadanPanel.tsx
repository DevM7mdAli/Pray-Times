import { useTranslation } from "react-i18next";
import {
  formatPrayerTime,
  formatRemainingTime,
  type FastingStatus,
  type PrayerDay,
} from "@pray-times/core";
import { Kicker } from "../../../components/Card";
import { useLocale } from "../../../i18n/useLocale";

/** Suhoor and iftar guidance, shown only while core reports a fast in progress. */
export function RamadanPanel({ day, fasting }: { day: PrayerDay; fasting: FastingStatus }) {
  const { t } = useTranslation("today");
  const locale = useLocale();

  return (
    <section
      className="mt-6 rounded-22 border border-raml/[0.34] bg-layl-soft/[0.72] bg-[image:linear-gradient(120deg,rgba(242,214,162,0.16),rgba(233,128,110,0.08)_60%)] px-7 py-[22px]"
      data-phase={fasting.phase}
      aria-live="polite"
    >
      <Kicker className="mb-2.5 mt-0">{t("ramadanKicker")}</Kicker>
      {fasting.phase === "completed" ? (
        <div className="flex flex-wrap items-baseline gap-3.5">
          <strong className="font-display text-display-md leading-[1.1]">
            {t("fastCompleted")}
          </strong>
          <span className="text-13 text-muted">
            {t("fastCompletedDetail")} {formatPrayerTime(day.timings.Maghrib, locale)}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-3.5">
          <span className="text-13 text-muted">
            {fasting.phase === "suhoor" ? t("suhoorLabel") : t("iftarLabel")}
          </span>
          <strong className="font-display text-display-md leading-[1.1]">
            {formatRemainingTime(fasting.minutesUntil ?? 0, locale)}
          </strong>
          <time className="ms-auto text-xl text-raml" dateTime={fasting.time}>
            {formatPrayerTime(fasting.time ?? "", locale)}
          </time>
        </div>
      )}
    </section>
  );
}
