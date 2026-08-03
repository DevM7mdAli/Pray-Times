import { useTranslation } from "react-i18next";
import {
  prayerKeysForCity,
  prayerNameForCity,
  type IqamahTimeSetting,
  type PrayerDay,
  type PrayerKey,
} from "@pray-times/core";
import { Card } from "../../../components/Card";
import { useLocale } from "../../../i18n/useLocale";
import { usePreferences } from "../../../stores/preferences";

function defaultSetting(mode: IqamahTimeSetting["mode"], day: PrayerDay, key: PrayerKey) {
  return mode === "offset"
    ? ({ mode, minutes: 20 } as const)
    : ({ mode, time: day.timings[key].slice(0, 5) } as const);
}

export function IqamahSettingsPanel({ day }: { day: PrayerDay }) {
  const { t } = useTranslation("today");
  const locale = useLocale();
  const iqamahByCity = usePreferences((state) => state.iqamahByCity);
  const setIqamahSetting = usePreferences((state) => state.setIqamahSetting);
  const settings = iqamahByCity[day.city.id] ?? {};

  return (
    <Card className="mt-6 bg-layl-soft/[0.72] p-7.5" aria-labelledby="iqamah-settings-title">
      <div className="max-w-2xl">
        <h2 className="m-0 font-display text-2xl font-bold" id="iqamah-settings-title">
          {t("iqamahTitle")}
        </h2>
        <p className="mb-0 mt-2 text-13 leading-6 text-muted">{t("iqamahDescription")}</p>
      </div>

      <div className="mt-5 grid gap-2.5">
        {prayerKeysForCity(day.city).map((key) => {
          const setting = settings[key];
          return (
            <div
              className="grid grid-cols-3 items-center gap-3 rounded-13 border border-nur/10 bg-layl/30 p-3 max-mobile:grid-cols-1"
              key={key}
            >
              <strong className="text-13 text-nur">
                {prayerNameForCity(key, day.city, locale)}
              </strong>
              <select
                className="min-h-10 min-w-0 rounded-11 border border-nur/[0.18] bg-layl-soft px-3 text-13 text-nur"
                aria-label={`${prayerNameForCity(key, day.city, locale)} · ${t("iqamahTitle")}`}
                value={setting?.mode ?? "none"}
                onChange={(event) => {
                  const mode = event.target.value;
                  setIqamahSetting(
                    day.city.id,
                    key,
                    mode === "none"
                      ? undefined
                      : defaultSetting(mode as IqamahTimeSetting["mode"], day, key)
                  );
                }}
              >
                <option value="none">{t("iqamahNotSet")}</option>
                <option value="offset">{t("iqamahOffset")}</option>
                <option value="exact">{t("iqamahExact")}</option>
              </select>

              {setting?.mode === "offset" ? (
                <label className="flex min-w-0 items-center gap-2 text-11 text-muted">
                  <input
                    className="min-h-10 min-w-0 flex-1 rounded-11 border border-nur/[0.18] bg-layl-soft px-3 text-center text-13 text-nur"
                    type="number"
                    min="0"
                    max="180"
                    step="1"
                    value={setting.minutes}
                    onChange={(event) => {
                      const candidate = Number(event.target.value);
                      if (!Number.isFinite(candidate)) return;
                      const minutes = Math.min(180, Math.max(0, Math.round(candidate)));
                      setIqamahSetting(day.city.id, key, { mode: "offset", minutes });
                    }}
                  />
                  <span>{t("iqamahMinutes")}</span>
                </label>
              ) : setting?.mode === "exact" ? (
                <input
                  className="min-h-10 min-w-0 rounded-11 border border-nur/[0.18] bg-layl-soft px-3 text-center text-13 text-nur"
                  aria-label={`${prayerNameForCity(key, day.city, locale)} · ${t("iqamahExact")}`}
                  type="time"
                  value={setting.time}
                  onChange={(event) => {
                    if (event.target.value) {
                      setIqamahSetting(day.city.id, key, {
                        mode: "exact",
                        time: event.target.value,
                      });
                    }
                  }}
                />
              ) : (
                <span className="text-center text-muted">—</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
