import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsRoot = path.join(root, "apps");
const ignoredDirectories = new Set(["dist", "node_modules"]);

const MARKUP_EXTENSIONS = new Set([".tsx", ".ts", ".html"]);

// Each app ships exactly one stylesheet. Styling lives in markup; this file
// exists for @tailwind directives, @font-face, and base element rules only.
const STYLESHEET = {
  "apps/landing-page": "apps/landing-page/src/index.css",
  "apps/extension": "apps/extension/src/input.css",
};

// This design is not on a 4px grid, so one-off geometry (px spacing, a clamp,
// a shadow offset) legitimately uses arbitrary values. These ceilings are a
// ratchet against silent growth, not a design rule — the real rules are below:
// no raw hex inside an arbitrary value, and no arbitrary value repeated often
// enough that it is really an unnamed token.
const ARBITRARY_VALUE_CEILING = {
  "apps/landing-page": 400,
  "apps/extension": 140,
};

// An arbitrary value repeated at least this many times is a design decision
// that deserves a name in tailwind.preset.cjs. Utilities that are pure
// boilerplate rather than design values are exempt.
const REPEAT_LIMIT = 6;
const REPEAT_EXEMPT =
  /^(content|z|leading|tracking|grid-cols|grid-rows|transition|w|h|size|min-h|min-w|max-w|max-h|inset|translate-x|translate-y|opacity|stroke|border)-/;

// Must mirror theme.extend.screens in tailwind.preset.cjs.
const REGISTERED_SCREENS_PX = [600, 830];

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

const rel = (file) => path.relative(root, file).replace(/\\/g, "/");
const appOf = (file) => rel(file).match(/^apps\/[^/]+/)?.[0] ?? null;

const failures = [];

const cssFiles = (await walk(appsRoot, new Set([".css"]))).map(rel);
for (const [app, expected] of Object.entries(STYLESHEET)) {
  const found = cssFiles.filter((file) => file.startsWith(`${app}/`));
  if (!found.includes(expected)) {
    failures.push(`${app} is missing its stylesheet at ${expected}`);
  }
  const extra = found.filter((file) => file !== expected);
  if (extra.length > 0) {
    failures.push(
      `${app} has more than one stylesheet (${extra.join(", ")}) — each app keeps exactly one, at ${expected}`
    );
  }
}

for (const file of cssFiles) {
  const source = await readFile(path.join(root, file), "utf8");

  if (!source.includes("@tailwind")) {
    failures.push(`${file} is missing @tailwind directives`);
  }

  if (source.includes("@apply")) {
    failures.push(
      `${file} uses @apply — put utilities in markup, and extract a component when they repeat`
    );
  }

  // A class selector in CSS means a styling hook that markup cannot see.
  const classSelectors = [...new Set(source.match(/^\s*\.[a-zA-Z][\w-]*/gm) || [])].map((s) =>
    s.trim()
  );
  if (classSelectors.length > 0) {
    failures.push(
      `${file} defines component class(es) ${classSelectors.join(", ")} — style the element in markup instead`
    );
  }

  const withoutFunctionColors = source
    .replace(/(?:linear|radial|conic)-gradient\([^)]*\)/g, "")
    .replace(/rgba?\([^)]*\)/g, "");
  const hexMatches = [...new Set(withoutFunctionColors.match(/#[0-9a-fA-F]{3,8}\b/g) || [])];
  if (hexMatches.length > 0) {
    failures.push(
      `${file} has raw hex color(s) ${hexMatches.join(", ")} — add them to tailwind.preset.cjs and use theme()`
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
      `${file} uses unregistered breakpoint(s) ${badMedia.join(", ")}px — reuse ${REGISTERED_SCREENS_PX.join("/")}px or register one in theme.extend.screens`
    );
  }
}

// Tailwind silently drops a class that names a token which does not exist, so
// a renamed token leaves markup that compiles clean and renders unstyled.
// Verify every custom token family used in markup still resolves.
const preset = (await import(`file://${path.join(root, "tailwind.preset.cjs")}`)).default;
const presetKeys = {
  "text-display": Object.keys(preset.theme.extend.fontSize).filter((k) => k.startsWith("display-")),
  shadow: Object.keys(preset.theme.extend.boxShadow),
  animate: Object.keys(preset.theme.extend.animation),
};

const arbitraryByApp = new Map();
const repeats = new Map();
for (const file of await walk(appsRoot, MARKUP_EXTENSIONS)) {
  const app = appOf(file);
  if (!app || !(app in ARBITRARY_VALUE_CEILING)) continue;
  const source = await readFile(file, "utf8");
  const matches = source.match(/\b[a-z-]+-\[[^\]]+\]/g) || [];
  arbitraryByApp.set(app, (arbitraryByApp.get(app) ?? 0) + matches.length);

  for (const match of matches) {
    if (/#[0-9a-fA-F]{3,8}\b/.test(match)) {
      failures.push(
        `${rel(file)} has a raw hex color inside \`${match}\` — reference the token with theme(...) instead`
      );
    }
    if (REPEAT_EXEMPT.test(match)) continue;
    repeats.set(match, (repeats.get(match) ?? 0) + 1);
  }

  for (const used of source.match(/\btext-display-[a-z0-9-]+/g) || []) {
    const name = used.replace("text-", "");
    if (!presetKeys["text-display"].includes(name)) {
      failures.push(
        `${rel(file)} uses \`${used}\`, which is not in the preset type scale (${presetKeys["text-display"].join(", ")})`
      );
    }
  }
  for (const used of source.match(/(?<![\w-])shadow-([a-z][a-z0-9-]*)(?![\w[-])/g) || []) {
    const name = used.replace("shadow-", "");
    if (["none", "inner", "sm", "md", "lg", "xl"].includes(name)) continue;
    if (!presetKeys.shadow.includes(name)) {
      failures.push(
        `${rel(file)} uses \`${used}\`, which is not a preset shadow (${presetKeys.shadow.join(", ")})`
      );
    }
  }
  for (const used of source.match(/(?<![\w-])animate-([a-z][a-z0-9-]*)(?![\w[-])/g) || []) {
    const name = used.replace("animate-", "");
    if (["none", "spin", "ping", "pulse", "bounce"].includes(name)) continue;
    if (!presetKeys.animate.includes(name)) {
      failures.push(
        `${rel(file)} uses \`${used}\`, which is not a preset animation (${presetKeys.animate.join(", ")})`
      );
    }
  }
}

for (const [utility, count] of [...repeats].sort((a, b) => b[1] - a[1])) {
  if (count >= REPEAT_LIMIT) {
    failures.push(
      `\`${utility}\` appears ${count} times — give it a name in tailwind.preset.cjs instead of repeating the literal`
    );
  }
}

for (const [app, ceiling] of Object.entries(ARBITRARY_VALUE_CEILING)) {
  const count = arbitraryByApp.get(app) ?? 0;
  if (count > ceiling) {
    failures.push(
      `${app} has ${count} arbitrary-value utilities in markup, ceiling is ${ceiling} — promote the reusable ones to tailwind.preset.cjs`
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
