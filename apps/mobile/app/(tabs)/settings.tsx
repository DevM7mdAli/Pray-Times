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
  type IqamahTimeSetting,
} from "@pray-times/core";
import { Card, DirectionalStack, Kicker, Screen } from "@/components/ui";
import { Pressable, Text, TextInput, View } from "@/components/primitives";
import {
  disablePrayerNotifications,
  requestNotificationPermission,
} from "@/features/notifications/service";
import { usePrayerDays } from "@/features/prayer-times/queries";
import { selectedCityForPreferences, usePreferencesStore } from "@/store/preferences-store";

function SettingButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-10 flex-1 p-2 ${active ? "bg-sama/20" : "border-nur/10 border"}`}
      onPress={onPress}
    >
      <Text align="center" className={`text-11 font-bold ${active ? "text-nur" : "text-muted"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function OffsetInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <TextInput
      className="rounded-10 border-nur/15 bg-layl text-nur h-10 border px-3 text-center"
      align="center"
      contentDirection="ltr"
      keyboardType="number-pad"
      maxLength={3}
      value={draft}
      onBlur={() => {
        const candidate = Number(draft);
        if (!Number.isFinite(candidate)) setDraft(String(value));
        else onChange(Math.min(180, Math.max(0, Math.round(candidate))));
      }}
      onChangeText={setDraft}
    />
  );
}

function ExactTimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <TextInput
      className="rounded-10 border-nur/15 bg-layl text-nur h-10 border px-3 text-center"
      align="center"
      contentDirection="ltr"
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      placeholder="HH:MM"
      placeholderTextColor="#667592"
      value={draft}
      onBlur={() => {
        if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft)) onChange(draft);
        else setDraft(value);
      }}
      onChangeText={setDraft}
    />
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const preferences = usePreferencesStore(
    useShallow((state) => ({
      locale: state.locale,
      cityId: state.cityId,
      savedCities: state.savedCities,
      methodOverrides: state.methodOverrides,
      iqamahByCity: state.iqamahByCity,
      enabledPrayers: state.enabledPrayers,
      notificationsEnabled: state.notificationsEnabled,
    }))
  );
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const setNotificationsEnabled = usePreferencesStore((state) => state.setNotificationsEnabled);
  const setPrayerEnabled = usePreferencesStore((state) => state.setPrayerEnabled);
  const setMethodOverride = usePreferencesStore((state) => state.setMethodOverride);
  const setIqamahSetting = usePreferencesStore((state) => state.setIqamahSetting);
  const city = useMemo(() => selectedCityForPreferences(preferences), [preferences]);
  const now = useMemo(() => new Date(), []);
  const { today } = usePrayerDays(city, now);
  const [notificationError, setNotificationError] = useState<string>();

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
      <DirectionalStack gap={8}>
        <Kicker>{t("settings")}</Kicker>
        <Text className="text-29 text-nur font-bold">{t("settings")}</Text>
      </DirectionalStack>

      <Card className="gap-4">
        <DirectionalStack>
          <Text className="text-17 text-nur font-bold">{t("language")}</Text>
        </DirectionalStack>
        <View className="flex-row gap-3">
          {(["en", "ar"] as const).map((locale) => (
            <Pressable
              className={`rounded-13 flex-1 px-4 py-3 ${preferences.locale === locale ? "bg-raml" : "border-nur/20 border"}`}
              key={locale}
              onPress={() => setLocale(locale)}
            >
              <Text
                align="center"
                className={`font-bold ${preferences.locale === locale ? "text-layl" : "text-nur"}`}
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
        <DirectionalStack>
          <Text className="text-13 text-muted font-bold">{t("alertMeFor")}</Text>
        </DirectionalStack>
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

      <Card className="gap-4">
        <DirectionalStack gap={4}>
          <Text className="text-17 text-nur font-bold">{t("iqamahTitle")}</Text>
          <Text className="text-13 text-muted">{t("iqamahDescription")}</Text>
        </DirectionalStack>
        {prayerKeysForCity(city).map((key) => {
          const setting = preferences.iqamahByCity[city.id]?.[key];
          const setMode = (mode?: IqamahTimeSetting["mode"]) => {
            const next =
              mode === undefined
                ? undefined
                : mode === "offset"
                  ? ({ mode, minutes: 20 } as const)
                  : ({ mode, time: today.data?.timings[key].slice(0, 5) ?? "00:00" } as const);
            setIqamahSetting(city.id, key, next);
          };
          return (
            <View className="border-nur/10 gap-3 border-t pt-4" key={key}>
              <Text className="text-nur font-bold">
                {prayerNameForCity(key, city, preferences.locale)}
              </Text>
              <View className="flex-row gap-2">
                <SettingButton
                  active={!setting}
                  label={t("iqamahNotSet")}
                  onPress={() => setMode()}
                />
                <SettingButton
                  active={setting?.mode === "offset"}
                  label={t("iqamahOffset")}
                  onPress={() => setMode("offset")}
                />
                <SettingButton
                  active={setting?.mode === "exact"}
                  label={t("iqamahExact")}
                  onPress={() => setMode("exact")}
                />
              </View>
              {setting?.mode === "offset" ? (
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <OffsetInput
                      value={setting.minutes}
                      onChange={(minutes) =>
                        setIqamahSetting(city.id, key, { mode: "offset", minutes })
                      }
                    />
                  </View>
                  <Text className="text-13 text-muted">{t("iqamahMinutes")}</Text>
                </View>
              ) : setting?.mode === "exact" ? (
                <ExactTimeInput
                  value={setting.time}
                  onChange={(time) => setIqamahSetting(city.id, key, { mode: "exact", time })}
                />
              ) : null}
            </View>
          );
        })}
      </Card>

      <Card className="gap-3">
        <DirectionalStack gap={4}>
          <Text className="text-17 text-nur font-bold">{t("calculation")}</Text>
          <Text className="text-13 text-muted">{cityName(city, preferences.locale)}</Text>
        </DirectionalStack>
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

      <View className="border-nur/10 border-t pt-5">
        <Text align="center" className="text-13 text-muted leading-6">
          {t("dedication")}
        </Text>
      </View>
    </Screen>
  );
}
