import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { TabBarIcon } from "@/components/tab-bar-icon";
import { useAppDirection } from "@/lib/direction";

export default function TabsLayout() {
  const { t } = useTranslation();
  const { isRtl } = useAppDirection();
  const screens = isRtl
    ? (["settings", "qibla", "index"] as const)
    : (["index", "qibla", "settings"] as const);
  const screenDetails = {
    index: { icon: "today", title: t("today") },
    qibla: { icon: "qibla", title: t("qibla") },
    settings: { icon: "settings", title: t("settings") },
  } as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4da8da",
        tabBarInactiveTintColor: "#667592",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          writingDirection: isRtl ? "rtl" : "ltr",
        },
        tabBarStyle: {
          backgroundColor: "#071128",
          borderTopColor: "#173267",
          paddingTop: 6,
        },
      }}
    >
      {screens.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: screenDetails[name].title,
            tabBarIcon: (props) => <TabBarIcon name={screenDetails[name].icon} {...props} />,
          }}
        />
      ))}
    </Tabs>
  );
}
