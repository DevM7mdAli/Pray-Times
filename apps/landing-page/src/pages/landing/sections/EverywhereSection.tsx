import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "../../../components/Eyebrow";
import { Reveal } from "../../../components/Reveal";
import { Shell } from "../../../components/Shell";
import { ArrowIcon } from "../../../components/icons";
import { EXTENSION_URL } from "../../../lib/urls";
import { TODAY_ROUTE } from "../../../routes";
import { HEADING, ICON_BASE } from "../../../styles/tokens";

type Surface = "app" | "extension" | "web";

function SurfaceIcon({ surface }: { surface: Surface }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={`${ICON_BASE} size-8 stroke-[1.55]`}>
      {surface === "app" ? (
        <>
          <rect x="8" y="3" width="16" height="26" rx="4" />
          <path d="M13 7h6M14 25h4" />
          <circle cx="16" cy="15" r="3.5" />
          <path d="M16 9v2m0 8v2m-6-6h2m8 0h2" />
        </>
      ) : null}
      {surface === "extension" ? (
        <>
          <rect x="3" y="5" width="26" height="22" rx="4" />
          <path d="M3 11h26M8 8h.01M12 8h.01M16 8h.01" />
          <path d="M14 16h7v7h-7zM17.5 16v-2.5M14 19.5h-2.5" />
        </>
      ) : null}
      {surface === "web" ? (
        <>
          <circle cx="16" cy="16" r="13" />
          <path d="M3 16h26M16 3c4 4 6 8 6 13s-2 9-6 13c-4-4-6-8-6-13s2-9 6-13Z" />
        </>
      ) : null}
    </svg>
  );
}

function SurfaceCard({
  surface,
  tag,
  title,
  body,
  action,
  featured = false,
}: {
  surface: Surface;
  tag: string;
  title: string;
  body: string;
  action: ReactNode;
  featured?: boolean;
}) {
  return (
    <article
      className={
        featured
          ? "group relative z-[1] flex min-h-96 flex-col overflow-hidden rounded-26 border border-layl bg-layl bg-[image:radial-gradient(circle_at_90%_0%,rgba(77,168,218,0.3),transparent_42%)] p-7.5 text-nur shadow-[0_30px_60px_-38px_rgba(7,17,40,0.8)] transition-transform duration-300 hover:-translate-y-1.5"
          : "group relative z-[1] flex min-h-96 flex-col overflow-hidden rounded-26 border border-line bg-white/70 p-7.5 text-layl shadow-[0_25px_55px_-44px_rgba(7,17,40,0.65)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1.5 hover:border-sama/50 hover:shadow-[0_30px_60px_-40px_rgba(7,17,40,0.72)]"
      }
    >
      <div
        className={
          featured
            ? "rounded-17 grid size-14 place-items-center border border-nur/10 bg-nur/[0.07] text-sama"
            : "rounded-17 grid size-14 place-items-center border border-line bg-surface-chip text-fajr"
        }
      >
        <SurfaceIcon surface={surface} />
      </div>
      <span
        className={
          featured
            ? "mt-8 text-10 font-extrabold uppercase tracking-widest text-raml"
            : "mt-8 text-10 font-extrabold uppercase tracking-widest text-fajr"
        }
      >
        {tag}
      </span>
      <h3 className="mb-0 mt-3 font-display text-22 leading-[1.35]">{title}</h3>
      <p
        className={
          featured
            ? "mb-0 mt-4 text-13 leading-[1.9] text-nur/75"
            : "mb-0 mt-4 text-13 leading-[1.9] text-ink-faint"
        }
      >
        {body}
      </p>
      <div
        className={
          featured
            ? "text-12 mt-auto flex items-center gap-2 pt-7 font-extrabold text-raml"
            : "text-12 mt-auto flex items-center gap-2 pt-7 font-extrabold text-layl"
        }
      >
        {action}
      </div>
    </article>
  );
}

export function EverywhereSection() {
  const { t } = useTranslation("landing");

  return (
    <Shell id="everywhere" className="py-[125px] max-tablet:py-[90px] max-mobile:py-[72px]">
      <Reveal className="grid grid-cols-[1fr_0.78fr] items-end gap-[clamp(40px,8vw,110px)] max-tablet:grid-cols-1 max-tablet:gap-7">
        <div>
          <Eyebrow tone="fajr">{t("everywhereEyebrow")}</Eyebrow>
          <h2 className={`${HEADING} max-w-[690px] text-display-lg text-layl`}>
            {t("everywhereTitle")}
          </h2>
        </div>
        <p className="m-0 max-w-[470px] text-15 leading-[1.95] text-ink-soft">
          {t("everywhereBody")}
        </p>
      </Reveal>

      <div className="relative mt-14 grid grid-cols-3 gap-4 before:absolute before:inset-x-[16%] before:top-7 before:h-px before:bg-[image:linear-gradient(90deg,theme(colors.fajr.DEFAULT),theme(colors.sama),theme(colors.raml.DEFAULT))] before:opacity-40 before:content-[''] max-tablet:grid-cols-1 max-tablet:before:inset-x-auto max-tablet:before:inset-y-[16%] max-tablet:before:start-7 max-tablet:before:h-auto max-tablet:before:w-px max-tablet:before:bg-[image:linear-gradient(180deg,theme(colors.fajr.DEFAULT),theme(colors.sama),theme(colors.raml.DEFAULT))]">
        <Reveal>
          <SurfaceCard
            surface="app"
            tag={t("appSurfaceTag")}
            title={t("appSurfaceTitle")}
            body={t("appSurfaceBody")}
            action={
              <a className="inline-flex items-center gap-2" href="#features">
                {t("appSurfaceAction")}
                <ArrowIcon className="size-4 stroke-2 rtl:rotate-180" />
              </a>
            }
          />
        </Reveal>
        <Reveal delay={70}>
          <SurfaceCard
            featured
            surface="extension"
            tag={t("extensionSurfaceTag")}
            title={t("extensionSurfaceTitle")}
            body={t("extensionSurfaceBody")}
            action={
              <a
                className="inline-flex items-center gap-2"
                href={EXTENSION_URL}
                target="_blank"
                rel="noreferrer"
              >
                {t("extensionSurfaceAction")}
                <ArrowIcon className="size-4 stroke-2 rtl:rotate-180" />
              </a>
            }
          />
        </Reveal>
        <Reveal delay={140}>
          <SurfaceCard
            surface="web"
            tag={t("webSurfaceTag")}
            title={t("webSurfaceTitle")}
            body={t("webSurfaceBody")}
            action={
              <Link className="inline-flex items-center gap-2" to={TODAY_ROUTE}>
                {t("webSurfaceAction")}
                <ArrowIcon className="size-4 stroke-2 rtl:rotate-180" />
              </Link>
            }
          />
        </Reveal>
      </div>

      <Reveal
        delay={90}
        className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-full border border-line bg-surface-panel px-5 py-3 text-center text-11 font-bold text-ink before:size-2 before:rounded-full before:bg-sama before:shadow-[0_0_0_5px_rgba(77,168,218,0.12)] before:content-[''] max-mobile:w-full max-mobile:justify-center"
      >
        {t("everywherePromise")}
      </Reveal>
    </Shell>
  );
}
