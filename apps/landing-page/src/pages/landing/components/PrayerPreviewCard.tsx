import { useTranslation } from "react-i18next";
import {
  cityName,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  nextPrayerFor,
  prayerKeysForCity,
  prayerMethodName,
  prayerNameForCity,
  type PrayerDay,
} from "@pray-times/core";
import { useLocale } from "../../../i18n/useLocale";

/** The extension preview inside the hero, showing one city's day. */
export function PrayerPreviewCard({
  day,
  loading,
  failed,
}: {
  day: PrayerDay | undefined;
  loading: boolean;
  failed: boolean;
}) {
  const { t } = useTranslation(["landing", "common"]);
  const locale = useLocale();

  if (loading) {
    return (
      <div className="grid min-h-[250px] place-content-center justify-items-center text-center text-muted">
        <span className="size-[38px] rotate-45 animate-[float_2.6s_ease-in-out_infinite] rounded-orb border-8 border-sama" />
        <p className="mb-0.75 mt-3 font-display text-15 text-nur">{t("loadingDay")}</p>
      </div>
    );
  }
  if (failed || !day) {
    return (
      <div className="grid min-h-[250px] place-content-center justify-items-center text-center text-muted">
        <span className="size-[38px] rotate-45 rounded-orb border-8 border-fajr" />
        <p className="mb-0.75 mt-3 font-display text-15 text-nur">{t("unavailableTimes")}</p>
        <span className="text-11">{t("doNotShowUnverified")}</span>
      </div>
    );
  }

  const next = nextPrayerFor(day);
  return (
    <>
      <div className="mt-[15px] text-11 text-muted">
        {cityName(day.city, locale)} · {formatHijriDate(day.hijri, locale)}
      </div>
      <div className="mt-2.5 rounded-20 border border-sama/[0.45] bg-sama/[0.12] p-[18px]">
        <span className="text-11 font-extrabold text-raml">
          {next.isTomorrow ? t("common:nextPrayerTomorrow") : t("common:nextPrayer")}
        </span>
        <div className="mt-[7px] flex items-baseline justify-between gap-[13px]">
          <strong className="font-display text-27">
            {prayerNameForCity(next.key, day.city, locale)}
          </strong>
          <time className="font-display text-29 font-bold tabular-nums -tracking-wider">
            {formatPrayerTime(next.time, locale)}
          </time>
        </div>
        <p className="mb-0 mt-[9px] text-11 text-muted">
          {t("common:remaining")} {formatRemainingTime(next.minutesUntil, locale)}
        </p>
      </div>
      <div
        className="relative mt-[18px] grid grid-cols-5 gap-0.75 before:absolute before:inset-x-2 before:top-[7px] before:z-0 before:h-0.5 before:bg-[image:linear-gradient(90deg,theme(colors.fajr.DEFAULT),theme(colors.sama),theme(colors.raml.DEFAULT))] before:opacity-75 before:content-['']"
        aria-label={t("prayerPath")}
      >
        {prayerKeysForCity(day.city).map((key) => {
          const isCurrent = key === next.key;
          return (
            <div
              className={
                isCurrent
                  ? "z-1 relative grid justify-items-center gap-1.25 text-center text-10 font-extrabold text-nur max-mobile:text-[8px]"
                  : "z-1 relative grid justify-items-center gap-1.25 text-center text-10 text-muted max-mobile:text-[8px]"
              }
              key={key}
            >
              <i
                aria-hidden="true"
                className={
                  isCurrent
                    ? "-mt-0.75 h-[13px] w-[13px] rounded-full border-raml bg-fajr shadow-[0_0_0_4px_rgba(233,128,110,0.18)]"
                    : "size-2 rounded-full border-2 border-layl-soft bg-sama shadow-[0_0_0_1px_rgba(77,168,218,0.6)]"
                }
              />
              <span>{prayerNameForCity(key, day.city, locale)}</span>
              <time className="tabular-nums">{formatPrayerTime(day.timings[key], locale)}</time>
            </div>
          );
        })}
      </div>
      <p className="mb-0 mt-[15px] border-t border-nur/10 pt-[11px] text-10 text-muted">
        {prayerMethodName(day.method, locale)} · {t("verifiedNow")}
      </p>
    </>
  );
}
