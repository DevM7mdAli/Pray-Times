import { useTranslation } from "react-i18next";
import {
  CITIES,
  cityName,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  nextPrayerFor,
  prayerKeysForCity,
  prayerNameForCity,
  type PrayerDay,
} from "@pray-times/core";
import { useLocale } from "../../../i18n/useLocale";
import { ICON_BASE } from "../../../styles/tokens";
import { LiveWidget } from "./LiveWidget";

function ProductIcon({
  name,
  className = "",
}: {
  name: "today" | "qibla" | "settings";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${ICON_BASE} ${className}`}>
      {name === "today" ? (
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19" />
        </>
      ) : null}
      {name === "qibla" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m15.8 8.2-2.3 5.3-5.3 2.3 2.3-5.3 5.3-2.3Z" />
        </>
      ) : null}
      {name === "settings" ? (
        <>
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="9" cy="6" r="2" />
          <circle cx="15" cy="12" r="2" />
          <circle cx="8" cy="18" r="2" />
        </>
      ) : null}
    </svg>
  );
}

export function MobileProductVisual({
  day,
  loading,
  failed,
  cityId,
  onCityChange,
}: {
  day?: PrayerDay;
  loading: boolean;
  failed: boolean;
  cityId: string;
  onCityChange: (cityId: string) => void;
}) {
  const { t } = useTranslation(["landing", "common"]);
  const locale = useLocale();
  const next = day ? nextPrayerFor(day) : undefined;
  const schedule = day ? prayerKeysForCity(day.city).slice(0, 4) : [];
  const labels = {
    today: locale === "ar" ? "اليوم" : "Today",
    qibla: locale === "ar" ? "القبلة" : "Qibla",
    settings: locale === "ar" ? "الإعدادات" : "Settings",
  } as const;

  return (
    <div className="relative min-h-[690px] w-full max-w-[560px] justify-self-end max-tablet:justify-self-center max-mobile:min-h-[620px]">
      <div
        className="absolute inset-x-[-12%] bottom-[2%] top-[5%] animate-aura-breathe rounded-full bg-[image:radial-gradient(ellipse,rgba(77,168,218,0.26),transparent_67%)] blur-xl"
        aria-hidden="true"
      />
      <div
        className="absolute end-[-8%] top-[16%] size-[220px] rounded-full border border-sama/20 opacity-70 before:absolute before:inset-7 before:rounded-full before:border before:border-sama/15 after:absolute after:inset-[58px] after:rounded-full after:border after:border-raml/20 after:content-[''] max-mobile:hidden"
        aria-hidden="true"
      />

      <section
        className="relative z-[1] ms-auto w-[356px] overflow-hidden rounded-[48px] border-[7px] border-layl-deep bg-layl text-nur shadow-[0_40px_90px_-35px_rgba(11,23,54,0.72),inset_0_1px_rgba(255,255,255,0.12)] max-mobile:mx-auto max-mobile:w-[min(100%,344px)]"
        aria-label={t("livePreview")}
      >
        <div className="relative h-[640px] overflow-hidden bg-[image:radial-gradient(circle_at_50%_-10%,rgba(77,168,218,0.24),transparent_34%)] px-[18px] pb-[70px] pt-[55px] max-mobile:h-[600px]">
          <span
            className="absolute start-1/2 top-[12px] h-[29px] w-[105px] -translate-x-1/2 rounded-full bg-black"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-10 font-extrabold text-raml">{labels.today}</span>
              <h2 className="mb-0 mt-1 font-display text-[24px] font-bold leading-tight">
                {locale === "ar" ? "أوقات الصلاة اليوم" : "Today’s prayer times"}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-nur/10 bg-nur/5 px-2.5 py-1 text-[9px] text-muted before:size-1.5 before:rounded-full before:bg-success before:content-['']">
              {t("liveLabel")}
            </span>
          </div>

          <label className="mt-4 flex items-center justify-between gap-3 rounded-15 border border-nur/10 bg-layl-soft px-3.5 py-3 text-10 text-muted">
            {t("common:city")}
            <select
              className="max-w-[150px] cursor-pointer border-0 bg-transparent text-end text-11 font-extrabold text-nur"
              value={cityId}
              onChange={(event) => onCityChange(event.target.value)}
              aria-label={t("choosePreviewCity")}
            >
              {CITIES.map((option) => (
                <option className="bg-layl-soft" key={option.id} value={option.id}>
                  {cityName(option, locale)}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 rounded-20 bg-layl-raised p-4">
            {loading ? (
              <div className="grid min-h-[128px] place-content-center justify-items-center text-center text-muted">
                <span className="size-7 rotate-45 animate-float rounded-orb border-[6px] border-sama" />
                <span className="mt-3 text-10">{t("loadingDay")}</span>
              </div>
            ) : failed || !day || !next ? (
              <div className="grid min-h-[128px] place-content-center text-center text-10 text-muted">
                {t("unavailableTimes")}
              </div>
            ) : (
              <>
                <span className="text-10 font-extrabold text-raml">
                  {next.isTomorrow ? t("common:nextPrayerTomorrow") : t("common:nextPrayer")}
                </span>
                <strong className="mt-1 block font-display text-27">
                  {prayerNameForCity(next.key, day.city, locale)}
                </strong>
                <time className="mt-0.5 block font-display text-19 text-raml">
                  {formatPrayerTime(next.time, locale)}
                </time>
                <div className="mt-3 flex items-center justify-between border-t border-nur/10 pt-3 text-10 text-muted">
                  <span>{t("common:remaining")}</span>
                  <strong className="text-11 text-nur">
                    {formatRemainingTime(next.minutesUntil, locale)}
                  </strong>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 rounded-20 bg-layl-raised p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="text-[9px] text-muted">
                  {day ? cityName(day.city, locale) : t("common:city")}
                </span>
                <strong className="mt-0.5 block font-display text-15">{t("schedule")}</strong>
              </div>
              <span className="text-[8px] text-muted">
                {day ? formatHijriDate(day.hijri, locale) : ""}
              </span>
            </div>
            <div className="mt-2">
              {schedule.map((key) => (
                <div
                  className="flex items-center gap-2 border-t border-nur/10 py-2 text-10"
                  key={key}
                >
                  <span
                    className={
                      key === next?.key
                        ? "size-1.5 rounded-full bg-raml"
                        : "size-1.5 rounded-full bg-muted"
                    }
                  />
                  <span className="flex-1 font-bold">
                    {day ? prayerNameForCity(key, day.city, locale) : ""}
                  </span>
                  <time className={key === next?.key ? "font-bold text-raml" : "text-muted"}>
                    {day ? formatPrayerTime(day.timings[key], locale) : ""}
                  </time>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 grid h-[62px] grid-cols-3 border-t border-nur/10 bg-layl-deep px-5">
            {(["today", "qibla", "settings"] as const).map((name) => (
              <span
                className={
                  name === "today"
                    ? "grid place-content-center justify-items-center gap-0.5 text-[8px] text-sama"
                    : "grid place-content-center justify-items-center gap-0.5 text-[8px] text-muted"
                }
                key={name}
              >
                <ProductIcon className="size-[18px] stroke-[1.8]" name={name} />
                {labels[name]}
              </span>
            ))}
          </div>
        </div>
      </section>

      <LiveWidget
        className="absolute bottom-[46px] start-[-18px] z-[2] -rotate-3 max-mobile:bottom-[24px] max-mobile:start-[-4px] max-mobile:origin-bottom-left max-mobile:scale-[0.78] rtl:rotate-3 rtl:max-mobile:origin-bottom-right"
        day={day}
        size="small"
      />
    </div>
  );
}
