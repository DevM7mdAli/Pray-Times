import { useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { CITIES, cityFromCoordinates, cityName, type City } from "@pray-times/core";
import { Card, OutlineButton, Screen } from "@/components/ui";
import { Pressable, Text, TextInput, View } from "@/components/primitives";
import { usePlaceSearch } from "@/features/prayer-times/queries";
import { usePreferencesStore } from "@/store/preferences-store";

function PlaceRow({ city, detail, onPress }: { city: City; detail?: string; onPress: () => void }) {
  const locale = usePreferencesStore((state) => state.locale);
  return (
    <Pressable className="border-nur/10 border-b py-4" onPress={onPress}>
      <Text className="text-17 text-nur font-bold">{cityName(city, locale)}</Text>
      {detail ? <Text className="text-13 text-muted mt-1">{detail}</Text> : null}
    </Pressable>
  );
}

export default function PlacesScreen() {
  const { t } = useTranslation();
  const locale = usePreferencesStore((state) => state.locale);
  const saveCity = usePreferencesStore((state) => state.saveCity);
  const selectCity = usePreferencesStore((state) => state.selectCity);
  const [query, setQuery] = useState("");
  const [locationError, setLocationError] = useState<string>();
  const [locating, setLocating] = useState(false);
  const search = usePlaceSearch(query);
  const results = search.data ?? [];
  const builtInCities = useMemo(() => CITIES.slice(0, 12), []);

  const choose = (city: City) => {
    if (city.source !== "preset") saveCity(city);
    selectCity(city.id);
    router.back();
  };

  const useLocation = async () => {
    setLocationError(undefined);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError(t("locationDenied"));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const city = cityFromCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timeZone,
        nameAr: "موقعي الحالي",
        nameEn: "Current location",
      });
      saveCity(city);
      selectCity(city.id);
      router.back();
    } catch {
      setLocationError(t("locationFailed"));
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen>
      <View className="gap-1">
        <Text className="text-29 text-nur font-bold">{t("chooseCity")}</Text>
        <Text className="text-15 text-muted">{t("verifiedTimes")}</Text>
      </View>

      <OutlineButton onPress={() => void useLocation()}>
        {locating ? t("locating") : t("useLocation")}
      </OutlineButton>
      {locationError ? <Text className="text-fajr">{locationError}</Text> : null}

      <Card className="gap-3">
        <Text className="text-13 text-muted font-bold">{t("searchPlaces")}</Text>
        <TextInput
          className="rounded-13 border-nur/15 bg-layl text-nur border px-4 py-3"
          onChangeText={setQuery}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor="#aebbd4"
          value={query}
        />
        {search.isFetching ? <ActivityIndicator color="#4da8da" /> : null}
        {search.isError ? <Text className="text-fajr">{t("unavailable")}</Text> : null}
        {query.trim().length >= 2 &&
        !search.isFetching &&
        !search.isError &&
        results.length === 0 ? (
          <Text className="text-muted">{t("noResults")}</Text>
        ) : null}
        {results.length > 0 ? (
          <View>
            <Text className="text-13 text-muted mb-1 font-bold">{t("searchResults")}</Text>
            {results.map((result) => (
              <PlaceRow
                city={result.city}
                detail={locale === "ar" ? result.contextAr : result.contextEn}
                key={result.city.id}
                onPress={() => choose(result.city)}
              />
            ))}
          </View>
        ) : null}
      </Card>

      <Card>
        <Text className="text-13 text-muted mb-1 font-bold">{t("builtInCities")}</Text>
        {builtInCities.map((city) => (
          <PlaceRow city={city} key={city.id} onPress={() => choose(city)} />
        ))}
      </Card>
    </Screen>
  );
}
