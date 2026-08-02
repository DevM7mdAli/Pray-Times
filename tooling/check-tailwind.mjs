import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsRoot = path.join(root, "apps");
const ignoredDirectories = new Set(["dist", "node_modules"]);

const STYLE_EXTENSIONS = new Set([".css", ".tsx", ".ts", ".html"]);

// Total Tailwind arbitrary-value utilities (e.g. text-[13px]) allowed across
// each app's CSS + markup, combined. Calibrated against the post-migration
// count (359 / 110) with a small buffer — every value below this ceiling
// should be a genuine one-off (a box-shadow, a calc() width, a gradient
// stop); anything reused 2+ times belongs in tailwind.preset.cjs instead.
// Bump deliberately when adding a real one-off; don't bump to silence growth.
const ARBITRARY_VALUE_BUDGET = {
  "apps/landing-page": 375,
  "apps/extension": 120,
};

// @apply is for components with real state/repetition (see docs/STYLING.md).
// Ordinary elements should carry utilities directly in markup.
const APPLY_BUDGET = {
  "apps/landing-page/src/index.css": 15,
  "apps/landing-page/src/today.css": 15,
  "apps/extension/src/input.css": 15,
};

// Must mirror theme.extend.screens in tailwind.preset.cjs. Any hand-written
// @media px value outside this list means a breakpoint drifted instead of
// being reused (this is how index.css ended up at 830px while today.css
// used 820px for the same tablet cutoff).
const REGISTERED_SCREENS_PX = [600, 830];

// Only true Tailwind entry stylesheets need @tailwind directives. Secondary
// stylesheets (e.g. today.css) are imported alongside an entry stylesheet
// and share its generated base/utilities layers.
const ENTRY_STYLESHEETS = new Set([
  "apps/landing-page/src/index.css",
  "apps/extension/src/input.css",
]);

async function walk(directory, exts) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !ignoredDirectories.has(entry.name))
      .map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return walk(entryPath, exts);
        return exts.has(path.extname(entry.name)) ? [entryPath] : [];
      })
  );
  return nested.flat();
}

function appOf(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  const match = rel.match(/^apps\/[^/]+/);
  return match ? match[0] : null;
}

const failures = [];

const cssFiles = await walk(appsRoot, new Set([".css"]));
for (const file of cssFiles) {
  const source = await readFile(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");

  if (ENTRY_STYLESHEETS.has(rel) && !source.includes("@tailwind")) {
    failures.push(`${rel} is missing @tailwind directives`);
  }

  const withoutFunctionColors = source
    .replace(/(?:linear|radial|conic)-gradient\([^)]*\)/g, "")
    .replace(/rgba?\([^)]*\)/g, "");
  const hexMatches = [...new Set(withoutFunctionColors.match(/#[0-9a-fA-F]{3,8}\b/g) || [])];
  if (hexMatches.length > 0) {
    failures.push(
      `${rel} has raw hex color(s) outside gradients/rgba: ${hexMatches.join(", ")} — add them to tailwind.preset.cjs and reference the token instead`
    );
  }

  const applyCount = (source.match(/@apply\b/g) || []).length;
  const applyBudget = APPLY_BUDGET[rel];
  if (applyBudget !== undefined && applyCount > applyBudget) {
    failures.push(
      `${rel} has ${applyCount} @apply rules, budget is ${applyBudget} — move utilities into markup instead of the stylesheet`
    );
  }

  const badMedia = [
    ...new Set(
      [...source.matchAll(/@media\s*\(\s*(?:max|min)-width:\s*(\d+)px\s*\)/g)]
        .map((m) => Number(m[1]))
        .filter((px) => !REGISTERED_SCREENS_PX.includes(px))
    ),
  ];
  if (badMedia.length > 0) {
    failures.push(
      `${rel} uses unregistered breakpoint(s) ${badMedia.join(", ")}px — reuse ${REGISTERED_SCREENS_PX.join("/")}px or register a new one in tailwind.preset.cjs theme.extend.screens`
    );
  }
}

const styleFiles = await walk(appsRoot, STYLE_EXTENSIONS);
const arbitraryByApp = new Map();
for (const file of styleFiles) {
  const app = appOf(file);
  if (!app || !(app in ARBITRARY_VALUE_BUDGET)) continue;
  const source = await readFile(file, "utf8");
  const matches = source.match(/\b[a-z-]+-\[[^\]]+\]/g) || [];
  arbitraryByApp.set(app, (arbitraryByApp.get(app) ?? 0) + matches.length);
}
for (const [app, budget] of Object.entries(ARBITRARY_VALUE_BUDGET)) {
  const count = arbitraryByApp.get(app) ?? 0;
  if (count > budget) {
    failures.push(
      `${app} has ${count} arbitrary-value utilities across CSS + markup, budget is ${budget} — add the value to tailwind.preset.cjs`
    );
  }
}

for (const config of [
  "apps/landing-page/tailwind.config.cjs",
  "apps/extension/tailwind.config.cjs",
]) {
  const source = await readFile(path.join(root, config), "utf8");
  if (!source.includes('require("../../tailwind.preset.cjs")')) {
    failures.push(`${config} does not extend the shared Tailwind preset`);
  }
}

if (failures.length > 0) {
  console.error(`Tailwind policy check failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Tailwind policy check passed");
}
