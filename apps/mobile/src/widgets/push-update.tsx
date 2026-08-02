import { requestWidgetUpdate } from "react-native-android-widget";
import { NextPrayerMediumWidget } from "./NextPrayerMediumWidget";
import { NextPrayerSmallWidget } from "./NextPrayerSmallWidget";
import type { WidgetPayload } from "./payload";

/** Pushes a fresh render to any home-screen instances while the app is foregrounded. */
export async function pushAndroidWidgetUpdate(payload: WidgetPayload) {
  await requestWidgetUpdate({
    widgetName: "NextPrayerSmall",
    renderWidget: () => <NextPrayerSmallWidget payload={payload} />,
  });
  await requestWidgetUpdate({
    widgetName: "NextPrayerMedium",
    renderWidget: () => <NextPrayerMediumWidget payload={payload} />,
  });
}
