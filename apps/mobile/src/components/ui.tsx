import type { ReactNode } from "react";
import { useWindowDimensions, View as NativeView } from "react-native";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/components/primitives";
import { useAppDirection } from "@/lib/direction";

export function Screen({ children }: { children: ReactNode }) {
  const { viewStyle } = useAppDirection();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView className="bg-layl flex-1" style={viewStyle}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <NativeView
          style={{
            alignSelf: "flex-start",
            gap: 20,
            marginHorizontal: 20,
            width: Math.max(0, width - 40),
          }}
        >
          {children}
        </NativeView>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-22 bg-layl-soft p-5 ${className}`}>{children}</View>;
}

export function DirectionalStack({ children, gap = 0 }: { children: ReactNode; gap?: number }) {
  const { isRtl } = useAppDirection();
  return (
    <NativeView
      style={{
        alignItems: "flex-start",
        alignSelf: "stretch",
        direction: isRtl ? "rtl" : "ltr",
        gap,
        width: "100%",
      }}
    >
      {children}
    </NativeView>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return <Text className="text-11 text-raml font-bold tracking-widest uppercase">{children}</Text>;
}

export function PrimaryButton({
  children,
  onPress,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Pressable
      className={`rounded-13 bg-raml items-center px-4 py-3 ${disabled ? "opacity-50" : ""} ${className}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className="text-layl font-bold">{children}</Text>
    </Pressable>
  );
}

export function OutlineButton({
  children,
  onPress,
  className = "",
}: {
  children: ReactNode;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable
      className={`rounded-13 border-nur/20 items-center border px-4 py-3 ${className}`}
      onPress={onPress}
    >
      <Text className="text-nur font-bold">{children}</Text>
    </Pressable>
  );
}
