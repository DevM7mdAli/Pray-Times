import { useTranslation } from "react-i18next";
import {
  allPrayerMethods,
  formatUpdatedAt,
  isPrayerMethodId,
  prayerMethodForCity,
  prayerMethodName,
  type City,
  type PrayerDay,
} from "@pray-times/core";
import { Card } from "../../../components/Card";
import { useLocale } from "../../../i18n/useLocale";
import type { LoadStatus } from "../../../queries/prayerDay";
import { useDefaultCity, usePreferences } from "../../../stores/preferences";

/** How the time on screen was arrived at, and the control to change the method. */
export function VerificationPanel({
  day,
  city,
  status,
}: {
  day: PrayerDay;
  city: City;
  status: LoadStatus;
}) {
  const { t } = useTranslation("today");
  const locale = useLocale();
  const defaultCity = useDefaultCity();
  const methodOverrides = usePreferences((state) => state.methodOverrides);
  const setMethodOverride = usePreferences((state) => state.setMethodOverride);
  const override = methodOverrides[city.id];

  return (
    <Card className="mt-6 bg-layl-soft/[0.72] px-7 py-6" data-state={status} aria-live="polite">
      <div className="flex items-center gap-[9px]">
        <span
          className={
            status === "cached"
              ? "h-[9px] w-[9px] rounded-full bg-raml shadow-[0_0_12px_rgba(242,214,162,0.6)]"
              : "h-[9px] w-[9px] rounded-full bg-success shadow-[0_0_12px_rgba(105,212,162,0.7)]"
          }
          aria-hidden="true"
        />
        <p className="m-0 text-sm font-bold text-nur">
          {status === "verified"
            ? t("verified")
            : status === "cached"
              ? t("cached")
              : t("refreshing")}
        </p>
      </div>
      <dl className="mb-3.5 mt-5 flex flex-wrap gap-x-[42px] gap-y-4">
        <div className="grid gap-0.75">
          <dt className="text-11 text-muted">{t("refreshed")}</dt>
          <dd className="m-0 text-raml">
            {formatUpdatedAt(day.fetchedAt, day.city.timeZone, locale)}
          </dd>
        </div>
        <div className="grid gap-0.75">
          <dt className="text-11 text-muted">
            <label htmlFor="method-select">
              {locale === "ar" ? "طريقة الحساب" : "Calculation"}
            </label>
          </dt>
          <dd className="m-0 text-raml">
            <select
              className="min-h-[38px] max-w-full rounded-11 border border-nur/[0.18] bg-layl-soft px-[11px] text-13 text-nur"
              id="method-select"
              value={override === undefined ? "" : String(override)}
              onChange={(event) => {
                const chosen = Number(event.target.value);
                // An empty choice returns the place to its country default.
                const valid = event.target.value !== "" && isPrayerMethodId(chosen);
                setMethodOverride(city.id, valid ? chosen : undefined);
              }}
            >
              <option value="">
                {t("methodAuto")} — {prayerMethodName(prayerMethodForCity(defaultCity), locale)}
              </option>
              {allPrayerMethods().map((method) => (
                <option key={method.id} value={method.id}>
                  {prayerMethodName(method, locale)}
                </option>
              ))}
            </select>
            {override === undefined ? null : (
              <span className="mt-1.25 block text-11 text-raml">{t("methodOverridden")}</span>
            )}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted">{t("accuracy")}</p>
    </Card>
  );
}
