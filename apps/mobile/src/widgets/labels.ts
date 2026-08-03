import type { SupportedLocale } from "@pray-times/core";

/**
 * Copied from apps/mobile/src/lib/i18n.ts — widgets render outside the app's
 * i18next runtime (headless JS on Android, native Swift on iOS), so the small
 * set of strings they need is duplicated here rather than pulling in i18next.
 */
const WIDGET_LABELS = {
  en: {
    nextPrayer: "Next prayer",
    nextPrayerTomorrow: "Next prayer tomorrow",
    schedule: "Today’s schedule",
    iqamah: "Iqamah",
  },
  ar: {
    nextPrayer: "الصلاة القادمة",
    nextPrayerTomorrow: "الصلاة القادمة غدًا",
    schedule: "مواقيت اليوم",
    iqamah: "الإقامة",
  },
} as const satisfies Record<SupportedLocale, Record<string, string>>;

export function widgetLabel(
  locale: SupportedLocale,
  key: keyof (typeof WIDGET_LABELS)["en"]
): string {
  return WIDGET_LABELS[locale][key];
}
