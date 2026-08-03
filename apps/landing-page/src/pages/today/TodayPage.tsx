import { useTranslation } from "react-i18next";
import { SiteFooter } from "../../components/SiteFooter";
import { usePrayerDays } from "../../hooks/usePrayerDays";
import { useDocumentLocale } from "../../i18n/useLocale";
import { QiblaCompass } from "./components/QiblaCompass";
import { TodayHeader } from "./components/TodayHeader";
import { AyahPanel } from "./sections/AyahPanel";
import { DayStatePanel } from "./sections/DayStatePanel";
import { IqamahSettingsPanel } from "./sections/IqamahSettingsPanel";
import { NextPrayerCard } from "./sections/NextPrayerCard";
import { RamadanPanel } from "./sections/RamadanPanel";
import { ScheduleCard } from "./sections/ScheduleCard";
import { TodayIntro } from "./sections/TodayIntro";
import { VerificationPanel } from "./sections/VerificationPanel";
import { WebAlertsPanel } from "./sections/WebAlertsPanel";

export function TodayPage() {
  const { t } = useTranslation("today");
  const { city, day, next, nextDay, fasting, status, retry } = usePrayerDays();

  useDocumentLocale({ title: t("documentTitle") });

  return (
    <div className="min-h-screen bg-layl bg-[image:radial-gradient(circle_at_76%_8%,rgba(77,168,218,0.2),transparent_30rem),linear-gradient(155deg,theme(colors.layl.raised)_0%,theme(colors.layl.DEFAULT)_52%,theme(colors.layl.deep)_100%)] text-nur antialiased">
      <TodayHeader />

      <main className="mx-auto w-shell-today pb-14 pt-[72px] max-mobile:w-[calc(100%-28px)] max-mobile:pb-[38px] max-mobile:pt-12">
        <TodayIntro />
        <WebAlertsPanel city={city} />

        {day && fasting ? <RamadanPanel day={day} fasting={fasting} /> : null}

        {day ? (
          <>
            <div className="mt-[52px] grid grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] gap-6 max-tablet:grid-cols-1">
              <NextPrayerCard day={day} next={next} nextDay={nextDay} />
              <ScheduleCard day={day} next={next} isNextToday={nextDay === day} />
            </div>
            <IqamahSettingsPanel day={day} />
          </>
        ) : (
          <DayStatePanel status={status} onRetry={retry} />
        )}

        <QiblaCompass city={city} />
        <AyahPanel />

        {day ? <VerificationPanel day={day} city={city} status={status} /> : null}
      </main>

      <SiteFooter />
    </div>
  );
}
