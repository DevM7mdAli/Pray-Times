import type { ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

const RTL_VIEW_STYLE: ViewStyle = { direction: "rtl" };
const LTR_VIEW_STYLE: ViewStyle = { direction: "ltr" };
export function isRtlLanguage(language?: string) {
  return language?.split("-")[0] === "ar";
}

export function useAppDirection() {
  const { i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.resolvedLanguage ?? i18n.language);

  return {
    isRtl,
    viewStyle: isRtl ? RTL_VIEW_STYLE : LTR_VIEW_STYLE,
  };
}
