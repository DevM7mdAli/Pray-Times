import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import nx from "@nx/eslint-plugin";
import globals from "globals";
import tailwindcss from "eslint-plugin-tailwindcss";
import tseslint from "typescript-eslint";

const root = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      ".nx/**",
      "artifacts/**",
      "CSS/**",
      "JS/**",
      "tailwind.config.js",
      "**/*.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nx.configs["flat/base"],
  {
    // Every project carries one `type:*` tag in its package.json. Apps sit on
    // top and never import each other; the shared core stays free of app code;
    // config and tooling packages never reach into runtime code they serve.
    files: ["**/*.{js,mjs,ts,tsx}"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          allow: [],
          depConstraints: [
            {
              sourceTag: "type:app",
              onlyDependOnLibsWithTags: ["type:lib", "type:config", "type:tooling"],
            },
            { sourceTag: "type:lib", onlyDependOnLibsWithTags: ["type:lib"] },
            { sourceTag: "type:config", onlyDependOnLibsWithTags: ["type:config"] },
            {
              sourceTag: "type:tooling",
              onlyDependOnLibsWithTags: ["type:lib", "type:config"],
            },
          ],
        },
      ],
    },
  },
  {
    // Scoped to the Tailwind/NativeWind apps — elsewhere the plugin has no config to
    // resolve and only adds noise. The plugin doesn't probe .cjs by default,
    // so each app's config is pointed at explicitly (it extends the shared
    // @pray-times/tailwind-preset, so this still sees the full custom theme).
    files: ["apps/landing-page/**/*.{ts,tsx}"],
    ...tailwindcss.configs["flat/recommended"][1],
    settings: {
      tailwindcss: { config: path.join(root, "apps/landing-page/tailwind.config.cjs") },
    },
    rules: {
      ...tailwindcss.configs["flat/recommended"][1].rules,
      // Semantic classes documented in docs/STYLING.md (component rule) are
      // reviewed by hand, not by this rule — it can't tell them from typos.
      "tailwindcss/no-custom-classname": "off",
    },
  },
  {
    files: ["apps/extension/**/*.ts"],
    ...tailwindcss.configs["flat/recommended"][1],
    settings: {
      tailwindcss: { config: path.join(root, "apps/extension/tailwind.config.cjs") },
    },
    rules: {
      ...tailwindcss.configs["flat/recommended"][1].rules,
      "tailwindcss/no-custom-classname": "off",
    },
  },
  {
    files: ["apps/mobile/**/*.{ts,tsx}"],
    ...tailwindcss.configs["flat/recommended"][1],
    settings: {
      tailwindcss: { config: path.join(root, "apps/mobile/tailwind.config.cjs") },
    },
    rules: {
      ...tailwindcss.configs["flat/recommended"][1].rules,
      "tailwindcss/no-custom-classname": "off",
      // The plugin targets Tailwind 3 ordering; its auto-fix and the Tailwind 4
      // Prettier formatter conflict. Keep formatting deterministic via Prettier.
      "tailwindcss/classnames-order": "off",
    },
  },
  tailwindcss.configs["flat/recommended"][0],
  {
    files: ["tooling/**/*.mjs", "apps/mobile/scripts/**/*.mjs", "apps/mobile/targets/**/*.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // CommonJS by necessity: Expo require()s config plugins synchronously.
    files: ["apps/mobile/plugins/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/public/sw.js"],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  }
);
