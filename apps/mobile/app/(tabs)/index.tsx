import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import {
  VerificationError,
  cityName,
  dayTimeline,
  fastingStatusFor,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  iqamahTimeFor,
  nextPrayerFor,
  prayerNameForCity,
  sunriseName,
  sunsetName,
} from "@pray-times/core";
import {
  Card,
  DirectionalStack,
  Kicker,
  OutlineButton,
  PrimaryButton,
  Screen,
} from "@/components/ui";
import { Pressable, Text, View } from "@/components/primitives";
import { reconcilePrayerNotifications } from "@/features/notifications/service";
import { useAyah, useFreshAyahNumber, usePrayerDays } from "@/features/prayer-times/queries";
import { useAppDirection } from "@/lib/direction";
import { selectedCityForPreferences, usePreferencesStore } from "@/store/preferences-store";
import { useSyncWidgets } from "@/widgets/sync";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function TodayScreen() {
  const { t } = useTranslation();
  const { isRtl } = useAppDirection();
  const now = useClock();
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
  const city = useMemo(() => selectedCityForPreferences(preferences), [preferences]);
  const { today, tomorrow } = usePrayerDays(city, now);
  const [ayahNumber, refreshAyah] = useFreshAyahNumber();
  const ayah = useAyah(ayahNumber);

  useEffect(() => {
    if (!preferences.notificationsEnabled || !today.data || !tomorrow.data) return;
    void reconcilePrayerNotifications({
      days: [today.data, tomorrow.data],
      city,
      locale: preferences.locale,
      enabledPrayers: preferences.enabledPrayers,
    }).catch(() => {
      // Notification scheduling remains optional; a verified day must still render.
    });
  }, [
    city,
    preferences.enabledPrayers,
    preferences.locale,
    preferences.notificationsEnabled,
    today.data,
    tomorrow.data,
  ]);

  useSyncWidgets({
    today: today.data,
    tomorrow: tomorrow.data,
    city,
    locale: preferences.locale,
    isRtl,
  });

  const day = today.data;
  const todayNext = day ? nextPrayerFor(day, now) : undefined;
  const nextDay = todayNext?.isTomorrow ? tomorrow.data : day;
  const next = nextDay ? nextPrayerFor(nextDay, now) : undefined;
  const fasting = day ? fastingStatusFor(day, now) : undefined;
  const todayError = today.error;
  const zoneMismatch = todayError instanceof VerificationError && todayError.field === "timeZone";

  return (
    <Screen>
      <DirectionalStack gap={8}>
        <Kicker>{t("today")}</Kicker>
        <Text className="text-29 text-nur font-bold">{t("prayerTimes")}</Text>
        <Text className="text-15 text-muted">{t("verifiedTimes")}</Text>
      </DirectionalStack>

      <Pressable
        className="rounded-15 border-nur/15 bg-layl-soft flex-row items-center justify-between border p-4"
        onPress={() => router.push("/places")}
      >
        <View>
          <Text className="text-11 text-muted">{t("choosePlace")}</Text>
          <Text className="text-17 text-nur mt-1 font-bold">
            {cityName(city, preferences.locale)}
          </Text>
        </View>
        <Text className="text-raml" contentDirection="ltr">
          {isRtl ? "‹" : "›"}
        </Text>
      </Pressable>

      {today.isPending && !day ? (
        <Card className="items-center gap-3 py-12">
          <ActivityIndicator color="#4da8da" />
          <Text className="text-muted">{t("loading")}</Text>
        </Card>
      ) : null}

      {today.isError && !day ? (
        <Card className="items-center gap-4 py-10">
          <Text align="center" className="text-17 text-fajr font-bold">
            {zoneMismatch ? t("zoneMismatch") : t("unavailable")}
          </Text>
          <PrimaryButton onPress={() => void today.refetch()}>{t("retry")}</PrimaryButton>
        </Card>
      ) : null}

      {day ? (
        <>
          <Card className="bg-layl-raised gap-5 overflow-hidden">
            <DirectionalStack gap={4}>
              <Text className="text-13 text-raml font-bold">
                {nextDay?.requestedDate !== day.requestedDate
                  ? t("nextPrayerTomorrow")
                  : t("nextPrayer")}
              </Text>
              {next && nextDay ? (
                <>
                  <Text className="text-29 text-nur font-bold">
                    {prayerNameForCity(next.key, nextDay.city, preferences.locale)}
                  </Text>
                  <Text className="text-22 text-raml">
                    {formatPrayerTime(next.time, preferences.locale)}
                  </Text>
                </>
              ) : (
                <Text className="text-17 text-muted">{t("loading")}</Text>
              )}
            </DirectionalStack>
            {next ? (
              <View className="border-nur/10 flex-row items-center justify-between border-t pt-4">
                <Text className="text-muted">{t("remaining")}</Text>
                <Text className="text-19 text-nur font-bold">
                  {formatRemainingTime(next.minutesUntil, preferences.locale)}
                </Text>
              </View>
            ) : null}
          </Card>

          {fasting ? (
            <Card className="border-raml/40 gap-2 border">
              <DirectionalStack>
                <Kicker>{preferences.locale === "ar" ? "رمضان" : "Ramadan"}</Kicker>
              </DirectionalStack>
              {fasting.phase === "completed" ? (
                <DirectionalStack>
                  <Text className="text-19 text-nur font-bold">
                    {preferences.locale === "ar" ? "تقبل الله صيامكم" : "May your fast be accepted"}
                  </Text>
                </DirectionalStack>
              ) : (
                <View className="flex-row items-baseline justify-between gap-4">
                  <Text className="text-muted">
                    {fasting.phase === "suhoor"
                      ? preferences.locale === "ar"
                        ? "يتبقى على الإمساك"
                        : "Until imsak"
                      : preferences.locale === "ar"
                        ? "يتبقى على الإفطار"
                        : "Until iftar"}
                  </Text>
                  <Text className="text-19 text-raml font-bold">
                    {formatRemainingTime(fasting.minutesUntil ?? 0, preferences.locale)}
                  </Text>
                </View>
              )}
            </Card>
          ) : null}

          <Card className="gap-4">
            <View className="flex-row items-end justify-between gap-4">
              <View className="gap-1">
                <Text className="text-13 text-muted">{cityName(day.city, preferences.locale)}</Text>
                <Text className="text-22 text-nur font-bold">{t("schedule")}</Text>
              </View>
              <Text className="text-11 text-muted">
                {formatHijriDate(day.hijri, preferences.locale)}
              </Text>
            </View>
            <View>
              {dayTimeline(day).map((entry) => {
                const isNext =
                  entry.kind === "prayer" && nextDay === day && entry.key === next?.key;
                const isMarker = entry.kind !== "prayer";
                const iqamah =
                  entry.kind === "prayer"
                    ? preferences.iqamahByCity[day.city.id]?.[entry.key]
                    : undefined;
                return (
                  <View
                    className={`border-nur/10 flex-row items-center gap-3 border-t py-4 ${isNext ? "rounded-13 bg-sama/10 px-3" : ""}`}
                    key={entry.kind === "prayer" ? entry.key : entry.kind}
                  >
                    <View className={`size-2 rounded-full ${isNext ? "bg-raml" : "bg-muted"}`} />
                    <View className="flex-1 gap-0.5">
                      <Text className={isMarker ? "text-muted" : "text-nur font-bold"}>
                        {entry.kind === "prayer"
                          ? prayerNameForCity(entry.key, day.city, preferences.locale)
                          : entry.kind === "sunrise"
                            ? sunriseName(preferences.locale)
                            : sunsetName(preferences.locale)}
                      </Text>
                      {entry.kind !== "prayer" ? (
                        <Text className="text-11 text-muted">
                          {t(entry.kind === "sunrise" ? "sunriseNote" : "sunsetNote")}
                        </Text>
                      ) : iqamah ? (
                        <Text className="text-11 text-raml">
                          {t("iqamahShort")} ·{" "}
                          {formatPrayerTime(iqamahTimeFor(entry.time, iqamah), preferences.locale)}
                        </Text>
                      ) : null}
                    </View>
                    <Text className={isNext ? "text-raml font-bold" : "text-muted"}>
                      {formatPrayerTime(entry.time, preferences.locale)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>

          {today.isFetching && !today.isPending ? (
            <Text className="text-11 text-muted">{t("cached")}</Text>
          ) : null}

          <Card className="gap-4">
            <DirectionalStack gap={4}>
              <Kicker>{preferences.locale === "ar" ? "آية مختارة" : "Selected ayah"}</Kicker>
              <Text className="text-22 text-nur font-bold">{t("ayah")}</Text>
            </DirectionalStack>
            {ayah.data ? (
              <DirectionalStack gap={12}>
                <Text align="right" className="text-22 text-nur leading-10" contentDirection="rtl">
                  ﴿{ayah.data.text}﴾
                </Text>
                <Text className="text-fajr">
                  {preferences.locale === "en" && ayah.data.surah.englishName
                    ? ayah.data.surah.englishName
                    : ayah.data.surah.name}{" "}
                  · {ayah.data.numberInSurah}
                </Text>
              </DirectionalStack>
            ) : (
              <Text className={ayah.isError ? "text-fajr" : "text-muted"}>
                {ayah.isError ? t("unavailable") : t("loading")}
              </Text>
            )}
            <OutlineButton onPress={refreshAyah}>{t("anotherAyah")}</OutlineButton>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
