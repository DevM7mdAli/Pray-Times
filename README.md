# Pray Times

English · [العربية](README.md)

A browser extension and landing page that show the next prayer in a selected Saudi city. Before a time is displayed, the app verifies the selected city’s coordinates, returned date, time zone, and calculation method.

## What is included

- A Manifest V3 browser extension written in TypeScript, with loading, error, and clearly labelled cached-result states.
- A curated Saudi city catalog with fixed coordinates rather than ambiguous name searches.
- The declared Umm Al-Qura, Makkah calculation method.
- A `quran-uthmani` verse with the correct verse-in-surah reference.
- A React, Vite, and TypeScript landing page that shares the same data logic.
- Arabic and English interfaces, with a persistent language switch and the correct reading direction for each language.
- Deterministic extension packaging with SHA-256 verification, tests, and CI.

## Requirements

- Node.js 20.19 or later.
- pnpm 11.18.0.

## Get started

```bash
pnpm install --frozen-lockfile
pnpm dev:landing
```

Run all release checks:

```bash
pnpm check
```

## Browser extension

```bash
pnpm build:extension
```

Load `apps/extension/dist` as an unpacked extension in Chrome or Edge after enabling Developer mode.

Create the store archive:

```bash
pnpm package:extension
```

The archive and checksum are written to `artifacts/`.

## Landing page

```bash
pnpm build:landing
```

The deployable site is written to `apps/landing-page/dist`. Vite is configured for the GitHub Pages base path `/Pray-Times/`.

## Continuous deployment

After `Verify` succeeds on `main`, the `Deploy landing page` workflow builds and publishes the landing page to GitHub Pages. Enable **Settings → Pages → Source → GitHub Actions** once for the repository. You can also trigger the workflow manually from the Actions tab.

## Accuracy and privacy

See the [privacy policy](docs/PRIVACY.en.md), [third-party notices](docs/THIRD_PARTY_NOTICES.md), and [modernization plan](docs/FRONTEND_MODERNIZATION_PLAN.md).

Calculated times can differ by minutes from a local mosque or issuing authority.
