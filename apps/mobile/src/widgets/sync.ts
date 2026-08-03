import { useEffect } from "react";
import { Platform } from "react-native";
import { ExtensionStorage } from "@bacons/apple-targets";
import type { City, IqamahSettingsByCity, PrayerDay, SupportedLocale } from "@pray-times/core";
import { appStorage } from "@/lib/storage";
import { buildWidgetPayload } from "./payload";
import { pushAndroidWidgetUpdate } from "./push-update";

/** Must match `ios.entitlements["com.apple.security.application-groups"]` in app.json. */
const IOS_APP_GROUP = "group.com.devm7mdali.praytimes";
const IOS_PAYLOAD_KEY = "payload";

export const WIDGET_PAYLOAD_STORAGE_KEY = "pray-times:widget-payload:v1";

export function useSyncWidgets(options: {
  today: PrayerDay | undefined;
  tomorrow: PrayerDay | undefined;
  city: City;
  locale: SupportedLocale;
  isRtl: boolean;
  iqamahByCity: IqamahSettingsByCity;
}) {
  const { today, tomorrow, city, locale, isRtl, iqamahByCity } = options;

  useEffect(() => {
    if (!today || !tomorrow) return;
    const payload = buildWidgetPayload({ today, tomorrow, city, locale, isRtl, iqamahByCity });
    const serialized = JSON.stringify(payload);

    if (Platform.OS === "ios") {
      const storage = new ExtensionStorage(IOS_APP_GROUP);
      storage.set(IOS_PAYLOAD_KEY, serialized);
      ExtensionStorage.reloadWidget();
    } else if (Platform.OS === "android") {
      void appStorage.setItem(WIDGET_PAYLOAD_STORAGE_KEY, serialized).then(() => {
        void pushAndroidWidgetUpdate(payload);
      });
    }
  }, [today, tomorrow, city, locale, isRtl, iqamahByCity]);
}
