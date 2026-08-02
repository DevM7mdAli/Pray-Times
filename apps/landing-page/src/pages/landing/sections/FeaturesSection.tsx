import { useTranslation } from "react-i18next";
import { Eyebrow } from "../../../components/Eyebrow";
import { Reveal } from "../../../components/Reveal";
import { Shell } from "../../../components/Shell";
import { HEADING } from "../../../styles/tokens";

export function FeaturesSection() {
  const { t } = useTranslation("landing");

  return (
    <Shell
      id="features"
      className="pb-[115px] pt-[125px] max-tablet:pb-20 max-tablet:pt-[90px] max-mobile:pb-[65px] max-mobile:pt-[75px]"
    >
      <Reveal className="grid grid-cols-[1fr_0.82fr] items-end gap-[clamp(40px,8vw,110px)] max-tablet:grid-cols-1 max-tablet:gap-7">
        <div>
          <Eyebrow tone="fajr">{t("featuresEyebrow")}</Eyebrow>
          <h2 className={`${HEADING} max-w-[650px] text-display-lg text-layl`}>
            {t("featuresTitle")}
          </h2>
        </div>
        <p className="m-0 max-w-[480px] text-15 leading-[1.9] text-ink-soft">
          {t("featuresIntro")}
        </p>
      </Reveal>

      <Reveal
        delay={90}
        className="mt-[54px] grid grid-cols-[0.78fr_1.22fr] gap-px overflow-hidden rounded-22 border border-line bg-line max-mobile:mt-[38px] max-mobile:grid-cols-1"
        aria-label={t("featuresTitle")}
      >
        <div className="min-h-[135px] bg-surface-panel px-7.5 py-[26px]">
          <span className="text-10 font-extrabold uppercase tracking-[0.08em] text-fajr">
            {t("beforeLabel")}
          </span>
          <p className="mb-0 mt-[9px] max-w-[620px] font-display text-15 font-semibold leading-[1.7] text-ink">
            {t("beforeText")}
          </p>
        </div>
        <div className="min-h-[135px] bg-layl-soft bg-[image:radial-gradient(circle_at_85%_-40%,rgba(77,168,218,0.42),transparent_43%)] px-7.5 py-[26px] text-nur">
          <span className="text-10 font-extrabold uppercase tracking-[0.08em] text-raml">
            {t("nowLabel")}
          </span>
          <p className="mb-0 mt-[9px] max-w-[620px] font-display text-15 font-semibold leading-[1.7] text-nur/90">
            {t("nowText")}
          </p>
        </div>
      </Reveal>

      <div className="mt-4 grid grid-cols-3 gap-[15px] max-tablet:grid-cols-2 max-mobile:grid-cols-1">
        {t("features", { returnObjects: true }).map((feature, index) => (
          <Reveal key={index} delay={index % 3 === 1 ? 70 : index % 3 === 2 ? 140 : 0}>
            <article className="group relative h-full min-h-[260px] overflow-hidden rounded-20 border border-line bg-white/[0.62] p-7.5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.75 hover:border-line-hover hover:shadow-[0_18px_35px_-28px_rgba(11,23,54,0.58)] max-mobile:min-h-0 max-mobile:p-[25px]">
              <div
                className="mb-7.5 grid size-[42px] place-items-center rounded-13 border border-line-soft bg-surface-chip font-display text-11 font-bold text-layl transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-rotate-3 rtl:group-hover:rotate-3"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <span className="text-10 font-extrabold uppercase tracking-[0.08em] text-fajr">
                {feature.tag}
              </span>
              <h3 className="mb-0 mt-[11px] font-display text-19 leading-[1.45] text-layl">
                {feature.title}
              </h3>
              <p className="mb-0 mt-[11px] text-13 leading-[1.8] text-ink-faint">{feature.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}
