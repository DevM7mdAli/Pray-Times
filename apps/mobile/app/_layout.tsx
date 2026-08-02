import "../global.css";
import "@/lib/i18n";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { AppQueryProvider } from "@/lib/query-provider";
import { useAppDirection } from "@/lib/direction";
import { usePreferencesStore } from "@/store/preferences-store";
import { View } from "@/components/primitives";

function HydrationGate() {
  const { i18n } = useTranslation();
  const { isRtl, viewStyle } = useAppDirection();
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated);
  const locale = usePreferencesStore((state) => state.locale);
  const [initialLanguageIsReady, setInitialLanguageIsReady] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    let isActive = true;
    void i18n.changeLanguage(locale).then(() => {
      if (isActive) setInitialLanguageIsReady(true);
    });
    return () => {
      isActive = false;
    };
  }, [hasHydrated, i18n, locale]);

  if (!hasHydrated || !initialLanguageIsReady) {
    return (
      <View className="bg-layl flex-1 items-center justify-center" style={viewStyle}>
        <ActivityIndicator color="#f2d6a2" />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="places"
        options={{ animation: isRtl ? "slide_from_left" : "slide_from_right" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <StatusBar style="light" />
      <HydrationGate />
    </AppQueryProvider>
  );
}
