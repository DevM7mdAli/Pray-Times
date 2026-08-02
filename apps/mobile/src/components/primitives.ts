import type { ComponentType } from "react";
import {
  Pressable as NativePressable,
  ScrollView as NativeScrollView,
  Text as NativeText,
  TextInput as NativeTextInput,
  View as NativeView,
  type PressableProps,
  type ScrollViewProps,
  type TextInputProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import { styled } from "react-native-css";
import {
  SafeAreaView as NativeSafeAreaView,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";

const createStyled = styled as unknown as <Props extends object, Key extends string>(
  component: ComponentType<Props>,
  mapping: Record<Key, string>
) => ComponentType<Props & Partial<Record<Key, string>>>;

export const View = createStyled(NativeView as ComponentType<ViewProps>, { className: "style" });
export const Text = createStyled(NativeText as ComponentType<TextProps>, { className: "style" });
export const Pressable = createStyled(NativePressable as ComponentType<PressableProps>, {
  className: "style",
});
export const TextInput = createStyled(NativeTextInput as ComponentType<TextInputProps>, {
  className: "style",
});
export const SafeAreaView = createStyled(NativeSafeAreaView as ComponentType<SafeAreaViewProps>, {
  className: "style",
});
export const ScrollView = createStyled(NativeScrollView as ComponentType<ScrollViewProps>, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});
