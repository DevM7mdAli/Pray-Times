import { useEffect, useMemo, useState } from "react";
import { Switch } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import {
  allPrayerMethods,
  cityName,
  prayerKeysForCity,
  prayerMethodForCity,
  prayerMethodName,
  prayerNameForCity,
} from "@pray-times/core";
import { Card, Kicker, Screen } from "@/components/ui";
import { Pressable, Text, View } from "@/components/primitives";
import {
  disablePrayerNotifications,
  requestNotificationPermission,
} from "@/features/notifications/service";
import i18n from "@/lib/i18n";
import { selectedCityForPreferences, usePreferencesStore } from "@/store/preferences-store";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const preferences = usePreferencesStore(
    useShallow((state) => ({
      locale: state.locale,
      cityId: state.cityId,
      savedCities: state.savedCities,
      methodOverrides: state.methodOverrides,
      enabledPrayers: state.enabledPrayers,
      notificationsEnabled: state.notificationsEnabled,
    }))
  );
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const setNotificationsEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const setPrayerEnabled = usePreferencesStore((state) => state.setPrayerEnabled);
  const setMethodOverride = usePreferencesStore((state) => state.setMethodOverride);
  const city = useMemo(() => selectedCityForPreferences(preferences), [preferences]);
  const [notificationError, setNotificationError] = useState<string>();

  useEffect(() => {
    void i18n.changeLanguage(preferences.locale);
  }, [preferences.locale]);

  const changeNotifications = async (enabled: boolean) => {
    setNotificationError(undefined);
    if (!enabled) {
      await disablePrayerNotifications();
      setNotificationsEnabled(false);
      return;
    }
    if (await requestNotificationPermission()) setNotificationsEnabled(true);
    else setNotificationError(t("notificationDenied"));
  };

  return (
    <Screen>
      <View className="gap-2">
        <Kicker>{t("settings")}</Kicker>
        <Text className="text-29 text-nur font-bold">{t("settings")}</Text>
      </View>

      <Card className="gap-4">
        <Text className="text-17 text-nur font-bold">{t("language")}</Text>
        <View className="flex-row gap-3">
          {(["en", "ar"] as const).map((locale) => (
            <Pressable
              className={`rounded-13 flex-1 px-4 py-3 ${preferences.locale === locale ? "bg-raml" : "border-nur/20 border"}`}
              key={locale}
              onPress={() => setLocale(locale)}
            >
              <Text
                className={`text-center font-bold ${preferences.locale === locale ? "text-layl" : "text-nur"}`}
              >
                {locale === "ar" ? "العربية" : "English"}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card className="gap-4">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text className="text-17 text-nur font-bold">{t("notifications")}</Text>
            <Text className="text-13 text-muted">{t("notificationsBody")}</Text>
          </View>
          <Switch
            onValueChange={(value) => void changeNotifications(value)}
            thumbColor={preferences.notificationsEnabled ? "#f2d6a2" : "#aebbd4"}
            value={preferences.notificationsEnabled}
          />
        </View>
        {notificationError ? <Text className="text-fajr">{notificationError}</Text> : null}
        <Text className="text-13 text-muted font-bold">{t("alertMeFor")}</Text>
        {prayerKeysForCity(city).map((key) => (
          <View className="flex-row items-center justify-between py-1" key={key}>
            <Text className="text-nur">{prayerNameForCity(key, city, preferences.locale)}</Text>
            <Switch
              onValueChange={(value) => setPrayerEnabled(key, value)}
              thumbColor={preferences.enabledPrayers[key] ? "#f2d6a2" : "#aebbd4"}
              value={preferences.enabledPrayers[key]}
            />
          </View>
        ))}
      </Card>

      <Card className="gap-3">
        <Text className="text-17 text-nur font-bold">{t("calculation")}</Text>
        <Text className="text-13 text-muted">{cityName(city, preferences.locale)}</Text>
        <Pressable
          className="rounded-13 border-nur/15 border px-4 py-3"
          onPress={() => setMethodOverride(city.id)}
        >
          <Text className="text-nur font-bold">
            {t("defaultMethod")} ·{" "}
            {prayerMethodName(
              prayerMethodForCity({ ...city, methodId: undefined }),
              preferences.locale
            )}
          </Text>
        </Pressable>
        {allPrayerMethods().map((method) => (
          <Pressable
            className={`rounded-13 px-4 py-3 ${city.methodId === method.id ? "bg-sama/20" : "border-nur/10 border"}`}
            key={method.id}
            onPress={() => setMethodOverride(city.id, method.id)}
          >
            <Text className="text-nur">{prayerMethodName(method, preferences.locale)}</Text>
          </Pressable>
        ))}
      </Card>

      <Pressable
        className="rounded-13 border-nur/20 items-center border px-4 py-3"
        onPress={() => router.push("/places")}
      >
        <Text className="text-nur font-bold">{t("choosePlace")}</Text>
      </Pressable>
    </Screen>
  );
}
