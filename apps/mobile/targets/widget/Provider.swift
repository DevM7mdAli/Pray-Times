import WidgetKit
import Foundation

struct PrayerEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayloadData?
    let nextPrayer: PrayerRow?
    let nextIsTomorrow: Bool
}

struct Provider: TimelineProvider {
    /// Must match `ios.entitlements["com.apple.security.application-groups"]`
    /// in app.json and `IOS_APP_GROUP` in apps/mobile/src/widgets/sync.ts.
    static let appGroup = "group.com.devm7mdali.praytimes"
    static let payloadKey = "payload"

    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: .now, payload: nil, nextPrayer: nil, nextIsTomorrow: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        completion(buildEntries(from: .now).first ?? placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let entries = buildEntries(from: .now)
        let hasData = entries.contains { $0.nextPrayer != nil }
        let lastDate = entries.last?.date ?? Date()
        // With data: refresh once the timeline runs out (tomorrow's last prayer).
        // The app also proactively reloads via ExtensionStorage.reloadWidget()
        // whenever it fetches new prayer data, so this is only a backstop.
        let refreshAt = hasData ? lastDate : Date().addingTimeInterval(30 * 60)
        completion(Timeline(entries: entries, policy: .after(refreshAt)))
    }

    private func loadPayload() -> WidgetPayloadData? {
        guard let defaults = UserDefaults(suiteName: Self.appGroup),
              let json = defaults.string(forKey: Self.payloadKey),
              let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(WidgetPayloadData.self, from: data)
    }

    /// One entry per remaining prayer transition (today's remainder, then all
    /// of tomorrow's), so WidgetKit can flip "next prayer" on its own as each
    /// transition's date passes — no polling, no extra reloads.
    private func buildEntries(from referenceDate: Date) -> [PrayerEntry] {
        guard let payload = loadPayload() else {
            return [PrayerEntry(date: referenceDate, payload: nil, nextPrayer: nil, nextIsTomorrow: false)]
        }

        let nowMs = referenceDate.timeIntervalSince1970 * 1000
        let upcomingToday = payload.today.prayers
            .filter { $0.timestampMs >= nowMs }
            .map { (row: $0, isTomorrow: false) }
        let upcomingTomorrow = payload.tomorrow.prayers.map { (row: $0, isTomorrow: true) }
        let upcoming = upcomingToday + upcomingTomorrow

        guard !upcoming.isEmpty else {
            return [PrayerEntry(date: referenceDate, payload: payload, nextPrayer: nil, nextIsTomorrow: false)]
        }

        return upcoming.enumerated().map { index, item in
            let entryDate = index == 0
                ? referenceDate
                : Date(timeIntervalSince1970: upcoming[index - 1].row.timestampMs / 1000)
            return PrayerEntry(date: entryDate, payload: payload, nextPrayer: item.row, nextIsTomorrow: item.isTomorrow)
        }
    }
}
