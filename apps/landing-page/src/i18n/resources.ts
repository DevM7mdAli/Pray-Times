import arCommon from "./locales/ar/common.json";
import arLanding from "./locales/ar/landing.json";
import arToday from "./locales/ar/today.json";
import arLocation from "./locales/ar/location.json";
import arQibla from "./locales/ar/qibla.json";
import enCommon from "./locales/en/common.json";
import enLanding from "./locales/en/landing.json";
import enToday from "./locales/en/today.json";
import enLocation from "./locales/en/location.json";
import enQibla from "./locales/en/qibla.json";

/** Where the language preference has been stored since before i18next. */
export const LOCALE_STORAGE_KEY = "pray-times:landing-locale";

export const NAMESPACES = ["common", "landing", "today", "location", "qibla"] as const;

export const DEFAULT_NAMESPACE = "common";

export const resources = {
  ar: {
    common: arCommon,
    landing: arLanding,
    today: arToday,
    location: arLocation,
    qibla: arQibla,
  },
  en: {
    common: enCommon,
    landing: enLanding,
    today: enToday,
    location: enLocation,
    qibla: enQibla,
  },
} as const;
