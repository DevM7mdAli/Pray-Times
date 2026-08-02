import SwiftUI
import WidgetKit

struct PrayTimesWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        content
            .environment(\.layoutDirection, (entry.payload?.isRtl ?? false) ? .rightToLeft : .leftToRight)
            .environment(\.locale, Locale(identifier: (entry.payload?.locale ?? "en") == "ar" ? "ar" : "en"))
            .widgetURL(URL(string: "praytimes://"))
            .containerBackground(Color("bgRaised"), for: .widget)
    }

    @ViewBuilder
    private var content: some View {
        if let payload = entry.payload, let next = entry.nextPrayer {
            switch family {
            case .systemMedium:
                MediumPrayerView(payload: payload, next: next, isTomorrow: entry.nextIsTomorrow)
            default:
                SmallPrayerView(payload: payload, next: next, isTomorrow: entry.nextIsTomorrow)
            }
        } else {
            PlaceholderPrayerView()
        }
    }
}

private struct SmallPrayerView: View {
    let payload: WidgetPayloadData
    let next: PrayerRow
    let isTomorrow: Bool

    private var targetDate: Date { Date(timeIntervalSince1970: next.timestampMs / 1000) }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(WidgetLabels.nextPrayer(locale: payload.locale, isTomorrow: isTomorrow))
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Color("gold"))

            Text(next.name)
                .font(.system(size: 21, weight: .bold))
                .foregroundStyle(Color("textPrimary"))
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(next.time)
                .font(.system(size: 15))
                .foregroundStyle(Color("gold"))

            Spacer(minLength: 6)

            Rectangle()
                .fill(Color("divider"))
                .frame(height: 1)

            HStack {
                Text(payload.cityName)
                    .font(.system(size: 11))
                    .foregroundStyle(Color("muted"))
                    .lineLimit(1)
                Spacer()
                Text(targetDate, style: .relative)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color("textPrimary"))
                    .lineLimit(1)
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct MediumPrayerView: View {
    let payload: WidgetPayloadData
    let next: PrayerRow
    let isTomorrow: Bool

    private var targetDate: Date { Date(timeIntervalSince1970: next.timestampMs / 1000) }

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            VStack(alignment: .leading, spacing: 2) {
                Text(WidgetLabels.nextPrayer(locale: payload.locale, isTomorrow: isTomorrow))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color("gold"))
                Text(next.name)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Color("textPrimary"))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(next.time)
                    .font(.system(size: 14))
                    .foregroundStyle(Color("gold"))
                Text(targetDate, style: .relative)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color("muted"))
                    .padding(.top, 4)
            }
            .frame(width: 120, alignment: .leading)

            Rectangle()
                .fill(Color("divider"))
                .frame(width: 1)

            VStack(alignment: .leading, spacing: 5) {
                Text(WidgetLabels.schedule(locale: payload.locale))
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color("muted"))

                ForEach(payload.today.prayers, id: \.key) { row in
                    let isNext = !isTomorrow && row.key == next.key
                    HStack {
                        Text(row.name)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(Color("textPrimary"))
                            .lineLimit(1)
                        Spacer()
                        Text(row.time)
                            .font(.system(size: 13, weight: isNext ? .bold : .regular))
                            .foregroundStyle(isNext ? Color("gold") : Color("muted"))
                    }
                    .padding(.horizontal, isNext ? 6 : 0)
                    .padding(.vertical, 2)
                    .background(isNext ? Color("blue").opacity(0.14) : .clear)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct PlaceholderPrayerView: View {
    var body: some View {
        VStack(spacing: 6) {
            Text("Pray Times")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Color("textPrimary"))
            Text("Open the app to sync prayer times")
                .font(.system(size: 11))
                .foregroundStyle(Color("muted"))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}
