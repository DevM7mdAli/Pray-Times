import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { appStorage } from "@/lib/storage";
import { NextPrayerMediumWidget } from "./NextPrayerMediumWidget";
import { NextPrayerSmallWidget } from "./NextPrayerSmallWidget";
import type { WidgetPayload } from "./payload";
import { WIDGET_PAYLOAD_STORAGE_KEY } from "./sync";

const nameToWidget = {
  NextPrayerSmall: NextPrayerSmallWidget,
  NextPrayerMedium: NextPrayerMediumWidget,
} as const;

async function readPayload(): Promise<WidgetPayload | undefined> {
  const raw = await appStorage.getItem(WIDGET_PAYLOAD_STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as WidgetPayload;
  } catch {
    return undefined;
  }
}

/**
 * Runs in a headless JS context (no Activity, no foreground app) whenever
 * Android adds, resizes, or periodically refreshes a widget. It never
 * recomputes prayer times — it only rereads the payload the foreground app
 * already wrote and compares timestamps against `Date.now()`.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const Widget = nameToWidget[props.widgetInfo.widgetName as keyof typeof nameToWidget];
  if (!Widget) return;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const payload = await readPayload();
      if (payload) props.renderWidget(<Widget payload={payload} />);
      break;
    }
    case "WIDGET_CLICK":
    case "WIDGET_DELETED":
    default:
      break;
  }
}
