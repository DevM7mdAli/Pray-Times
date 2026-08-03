import { createElement, type ComponentType } from "react";
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
  type TextStyle,
  type ViewProps,
} from "react-native";
import { styled } from "react-native-css";
import {
  SafeAreaView as NativeSafeAreaView,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";
import { useAppDirection } from "@/lib/direction";

const createStyled = styled as unknown as <Props extends object, Key extends string>(
  component: ComponentType<Props>,
  mapping: Record<Key, string>
) => ComponentType<Props & Partial<Record<Key, string>>>;

type DirectionalTextProps = TextProps & {
  align?: NonNullable<TextStyle["textAlign"]>;
  className?: string;
  contentDirection?: NonNullable<TextStyle["writingDirection"]>;
};

type DirectionalTextInputProps = TextInputProps & {
  align?: NonNullable<TextStyle["textAlign"]>;
  className?: string;
  contentDirection?: NonNullable<TextStyle["writingDirection"]>;
};

const StyledText = createStyled(NativeText as ComponentType<TextProps>, { className: "style" });
const StyledTextInput = createStyled(NativeTextInput as ComponentType<TextInputProps>, {
  className: "style",
});

export function Text({
  align,
  className = "",
  contentDirection,
  style,
  ...props
}: DirectionalTextProps) {
  const { isRtl } = useAppDirection();
  const textAlign = align ?? (isRtl ? "right" : "left");

  return createElement(StyledText, {
    ...props,
    className,
    style: [
      style,
      {
        textAlign,
        writingDirection: contentDirection ?? (isRtl ? "rtl" : "ltr"),
      },
    ],
  });
}

export function TextInput({
  align,
  className = "",
  contentDirection,
  style,
  ...props
}: DirectionalTextInputProps) {
  const { isRtl } = useAppDirection();
  return createElement(StyledTextInput, {
    ...props,
    className,
    style: [
      style,
      {
        textAlign: align ?? (isRtl ? "right" : "left"),
        writingDirection: contentDirection ?? (isRtl ? "rtl" : "ltr"),
      },
    ],
  });
}

export const View = createStyled(NativeView as ComponentType<ViewProps>, { className: "style" });
export const Pressable = createStyled(NativePressable as ComponentType<PressableProps>, {
  className: "style",
});
export const SafeAreaView = createStyled(NativeSafeAreaView as ComponentType<SafeAreaViewProps>, {
  className: "style",
});
export const ScrollView = createStyled(NativeScrollView as ComponentType<ScrollViewProps>, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});
