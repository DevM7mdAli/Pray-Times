/**
 * Widget palette, mirrored from `tailwind.preset.cjs` (the app's single dark
 * theme). Android widgets import this directly. iOS can't import TS, so the
 * same values are duplicated once in `targets/widget/expo-target.config.js` —
 * update both when the palette changes.
 */
export const widgetColors = {
  bg: "#0b1736",
  bgRaised: "#10234a",
  bgSoft: "#142449",
  gold: "#f2d6a2",
  white: "#f5f8ff",
  muted: "#aebbd4",
  blue: "#4da8da",
  divider: "#1c2c54",
} as const;
