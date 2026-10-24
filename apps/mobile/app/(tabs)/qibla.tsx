import { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import * as Location from "expo-location";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import {
  cityName,
  compassPointFor,
  deviceHeadingFrom,
  isHeadingAccuracyLow,
  qiblaFor,
  qiblaForCity,
  smoothHeading,
} from "@pray-times/core";
import { Card, DirectionalStack, Kicker, OutlineButton, Screen } from "@/components/ui";
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
  const [heading, setHeading] = useState<number>();
  const [isTrueNorth, setIsTrueNorth] = useState(true);
  const [isAccuracyLow, setIsAccuracyLow] = useState(false);
  const [devicePosition, setDevicePosition] = useState<{ latitude: number; longitude: number }>();
  const [isAligned, setIsAligned] = useState(false);
  const [compassError, setCompassError] = useState<string>();
  // The live compass must point from where the device is, not from the chosen
  // city, which may be elsewhere or tens of kilometres wide.
  const qibla = isAligned && devicePosition ? qiblaFor(devicePosition) : qiblaForCity(city);
  // Headings are measured from the top of the device in portrait. The app is
  // portrait-only on phones, but an iPad can still rotate the interface.
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  useEffect(() => {
    if (!isAligned) return;
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    void Location.watchHeadingAsync((result) => {
      if (!active) return;
      const reading = deviceHeadingFrom(result);
      if (!reading) return;
      setHeading((previous) => smoothHeading(previous, reading.degrees));
      setIsTrueNorth(reading.isTrueNorth);
      setIsAccuracyLow(isHeadingAccuracyLow(result.accuracy));
    })
      .then((value) => {
        if (active) subscription = value;
        else value.remove();
      })
      .catch(() => {
        if (!active) return;
        setCompassError(t("compassDenied"));
        setIsAligned(false);
      });
    void Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000, requiredAccuracy: 5_000 })
      .then(
        (position) =>
          position ?? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      )
      .then((position) => {
        if (active) setDevicePosition(position.coords);
      })
      // Without a fix the compass keeps the chosen city's coordinates.
      .catch(() => undefined);
    return () => {
      active = false;
      subscription?.remove();
      setHeading(undefined);
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
  const isCompassLive = isAligned && heading !== undefined && !isLandscape;
  const roseRotation = isCompassLive ? -heading : 0;

  return (
    <Screen>
      <DirectionalStack gap={8}>
        <Kicker>{t("qibla")}</Kicker>
        <Text className="text-29 text-nur font-bold">
          {t("qiblaFrom", { city: cityName(city, preferences.locale) })}
        </Text>
      </DirectionalStack>

      <Card className="items-center gap-6">
        {qibla.atHaram ? (
          <View className="items-center gap-2">
            <Text align="center" className="text-22 text-nur font-bold">
              {t("atHaram")}
            </Text>
            <Text align="center" className="text-muted">
              {t("atHaramBody")}
            </Text>
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
              <DirectionalStack gap={4}>
                <Text className="text-11 text-muted">{t("bearing")}</Text>
                <Text className="text-27 text-raml font-bold" contentDirection="ltr">
                  {Math.round(qibla.bearing)}° · {compassPointFor(qibla.bearing)}
                </Text>
              </DirectionalStack>
              <DirectionalStack gap={4}>
                <Text className="text-11 text-muted">{t("distance")}</Text>
                <Text className="text-27 text-raml font-bold" contentDirection="ltr">
                  {distance} km
                </Text>
              </DirectionalStack>
            </View>
            <OutlineButton onPress={() => void enableCompass()}>{t("alignCompass")}</OutlineButton>
            {isAligned
              ? compassNotices({
                  devicePosition: devicePosition !== undefined,
                  heading: heading !== undefined,
                  isAccuracyLow,
                  isLandscape,
                  isTrueNorth,
                }).map((key) => (
                  <Text align="center" className="text-muted" key={key}>
                    {t(key)}
                  </Text>
                ))
              : null}
            {compassError ? (
              <Text align="center" className="text-fajr">
                {compassError}
              </Text>
            ) : null}
          </>
        )}
      </Card>
    </Screen>
  );
}

type CompassNotice =
  | "compassWaiting"
  | "compassPortrait"
  | "compassActive"
  | "compassCalibrate"
  | "compassMagnetic"
  | "compassFromDevice";

function compassNotices(state: {
  devicePosition: boolean;
  heading: boolean;
  isAccuracyLow: boolean;
  isLandscape: boolean;
  isTrueNorth: boolean;
}): CompassNotice[] {
  if (state.isLandscape) return ["compassPortrait"];
  if (!state.heading) return ["compassWaiting"];
  const notices: CompassNotice[] = [state.isAccuracyLow ? "compassCalibrate" : "compassActive"];
  if (!state.isTrueNorth) notices.push("compassMagnetic");
  if (state.devicePosition) notices.push("compassFromDevice");
  return notices;
}
