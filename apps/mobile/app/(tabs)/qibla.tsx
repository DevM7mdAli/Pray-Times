import { useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { cityName, compassPointFor, qiblaForCity } from "@pray-times/core";
import { Card, Kicker, OutlineButton, Screen } from "@/components/ui";
import { Text, View } from "@/components/primitives";
import { selectedCityForPreferences, usePreferencesStore } from "@/store/preferences-store";

export default function QiblaScreen() {
  const { t } = useTranslation();
  const preferences = usePreferencesStore(
    useShallow((state) => ({
      locale: state.locale,
      cityId: state.cityId,
      savedCities: state.savedCities,
      methodOverrides: state.methodOverrides,
    }))
  );
  const city = useMemo(() => selectedCityForPreferences(preferences), [preferences]);
  const qibla = qiblaForCity(city);
  const [heading, setHeading] = useState(0);
  const [isAligned, setIsAligned] = useState(false);
  const [compassError, setCompassError] = useState<string>();

  useEffect(() => {
    if (!isAligned) return;
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    void Location.watchHeadingAsync((result) => {
      if (!active) return;
      const nextHeading = result.trueHeading >= 0 ? result.trueHeading : result.magHeading;
      if (Number.isFinite(nextHeading)) setHeading(nextHeading);
    })
      .then((value) => {
        subscription = value;
      })
      .catch(() => setCompassError(t("compassDenied")));
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [isAligned, t]);

  const enableCompass = async () => {
    setCompassError(undefined);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setCompassError(t("compassDenied"));
      return;
    }
    setIsAligned(true);
  };

  const distance =
    qibla.distanceKm < 10 ? qibla.distanceKm.toFixed(1) : Math.round(qibla.distanceKm);
  const roseRotation = isAligned ? -heading : 0;

  return (
    <Screen>
      <View className="gap-2">
        <Kicker>{t("qibla")}</Kicker>
        <Text className="text-29 text-nur font-bold">
          {t("qiblaFrom", { city: cityName(city, preferences.locale) })}
        </Text>
      </View>

      <Card className="items-center gap-6">
        {qibla.atHaram ? (
          <View className="gap-2">
            <Text className="text-22 text-nur text-center font-bold">{t("atHaram")}</Text>
            <Text className="text-muted text-center">{t("atHaramBody")}</Text>
          </View>
        ) : (
          <>
            <Svg height={260} viewBox="0 0 200 200" width={260}>
              <G transform={`rotate(${roseRotation} 100 100)`}>
                <Circle
                  cx="100"
                  cy="100"
                  fill="#0b1736"
                  r="88"
                  stroke="#4da8da"
                  strokeOpacity={0.4}
                />
                <Circle
                  cx="100"
                  cy="100"
                  fill="none"
                  r="66"
                  stroke="#f5f8ff"
                  strokeOpacity={0.15}
                />
                {Array.from({ length: 24 }, (_, index) => (
                  <Line
                    key={index}
                    stroke={index % 6 === 0 ? "#4da8da" : "#aebbd4"}
                    strokeOpacity={index % 6 === 0 ? 1 : 0.45}
                    strokeWidth={index % 6 === 0 ? 2.5 : 1.25}
                    transform={`rotate(${index * 15} 100 100)`}
                    x1="100"
                    x2="100"
                    y1={index % 6 === 0 ? "20" : "24"}
                    y2="30"
                  />
                ))}
                <SvgText
                  fill="#aebbd4"
                  fontSize="13"
                  fontWeight="700"
                  textAnchor="middle"
                  x="100"
                  y="17"
                >
                  N
                </SvgText>
                <G transform={`rotate(${qibla.bearing} 100 100)`}>
                  <Path d="M100 30 L112 112 L100 104 L88 112 Z" fill="#e9806e" />
                  <Circle cx="100" cy="100" fill="#f2d6a2" r="7" />
                </G>
              </G>
            </Svg>
            <View className="w-full gap-5">
              <View className="gap-1">
                <Text className="text-11 text-muted">{t("bearing")}</Text>
                <Text className="text-27 text-raml font-bold">
                  {Math.round(qibla.bearing)}° · {compassPointFor(qibla.bearing)}
                </Text>
              </View>
              <View className="gap-1">
                <Text className="text-11 text-muted">{t("distance")}</Text>
                <Text className="text-27 text-raml font-bold">{distance} km</Text>
              </View>
            </View>
            <OutlineButton onPress={() => void enableCompass()}>{t("alignCompass")}</OutlineButton>
            {isAligned ? (
              <Text className="text-muted text-center">{t("compassActive")}</Text>
            ) : null}
            {compassError ? <Text className="text-fajr text-center">{compassError}</Text> : null}
          </>
        )}
      </Card>
    </Screen>
  );
}
