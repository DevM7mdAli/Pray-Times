import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { styled } from "react-native-css";
import { SafeAreaView } from "react-native-safe-area-context";

const StyledSafeAreaView = styled(SafeAreaView);

export function Screen({ children }: { children: ReactNode }) {
  return (
    <StyledSafeAreaView className="bg-layl flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-10 pt-5"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </StyledSafeAreaView>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-22 bg-layl-soft p-5 ${className}`}>{children}</View>;
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
