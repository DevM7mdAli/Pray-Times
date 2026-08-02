"use no memo";
import { formatRemainingTime } from "@pray-times/core";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { widgetLabel } from "./labels";
import { pickNextEntry, type WidgetPayload } from "./payload";
import { widgetColors } from "./theme";

export function NextPrayerMediumWidget({ payload }: { payload: WidgetPayload }) {
  const now = Date.now();
  const next = pickNextEntry(payload, now);
  const isRtl = payload.isRtl;
  const align = isRtl ? "right" : "left";
  // Today's full timeline, like the in-app schedule card — not filtered to
  // "remaining only" — matches app/(tabs)/index.tsx's dayTimeline rendering.
  const rows = payload.today.prayers.map((entry) => ({
    ...entry,
    isNext: !next?.isTomorrow && entry.key === next?.key,
  }));

  const nextBlock = (
    <FlexWidget
      key="next"
      style={{ flexDirection: "column", width: 120, justifyContent: "center" }}
    >
      <TextWidget
        text={widgetLabel(payload.locale, next?.isTomorrow ? "nextPrayerTomorrow" : "nextPrayer")}
        style={{ fontSize: 11, fontWeight: "700", color: widgetColors.gold, textAlign: align }}
      />
      <TextWidget
        text={next?.name ?? "—"}
        maxLines={1}
        truncate="END"
        style={{
          fontSize: 19,
          fontWeight: "700",
          color: widgetColors.white,
          textAlign: align,
          marginTop: 2,
        }}
      />
      <TextWidget
        text={next?.time ?? ""}
        style={{ fontSize: 14, color: widgetColors.gold, textAlign: align, marginTop: 2 }}
      />
      {next ? (
        <TextWidget
          text={formatRemainingTime(
            Math.max(0, Math.ceil((next.timestampMs - now) / 60_000)),
            payload.locale
          )}
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: widgetColors.muted,
            textAlign: align,
            marginTop: 6,
          }}
        />
      ) : null}
    </FlexWidget>
  );

  const divider = (
    <FlexWidget
      key="divider"
      style={{
        width: 1,
        height: "match_parent",
        backgroundColor: widgetColors.divider,
        marginHorizontal: 14,
      }}
    />
  );

  const scheduleBlock = (
    <FlexWidget
      key="schedule"
      style={{ flexDirection: "column", flex: 1, justifyContent: "center" }}
    >
      <TextWidget
        text={widgetLabel(payload.locale, "schedule")}
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: widgetColors.muted,
          textAlign: align,
          marginBottom: 4,
        }}
      />
      {rows.map((row) => (
        <FlexWidget
          key={row.key}
          style={{
            flexDirection: "row",
            width: "match_parent",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 3,
            paddingHorizontal: row.isNext ? 6 : 0,
            borderRadius: 8,
            backgroundColor: row.isNext ? "#1A4da8da" : undefined,
          }}
        >
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget
              text={row.name}
              maxLines={1}
              truncate="END"
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: widgetColors.white,
                textAlign: align,
              }}
            />
          </FlexWidget>
          <TextWidget
            text={row.time}
            style={{
              fontSize: 13,
              fontWeight: row.isNext ? "700" : "normal",
              color: row.isNext ? widgetColors.gold : widgetColors.muted,
              marginLeft: 8,
            }}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  );

  const columns = isRtl ? [scheduleBlock, divider, nextBlock] : [nextBlock, divider, scheduleBlock];

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: widgetColors.bgRaised,
        borderRadius: 22,
        padding: 16,
      }}
      accessibilityLabel="Pray Times"
    >
      {columns}
    </FlexWidget>
  );
}
