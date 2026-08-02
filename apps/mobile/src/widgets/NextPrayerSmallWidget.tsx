'use no memo';
import { formatRemainingTime } from "@pray-times/core";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { widgetLabel } from "./labels";
import { pickNextEntry, type WidgetPayload } from "./payload";
import { widgetColors } from "./theme";

export function NextPrayerSmallWidget({ payload }: { payload: WidgetPayload }) {
  const now = Date.now();
  const next = pickNextEntry(payload, now);
  const isRtl = payload.isRtl;
  const align = isRtl ? "right" : "left";

  const cityLabel = (
    <FlexWidget key="city" style={{ flex: 1 }}>
      <TextWidget
        text={payload.cityName}
        maxLines={1}
        truncate="END"
        style={{ fontSize: 11, color: widgetColors.muted, textAlign: align }}
      />
    </FlexWidget>
  );
  const remainingLabel = next ? (
    <TextWidget
      key="remaining"
      text={formatRemainingTime(Math.max(0, Math.ceil((next.timestampMs - now) / 60_000)), payload.locale)}
      style={{ fontSize: 13, fontWeight: "700", color: widgetColors.white }}
    />
  ) : null;
  const footerColumns = isRtl ? [remainingLabel, cityLabel] : [cityLabel, remainingLabel];

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: widgetColors.bgRaised,
        borderRadius: 22,
        padding: 16,
      }}
      accessibilityLabel="Pray Times"
    >
      <FlexWidget style={{ flexDirection: "column", width: "match_parent" }}>
        <TextWidget
          text={widgetLabel(payload.locale, next?.isTomorrow ? "nextPrayerTomorrow" : "nextPrayer")}
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: widgetColors.gold,
            textAlign: align,
          }}
        />
        <TextWidget
          text={next?.name ?? "—"}
          maxLines={1}
          truncate="END"
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: widgetColors.white,
            textAlign: align,
            marginTop: 2,
          }}
        />
        <TextWidget
          text={next?.time ?? ""}
          style={{
            fontSize: 15,
            color: widgetColors.gold,
            textAlign: align,
            marginTop: 2,
          }}
        />
      </FlexWidget>

      {next ? (
        <FlexWidget
          style={{
            width: "match_parent",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderTopWidth: 1,
            borderTopColor: widgetColors.divider,
            paddingTop: 8,
          }}
        >
          {footerColumns}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}
