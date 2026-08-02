import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector, { type CustomDetector } from "i18next-browser-languagedetector";
import { isSupportedLocale } from "@pray-times/core";
import { DEFAULT_NAMESPACE, LOCALE_STORAGE_KEY, NAMESPACES, resources } from "./resources";

/**
 * Each lookup validates through core's `isSupportedLocale` and returns
 * `undefined` when it cannot answer, so an unknown value falls through to the
 * next detector instead of being rejected later against `supportedLngs` — which
 * would skip the remaining sources and land on the fallback.
 */
const queryString: CustomDetector = {
  name: "prayTimesQueryString",
  lookup: () => {
    const requested = new URLSearchParams(window.location.search).get("lang");
    return isSupportedLocale(requested) ? requested : undefined;
  },
};

const storage: CustomDetector = {
  name: "prayTimesStorage",
  lookup: () => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      return isSupportedLocale(stored) ? stored : undefined;
    } catch {
      // The page remains usable when storage is unavailable.
      return undefined;
    }
  },
  cacheUserLanguage: (language) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, language);
    } catch {
      // Storage is optional; the URL still reflects a chosen language.
    }
  },
};

/**
 * Arabic wins if it appears anywhere in the browser's language list, not only
 * when it is listed first. A bilingual reader who lists English ahead of Arabic
 * still gets Arabic prayer names, which is the behaviour this project shipped
 * with and the audience it was built for.
 */
const browserPreference: CustomDetector = {
  name: "prayTimesBrowser",
  lookup: () =>
    navigator.languages.some((language) => language.toLowerCase().startsWith("ar")) ? "ar" : "en",
};

const detector = new LanguageDetector();
detector.addDetector(queryString);
detector.addDetector(storage);
detector.addDetector(browserPreference);

void i18next
  .use(detector)
  .use(initReactI18next)
  .init({
    resources,
    ns: NAMESPACES,
    defaultNS: DEFAULT_NAMESPACE,
    fallbackLng: "en",
    supportedLngs: ["ar", "en"],
    load: "languageOnly",
    detection: {
      order: [queryString.name, storage.name, browserPreference.name],
      caches: [storage.name],
    },
    // React escapes rendered values already.
    interpolation: { escapeValue: false },
  });

export { i18next };
