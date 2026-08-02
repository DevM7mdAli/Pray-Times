import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CITIES, localDateFor } from "@pray-times/core";
import { Eyebrow } from "../../../components/Eyebrow";
import { Reveal } from "../../../components/Reveal";
import { Shell } from "../../../components/Shell";
import { prayerDayQuery } from "../../../queries/prayerDay";
import { HEADING } from "../../../styles/tokens";
import { LiveWidget } from "../components/LiveWidget";

export function WidgetSection() {
  const { t } = useTranslation("landing");
  const city = CITIES.find((candidate) => candidate.id === "riyadh") ?? CITIES[0]!;
  const prayerDay = useQuery(prayerDayQuery(city, localDateFor(city.timeZone)));

  return (
    <section
      id="widget"
      className="relative overflow-hidden bg-layl py-[125px] text-nur before:absolute before:inset-0 before:bg-[image:radial-gradient(circle_at_14%_18%,rgba(77,168,218,0.2),transparent_32%),radial-gradient(circle_at_86%_82%,rgba(242,214,162,0.12),transparent_30%)] before:content-[''] max-tablet:py-[90px] max-mobile:py-[72px]"
    >
      <Shell className="relative z-[1] grid grid-cols-[0.82fr_1.18fr] items-center gap-[clamp(50px,8vw,110px)] max-tablet:grid-cols-1">
        <Reveal>
          <Eyebrow tone="raml">{t("widgetEyebrow")}</Eyebrow>
          <h2 className={`${HEADING} max-w-[560px] text-display-lg text-nur`}>
            {t("widgetTitle")}
          </h2>
          <p className="mb-0 mt-6 max-w-[500px] text-15 leading-[1.95] text-nur/75">
            {t("widgetBody")}
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {[t("widgetAuto"), t("widgetBilingual"), t("widgetPlatforms")].map((item) => (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-nur/10 bg-nur/[0.06] px-3.5 py-2 text-10 font-bold text-nur/85 before:size-1.5 before:rounded-full before:bg-sama before:content-['']"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal
          variant="scale"
          delay={90}
          className="relative min-h-[520px] rounded-[34px] border border-nur/10 bg-layl-deep/50 bg-[image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] p-10 shadow-[inset_0_1px_rgba(255,255,255,0.05)] max-mobile:min-h-[590px] max-mobile:p-5"
          aria-label={t("widgetTitle")}
        >
          <span className="absolute start-7 top-6 text-10 font-extrabold uppercase tracking-widest text-muted">
            {t("widgetMedium")}
          </span>
          <LiveWidget
            className="absolute inset-x-9 top-[82px] max-mobile:inset-x-5 max-mobile:top-[76px]"
            day={prayerDay.data}
            size="medium"
          />
          <span className="absolute bottom-7 end-[246px] text-10 font-extrabold uppercase tracking-widest text-muted max-mobile:bottom-[225px] max-mobile:end-auto max-mobile:start-5">
            {t("widgetSmall")}
          </span>
          <LiveWidget
            className="absolute bottom-[-28px] end-[-22px] rotate-[4deg] max-mobile:bottom-[-24px] max-mobile:end-[-18px] max-mobile:scale-[0.9]"
            day={prayerDay.data}
            size="small"
          />
        </Reveal>
      </Shell>
    </section>
  );
}
