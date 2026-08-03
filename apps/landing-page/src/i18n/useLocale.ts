import { useCallback, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { isSupportedLocale, localeDirection, type SupportedLocale } from "@pray-times/core";

/**
 * The active locale, narrowed to what core's formatters accept. i18next is the
 * single source of truth for it — nothing mirrors it into component state.
 */
export function useLocale(): SupportedLocale {
  const { i18n } = useTranslation();
  return isSupportedLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";
}

/** Flips between the two supported locales, persisting through i18next's cache. */
export function useToggleLocale(): () => void {
  const { i18n } = useTranslation();
  const locale = useLocale();
  return useCallback(() => {
    void i18n.changeLanguage(locale === "ar" ? "en" : "ar");
  }, [i18n, locale]);
}

/**
 * Keeps the document in step with the locale: direction and language for
 * assistive technology and text shaping, the title and description for tabs and
 * shares, and `?lang=` so a copied link opens in the language it was read in.
 */
export function useDocumentLocale(meta: { title: string; description?: string }): void {
  const locale = useLocale();
  const { title, description } = meta;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = localeDirection(locale);
    document.title = title;
    if (description !== undefined) {
      document.querySelector('meta[name="description"]')?.setAttribute("content", description);
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
      document
        .querySelector('meta[property="og:description"]')
        ?.setAttribute("content", description);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("lang", locale);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [description, locale, title]);
}
