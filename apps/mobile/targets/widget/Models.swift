import Foundation

/// Mirrors `apps/mobile/src/widgets/payload.ts`'s `WidgetPrayerEntry`. Every
/// value here is already locale-formatted by the JS side — this target never
/// does timezone or locale math, only timestamp comparisons.
struct PrayerRow: Codable, Hashable {
    let key: String
    let name: String
    let time: String
    let timestampMs: Double
}

/// Mirrors `WidgetPayload` from `apps/mobile/src/widgets/payload.ts`.
struct WidgetPayloadData: Codable {
    struct DayPayload: Codable {
        let date: String
        let prayers: [PrayerRow]
    }

    let locale: String
    let isRtl: Bool
    let cityName: String
    let hijriDate: String
    let updatedAt: Double
    let today: DayPayload
    let tomorrow: DayPayload
}
