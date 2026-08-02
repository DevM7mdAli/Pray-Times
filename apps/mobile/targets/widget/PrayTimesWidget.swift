import SwiftUI
import WidgetKit

struct PrayTimesWidget: Widget {
    let kind: String = "PrayTimesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            PrayTimesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Next Prayer")
        .description("Shows the next prayer, its time, and a live countdown.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
