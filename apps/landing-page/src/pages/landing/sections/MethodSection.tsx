import { useTranslation } from "react-i18next";
import { Eyebrow } from "../../../components/Eyebrow";
import { Reveal } from "../../../components/Reveal";
import { Shell } from "../../../components/Shell";
import { CheckIcon, PinIcon, ShieldIcon } from "../../../components/icons";
import { HEADING } from "../../../styles/tokens";

const CHECK_ROW = "grid grid-cols-[44px_1fr] gap-4 border-b border-line py-[25px]";
const CHECK_ICON = "size-[33px] rounded-11 bg-surface-chip stroke-[1.7] p-[7px] text-layl";
const CHECK_TITLE = "font-display text-15 font-bold text-layl";
const CHECK_BODY = "mb-0 mt-1.5 text-13 leading-[1.8] text-ink-faint";

/** The three checks every displayed time passes before it is shown. */
export function MethodSection() {
  const { t } = useTranslation("landing");

  return (
    <Shell
      id="method"
      className="grid grid-cols-[0.9fr_1.1fr] gap-[95px] py-[130px] max-tablet:grid-cols-1 max-tablet:gap-[45px] max-tablet:py-[85px] max-mobile:py-[70px]"
    >
      <Reveal delay={110}>
        <Eyebrow tone="fajr">{t("methodEyebrow")}</Eyebrow>
        <h2 className={`${HEADING} text-display-lg text-layl`}>{t("methodLead")}</h2>
        <p className="mb-0 mt-[22px] max-w-[420px] leading-[1.9] text-ink-soft">
          {t("methodBody")}
        </p>
      </Reveal>
      <Reveal delay={90} className="border-t border-line">
        <article className={CHECK_ROW}>
          <PinIcon className={CHECK_ICON} />
          <div>
            <span className={CHECK_TITLE}>{t("coordinateTitle")}</span>
            <p className={CHECK_BODY}>{t("coordinateBody")}</p>
          </div>
        </article>
        <article className={CHECK_ROW}>
          <CheckIcon className={CHECK_ICON} />
          <div>
            <span className={CHECK_TITLE}>{t("dateTitle")}</span>
            <p className={CHECK_BODY}>{t("dateBody")}</p>
          </div>
        </article>
        <article className={CHECK_ROW}>
          <ShieldIcon className={CHECK_ICON} />
          <div>
            <span className={CHECK_TITLE}>{t("methodTitle")}</span>
            <p className={CHECK_BODY}>{t("methodBodyCard")}</p>
          </div>
        </article>
      </Reveal>
    </Shell>
  );
}
