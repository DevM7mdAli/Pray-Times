import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { prayerKeysForCity, prayerNameForCity, type City } from "@pray-times/core";
import { Card } from "../../../components/Card";
import { useWebPushAlerts, type AlertStatus } from "../../../hooks/useWebPushAlerts";
import { useLocale } from "../../../i18n/useLocale";
import { usePreferences } from "../../../stores/preferences";

const ACTION = "min-h-[43px] cursor-pointer rounded-xl px-[17px] font-extrabold";
const PRIMARY = `${ACTION} border-0 bg-raml text-layl disabled:cursor-not-allowed disabled:opacity-[0.48]`;
const SECONDARY = `${ACTION} border border-nur/[0.18] bg-transparent text-muted disabled:cursor-not-allowed disabled:opacity-[0.48]`;

/** The message for each state, so the status line always names the last outcome. */
const MESSAGE_KEY = {
  checking: "alertChecking",
  unconfigured: "alertUnavailable",
  unsupported: "alertUnsupported",
  denied: "alertDenied",
  enabled: "alertEnabled",
  sent: "alertSent",
  error: "alertError",
  disabled: "alertDisabled",
} as const satisfies Record<AlertStatus, string>;

export function WebAlertsPanel({ city }: { city: City }) {
  const { t } = useTranslation("today");
  const locale = useLocale();
  const enabledPrayers = usePreferences((state) => state.enabledPrayers);
  const setPrayerEnabled = usePreferences((state) => state.setPrayerEnabled);

  const settings = useMemo(
    () => ({ place: city, locale, enabledPrayers }),
    [city, enabledPrayers, locale]
  );
  const alerts = useWebPushAlerts(settings);
  const on = alerts.status === "enabled" || alerts.status === "sent";

  return (
    <Card
      className="mt-9 grid gap-[22px] bg-layl-soft/[0.72] bg-[image:linear-gradient(120deg,rgba(77,168,218,0.14),transparent_55%)] px-7.5 py-[27px] max-mobile:px-[19px] max-mobile:py-[22px]"
      data-state={alerts.status}
      aria-labelledby="web-alerts-title"
    >
      <div className="flex items-center justify-between gap-7 max-mobile:flex-col max-mobile:items-stretch">
        <div>
          <span className="me-2.5 inline-flex rounded-full border border-success/[0.38] px-[9px] py-1 text-10 font-extrabold uppercase text-success-pale">
            {t("free")}
          </span>
          <h2 className="m-0 inline font-display text-22 font-bold" id="web-alerts-title">
            {t("alertsTitle")}
          </h2>
          <p className="mb-0 mt-1.25 text-13 text-muted">{t("alertsBody")}</p>
        </div>
        <div className="flex shrink-0 gap-[9px] max-mobile:flex-col">
          {on ? (
            <>
              <button
                className={PRIMARY}
                type="button"
                onClick={() => void alerts.sendTest()}
                disabled={alerts.busy}
              >
                {t("testAlert")}
              </button>
              <button
                className={SECONDARY}
                type="button"
                onClick={() => void alerts.disable()}
                disabled={alerts.busy}
              >
                {t("disableAlerts")}
              </button>
            </>
          ) : (
            <button
              className={PRIMARY}
              type="button"
              onClick={() => void alerts.enable()}
              disabled={
                alerts.busy ||
                alerts.status === "checking" ||
                alerts.status === "unconfigured" ||
                alerts.status === "unsupported" ||
                alerts.status === "denied"
              }
            >
              {t("enableAlerts")}
            </button>
          )}
        </div>
      </div>

      <div
        className="grid grid-cols-[auto_1fr] items-center gap-x-[22px] gap-y-3.5 border-y border-nur/10 py-[18px] max-mobile:grid-cols-1"
        aria-label={t("choosePrayers")}
      >
        <span className="text-xs font-bold text-muted">{t("choosePrayers")}</span>
        <div className="flex flex-wrap gap-2">
          {prayerKeysForCity(city).map((key) => (
            <label className="relative cursor-pointer" key={key}>
              <input
                className="peer pointer-events-none absolute opacity-0"
                type="checkbox"
                checked={enabledPrayers[key]}
                onChange={(event) => setPrayerEnabled(key, event.target.checked)}
              />
              <span className="block rounded-full border border-nur/[0.13] px-[13px] py-2 text-xs text-muted transition-[border-color,background,color] duration-150 peer-checked:border-raml/[0.42] peer-checked:bg-raml/10 peer-checked:text-raml peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sama">
                {prayerNameForCity(key, city, locale)}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-[9px]" role="status" aria-live="polite">
        <span
          className={
            on
              ? "size-2 flex-none rounded-full bg-success shadow-[0_0_10px_rgba(105,212,162,0.65)]"
              : alerts.status === "error" || alerts.status === "denied"
                ? "size-2 flex-none rounded-full bg-fajr"
                : "size-2 flex-none rounded-full bg-muted"
          }
          aria-hidden="true"
        />
        <p className="m-0">{t(MESSAGE_KEY[alerts.status])}</p>
      </div>
      <p className="mb-0 mt-[-11px] text-11">{t("iosHelp")}</p>
    </Card>
  );
}
