/**
 * Per-browser differences for the Manifest V3 build.
 *
 * The engines disagree on how a background script is declared:
 *
 * - Chrome and Edge run a real service worker and accept an ES module.
 * - Firefox has no Manifest V3 `service_worker` support and runs an event page
 *   built from `background.scripts`.
 * - Safari supports non-persistent background pages across every Manifest V3
 *   version, while `service_worker` only arrived in Safari 16.4.
 *
 * Firefox and Safari therefore share an event page fed by a classic (IIFE)
 * bundle, which also sidesteps their uneven support for module background
 * scripts.
 */

export const EXTENSION_TARGETS = ["chrome", "firefox", "safari"] as const;

export type ExtensionTarget = (typeof EXTENSION_TARGETS)[number];

export type Manifest = Record<string, unknown>;

export type TargetDefinition = {
  /** Human-readable name used in build output and release notes. */
  readonly label: string;
  /** esbuild output format for the background bundle. */
  readonly backgroundFormat: "esm" | "iife";
  /** Applies the engine-specific keys on top of the shared base manifest. */
  readonly manifest: (base: Manifest) => Manifest;
};

/** AMO requires a stable extension ID for a Manifest V3 add-on. */
const GECKO_ID = "pray-times@devm7mdali.github.io";

export const EXTENSION_TARGET_DEFINITIONS: Record<ExtensionTarget, TargetDefinition> = {
  chrome: {
    label: "Chrome and Edge",
    backgroundFormat: "esm",
    manifest: (base) => ({
      ...base,
      minimum_chrome_version: "116",
      background: { service_worker: "service-worker.js", type: "module" },
    }),
  },
  firefox: {
    label: "Firefox",
    backgroundFormat: "iife",
    manifest: (base) => ({
      ...base,
      browser_specific_settings: {
        gecko: {
          id: GECKO_ID,
          // Firefox 140 (the current ESR) is the first release that understands
          // `data_collection_permissions`, which AMO requires below.
          strict_min_version: "140.0",
          // The city choice never leaves the device and no personal data is
          // sent anywhere, which AMO expects to be declared explicitly.
          data_collection_permissions: { required: ["none"] },
        },
      },
      background: { scripts: ["service-worker.js"] },
    }),
  },
  safari: {
    label: "Safari",
    backgroundFormat: "iife",
    manifest: (base) => ({
      ...base,
      // Manifest V3 support landed in Safari 15.4.
      browser_specific_settings: { safari: { strict_min_version: "15.4" } },
      background: { scripts: ["service-worker.js"] },
    }),
  },
};

/**
 * Every file that must be present in a store archive. Anything not listed here
 * is left out of the ZIP, so a new runtime file has to be added in both places.
 */
export const EXTENSION_PACKAGE_FILES = [
  "manifest.json",
  "popup.html",
  "popup.js",
  "service-worker.js",
  "styles.css",
  "_locales/ar/messages.json",
  "_locales/en/messages.json",
  "fonts/alexandria-600.woff2",
  "fonts/alexandria-700.woff2",
  "fonts/ibm-plex-sans-arabic-400.woff2",
  "fonts/ibm-plex-sans-arabic-600.woff2",
  "fonts/ibm-plex-sans-arabic-700.woff2",
  "fonts/amiri-400.woff2",
  "fonts/LICENSE-ALEXANDRIA-OFL.txt",
  "fonts/LICENSE-IBM-PLEX-SANS-ARABIC-OFL.txt",
  "fonts/LICENSE-AMIRI-OFL.txt",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
] as const;

export function isExtensionTarget(value: string): value is ExtensionTarget {
  return (EXTENSION_TARGETS as readonly string[]).includes(value);
}

/**
 * Resolves the targets a command should act on. With no arguments every target
 * is used; otherwise each argument must name a known target.
 */
export function resolveTargets(args: readonly string[]): readonly ExtensionTarget[] {
  if (args.length === 0) return EXTENSION_TARGETS;
  return args.map((arg) => {
    if (!isExtensionTarget(arg)) {
      throw new Error(`Unknown target "${arg}". Expected one of: ${EXTENSION_TARGETS.join(", ")}`);
    }
    return arg;
  });
}
