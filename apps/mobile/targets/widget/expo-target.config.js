/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "PrayTimesWidget",
  icon: "../../../../icon.png",
  // Palette mirrored from apps/mobile/src/widgets/theme.ts — keep both in sync.
  colors: {
    $accent: "#4da8da",
    $widgetBackground: "#10234a",
    bgRaised: "#10234a",
    gold: "#f2d6a2",
    blue: "#4da8da",
    textPrimary: "#f5f8ff",
    muted: "#aebbd4",
    divider: "#1c2c54",
  },
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
