import { useTranslation } from "react-i18next";
import {
  formatPrayerTime,
  formatRemainingTime,
  prayerNameForCity,
  type NextPrayer,
  type PrayerDay,
} from "@pray-times/core";
import { Card } from "../../../components/Card";
import { useLocale } from "../../../i18n/useLocale";

export function NextPrayerCard({
  day,
  next,
  nextDay,
}: {
  day: PrayerDay;
  next: NextPrayer | undefined;
  nextDay: PrayerDay | undefined;
}) {
  const { t } = useTranslation(["today", "common"]);
  const locale = useLocale();

  return (
    <Card
      className="relative min-h-[380px] overflow-hidden bg-layl-soft bg-[image:linear-gradient(145deg,rgba(77,168,218,0.23),rgba(20,36,73,0.76))] p-[35px] max-mobile:min-h-[330px] max-mobile:p-[26px]"
      aria-labelledby="next-prayer-title"
    >
      {next && nextDay ? (
        <>
          <p className="relative z-[1] m-0 font-bold text-raml" id="next-prayer-title">
            {nextDay.requestedDate !== day.requestedDate
              ? t("common:nextPrayerTomorrow")
              : t("common:nextPrayer")}
          </p>
          <div className="relative z-[1] mt-12 grid gap-1.25">
            <strong className="font-display text-display-xl leading-none">
              {prayerNameForCity(next.key, nextDay.city, locale)}
            </strong>
            <time className="text-display-md text-raml" dateTime={next.time}>
              {formatPrayerTime(next.time, locale)}
            </time>
          </div>
          <div className="absolute inset-x-[35px] bottom-8 z-[1] flex items-center justify-between border-t border-nur/[0.14] pt-5 text-muted max-mobile:inset-x-[26px]">
            <span>{t("common:remaining")}</span>
            <b className="text-xl text-nur">{formatRemainingTime(next.minutesUntil, locale)}</b>
          </div>
        </>
      ) : (
        // Tomorrow has not arrived yet, so the countdown has nothing to point at.
        <div className="relative z-[1] mt-12 grid gap-4" aria-live="polite">
          <p className="relative z-[1] m-0 font-bold text-raml" id="next-prayer-title">
            {t("common:nextPrayerTomorrow")}
          </p>
          <strong className="max-w-[25rem] font-display text-display-md font-semibold leading-[1.35] text-raml">
            {t("refreshing")}
          </strong>
        </div>
      )}
      <div
        className="absolute -end-[70px] top-[-70px] h-[250px] w-[250px] rounded-full bg-fajr/20 blur-[15px]"
        aria-hidden="true"
      />
    </Card>
  );
}
