import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { TabBarIcon } from "@/components/tab-bar-icon";

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4da8da",
        tabBarInactiveTintColor: "#667592",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: "#071128",
          borderTopColor: "#173267",
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("today"),
          tabBarIcon: (props) => <TabBarIcon name="today" {...props} />,
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          title: t("qibla"),
          tabBarIcon: (props) => <TabBarIcon name="qibla" {...props} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings"),
          tabBarIcon: (props) => <TabBarIcon name="settings" {...props} />,
        }}
      />
    </Tabs>
  );
}
