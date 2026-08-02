import { useTranslation } from "react-i18next";
import {
  cityName,
  formatPrayerTime,
  formatRemainingTime,
  nextPrayerFor,
  prayerKeysForCity,
  prayerNameForCity,
  type PrayerDay,
} from "@pray-times/core";
import { useLocale } from "../../../i18n/useLocale";

export function LiveWidget({
  day,
  size,
  className = "",
}: {
  day?: PrayerDay;
  size: "small" | "medium";
  className?: string;
}) {
  const { t } = useTranslation(["landing", "common"]);
  const locale = useLocale();
  const next = day ? nextPrayerFor(day) : undefined;
  const rows = day ? prayerKeysForCity(day.city).slice(0, 4) : [];

  if (size === "small") {
    return (
      <article
        className={`grid aspect-square w-[210px] content-between rounded-27 border border-nur/10 bg-layl-raised bg-[image:radial-gradient(circle_at_85%_0%,rgba(77,168,218,0.22),transparent_46%)] p-5 text-nur shadow-[0_28px_60px_-28px_rgba(7,17,40,0.78),inset_0_1px_rgba(255,255,255,0.1)] ${className}`}
      >
        <div>
          <span className="text-10 font-extrabold text-raml">
            {next?.isTomorrow ? t("common:nextPrayerTomorrow") : t("common:nextPrayer")}
          </span>
          <strong className="mt-1 block font-display text-22">
            {next && day ? prayerNameForCity(next.key, day.city, locale) : "—"}
          </strong>
          <time className="mt-1 block font-display text-17 text-raml">
            {next ? formatPrayerTime(next.time, locale) : ""}
          </time>
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-nur/10 pt-3 text-10 text-muted">
          <span className="max-w-[95px] truncate">
            {day ? cityName(day.city, locale) : t("loadingDay")}
          </span>
          <strong className="text-end text-11 text-nur">
            {next ? formatRemainingTime(next.minutesUntil, locale) : ""}
          </strong>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`grid min-h-[214px] grid-cols-[0.82fr_1px_1.18fr] gap-5 rounded-[28px] border border-nur/10 bg-layl-raised bg-[image:radial-gradient(circle_at_0%_0%,rgba(77,168,218,0.18),transparent_42%)] p-6 text-nur shadow-[0_30px_70px_-34px_rgba(7,17,40,0.82),inset_0_1px_rgba(255,255,255,0.1)] max-mobile:grid-cols-1 max-mobile:gap-4 ${className}`}
    >
      <div className="self-center">
        <span className="text-10 font-extrabold text-raml">
          {next?.isTomorrow ? t("common:nextPrayerTomorrow") : t("common:nextPrayer")}
        </span>
        <strong className="mt-1 block font-display text-22">
          {next && day ? prayerNameForCity(next.key, day.city, locale) : "—"}
        </strong>
        <time className="mt-1 block font-display text-17 text-raml">
          {next ? formatPrayerTime(next.time, locale) : ""}
        </time>
        <p className="mb-0 mt-3 text-10 font-bold text-muted">
          {next ? formatRemainingTime(next.minutesUntil, locale) : t("loadingDay")}
        </p>
      </div>
      <span
        className="h-full w-px bg-nur/10 max-mobile:h-px max-mobile:w-full"
        aria-hidden="true"
      />
      <div className="self-center">
        <span className="text-10 font-extrabold text-muted">{t("schedule")}</span>
        <div className="mt-2 grid gap-1.5">
          {rows.map((key) => (
            <div className="flex items-center justify-between gap-4 text-11" key={key}>
              <span className={key === next?.key ? "font-bold text-nur" : "text-nur/80"}>
                {day ? prayerNameForCity(key, day.city, locale) : "—"}
              </span>
              <time className={key === next?.key ? "font-bold text-raml" : "text-muted"}>
                {day ? formatPrayerTime(day.timings[key], locale) : ""}
              </time>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
