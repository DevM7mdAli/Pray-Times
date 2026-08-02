import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AyahQuote } from "../../../components/AyahQuote";
import { Card } from "../../../components/Card";
import { ayahQuery } from "../../../queries/ayah";

export function AyahPanel() {
  const { t } = useTranslation("today");
  const ayah = useQuery(ayahQuery());

  return (
    <Card
      className="relative mt-6 overflow-hidden bg-layl-soft/[0.72] bg-[image:radial-gradient(circle_at_88%_0%,rgba(242,214,162,0.13),transparent_24rem)] px-[38px] pb-[38px] pt-[34px] before:absolute before:inset-y-[34px] before:start-0 before:w-0.75 before:rounded-full before:bg-[image:linear-gradient(theme(colors.raml.DEFAULT),theme(colors.fajr.DEFAULT))] before:content-[''] max-mobile:px-[22px] max-mobile:pb-7.5 max-mobile:pt-[27px] max-mobile:before:inset-y-[27px]"
      aria-labelledby="today-ayah-title"
      aria-busy={ayah.isFetching}
    >
      <div className="relative z-[1] flex items-center justify-between gap-6 max-mobile:flex-col max-mobile:items-start">
        <div>
          <p className="m-0 text-11 font-extrabold tracking-[0.09em] text-raml">
            {t("ayahKicker")}
          </p>
          <h2 className="m-0 mt-1.25 font-display text-2xl font-bold" id="today-ayah-title">
            {t("ayahTitle")}
          </h2>
        </div>
        <button
          className="min-h-[42px] flex-none cursor-pointer rounded-xl border border-raml/[0.36] bg-raml/[0.08] px-[17px] font-bold text-raml transition-[color,border-color,background] duration-150 disabled:cursor-progress disabled:opacity-55 max-mobile:w-full [&:hover:not(:disabled)]:border-raml [&:hover:not(:disabled)]:bg-raml [&:hover:not(:disabled)]:text-layl"
          type="button"
          onClick={() => void ayah.refetch()}
          disabled={ayah.isFetching}
        >
          {t("ayahRefresh")}
        </button>
      </div>
      <div className="relative z-[1] mt-[26px] min-h-[118px]" aria-live="polite">
        {ayah.data ? (
          <blockquote className="m-0 border-0 p-0">
            <AyahQuote ayah={ayah.data} className="max-w-[58rem] text-nur" />
          </blockquote>
        ) : (
          <p className={`mb-0 mt-[34px] ${ayah.isError ? "text-fajr" : "text-muted"}`}>
            {ayah.isError ? t("ayahError") : t("ayahLoading")}
          </p>
        )}
      </div>
    </Card>
  );
}
