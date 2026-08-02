const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
const coreSourceDirectory = path.resolve(__dirname, "../../packages/core/src");

// The shared package uses NodeNext-compatible `.js` import specifiers while
// exporting TypeScript source to workspace consumers. Metro resolves that
// literal extension, so map only those internal core imports back to `.ts`.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (context.originModulePath.startsWith(coreSourceDirectory) && moduleName.endsWith(".js")) {
    return context.resolveRequest(context, `${moduleName.slice(0, -3)}.ts`, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Explicit styled primitives avoid the preview global polyfill wrapping every
// React Native import, which can produce incorrect shared layout state.
module.exports = withNativeWind(config, { globalClassNamePolyfill: false });
