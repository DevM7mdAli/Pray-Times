import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { Ayah } from "@pray-times/core";
import { useLocale } from "../i18n/useLocale";

/**
 * The verse and its attribution. Returns a fragment rather than its own
 * blockquote, because the landing page and the Today panel each already have a
 * wrapper of their own; only the paragraph's colour and width differ.
 */
export function AyahQuote({ ayah, className = "" }: { ayah: Ayah; className?: string }) {
  const { t } = useTranslation("common");
  const locale = useLocale();
  const surah =
    locale === "en" && ayah.surah.englishName ? ayah.surah.englishName : ayah.surah.name;

  return (
    <>
      <p className={clsx("m-0 font-quran text-display-md", className)} lang="ar" dir="rtl">
        ﴿{ayah.text}﴾
      </p>
      <cite className="mt-3 block font-display text-xs font-bold not-italic text-fajr">
        {surah} · {t("verseNumber")} {ayah.numberInSurah}
      </cite>
    </>
  );
}
