import "../global.css";
import "@/lib/i18n";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppQueryProvider } from "@/lib/query-provider";
import { usePreferencesStore } from "@/store/preferences-store";

function HydrationGate() {
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated);
  if (!hasHydrated) {
    return (
      <View className="bg-layl flex-1 items-center justify-center">
        <ActivityIndicator color="#f2d6a2" />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <StatusBar style="light" />
      <HydrationGate />
    </AppQueryProvider>
  );
}
