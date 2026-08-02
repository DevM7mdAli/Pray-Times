import { useTranslation } from "react-i18next";
import {
  cityName,
  dayTimeline,
  formatHijriDate,
  formatPrayerTime,
  prayerNameForCity,
  sunriseName,
  type NextPrayer,
  type PrayerDay,
} from "@pray-times/core";
import { Card } from "../../../components/Card";
import { useLocale } from "../../../i18n/useLocale";

const ROW = "grid min-h-[57px] grid-cols-[14px_1fr_auto] items-center gap-3";

export function ScheduleCard({
  day,
  next,
  isNextToday,
}: {
  day: PrayerDay;
  next: NextPrayer | undefined;
  /** Whether the highlighted prayer belongs to this day rather than tomorrow's. */
  isNextToday: boolean;
}) {
  const { t } = useTranslation("today");
  const locale = useLocale();

  return (
    <Card className="bg-layl-soft/[0.72] p-7.5" aria-labelledby="today-schedule-title">
      <div className="mb-4 flex items-end justify-between gap-6 max-mobile:flex-col max-mobile:items-start max-mobile:gap-2">
        <div>
          <p className="m-0 text-[12px] text-muted">{cityName(day.city, locale)}</p>
          <h2 className="m-0 mt-0.75 font-display text-2xl font-bold" id="today-schedule-title">
            {t("schedule")}
          </h2>
        </div>
        <span className="text-[12px] text-muted">{formatHijriDate(day.hijri, locale)}</span>
      </div>
      <div>
        {dayTimeline(day).map((entry) => {
          const isNext = entry.kind === "prayer" && entry.key === next?.key && isNextToday;
          const isMarker = entry.kind === "sunrise";
          return (
            <div
              className={
                isNext
                  ? `-mx-2 ${ROW} rounded-13 border border-sama/[0.35] bg-sama/10 px-[18px]`
                  : `${ROW} border-t border-nur/10 px-2.5`
              }
              key={entry.kind === "sunrise" ? "sunrise" : entry.key}
            >
              <span
                className={
                  isNext
                    ? "size-2 rounded-full border border-raml bg-raml shadow-[0_0_14px_rgba(242,214,162,0.7)]"
                    : isMarker
                      ? "size-1.5 rounded-full border border-dashed border-muted"
                      : "size-2 rounded-full border border-muted"
                }
                aria-hidden="true"
              />
              <div className="grid gap-0.5">
                <strong className={isMarker ? "font-medium text-muted" : undefined}>
                  {entry.kind === "sunrise"
                    ? sunriseName(locale)
                    : prayerNameForCity(entry.key, day.city, locale)}
                </strong>
                {entry.kind === "sunrise" ? (
                  <span className="text-11 text-muted">{t("sunriseNote")}</span>
                ) : null}
              </div>
              <time className={isNext ? "font-bold text-raml" : "text-muted"} dateTime={entry.time}>
                {formatPrayerTime(entry.time, locale)}
              </time>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
