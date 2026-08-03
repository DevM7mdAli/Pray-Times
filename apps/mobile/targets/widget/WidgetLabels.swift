import Foundation

/// Mirrors apps/mobile/src/widgets/labels.ts, which itself is copied from
/// apps/mobile/src/lib/i18n.ts — kept in sync by hand since this target can't
/// import the app's i18next runtime.
enum WidgetLabels {
    static func nextPrayer(locale: String, isTomorrow: Bool) -> String {
        if locale == "ar" {
            return isTomorrow ? "الصلاة القادمة غدًا" : "الصلاة القادمة"
        }
        return isTomorrow ? "Next prayer tomorrow" : "Next prayer"
    }

    static func schedule(locale: String) -> String {
        locale == "ar" ? "مواقيت اليوم" : "Today’s schedule"
    }

    static func iqamah(locale: String) -> String {
        locale == "ar" ? "الإقامة" : "Iqamah"
    }
}
