# Pray Times

A browser extension and landing page that show the next prayer in a selected Saudi city. Before a time is displayed, the app verifies the selected city’s coordinates, returned date, time zone, and calculation method.

## What is included

- A Manifest V3 browser extension written in TypeScript, with loading, error, and clearly labelled cached-result states.
- Opt-in prayer notifications scheduled by a background service worker, with per-prayer controls and duplicate protection.
- A curated Saudi city catalog with fixed coordinates rather than ambiguous name searches.
- The declared Umm Al-Qura, Makkah calculation method.
- A `quran-uthmani` verse with the correct verse-in-surah reference.
- A React, Vite, and TypeScript landing page plus a standalone `/today/` prayer dashboard for users who do not want to install the extension.
- Arabic and English interfaces, with a persistent language switch and the correct reading direction for each language.
- Deterministic extension packaging with SHA-256 verification, tests, and CI.

## Requirements

- Node.js 22.14 or later (CI uses Node.js 24).
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

The deployable site is written to `apps/landing-page/dist`. Vite is configured for the GitHub Pages base path `/Pray-Times/`; the no-install daily prayer experience is available at `/Pray-Times/today/`.

## Continuous deployment

After `Verify` succeeds on `main`, the `Deploy landing page` workflow builds and publishes the landing page to GitHub Pages. Enable **Settings → Pages → Source → GitHub Actions** once for the repository. You can also trigger the workflow manually from the Actions tab.

## Automated releases

Do not create version tags manually. After a Conventional Commit reaches `main`, CI validates the commit history and the code, then determines the version, updates the extension manifest, creates the tag, builds the ZIP and SHA-256 checksum, and publishes the GitHub Release.

| Commit                                                                  | Release result |
| ----------------------------------------------------------------------- | -------------- |
| `fix: correct prayer time cache`                                        | Patch release  |
| `feat: add a new city`                                                  | Minor release  |
| `feat!: change extension storage format` or a `BREAKING CHANGE:` footer | Major release  |
| `docs: clarify installation` / `chore: update tooling`                  | No release     |

Valid types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`. Commit lint runs for every pull request and push; malformed messages fail CI before they can release.

Check your most recent local commit before pushing:

```bash
pnpm commitlint
```

Protect `main` by requiring the `Verify` workflow before merging pull requests.

The built-in `GITHUB_TOKEN` is used by default. If branch protection prevents the release commit from being pushed, add a fine-grained `RELEASE_TOKEN` repository secret with Contents read/write access and authorize that account to bypass the applicable rule.

## Accuracy and privacy

See the [privacy policy](docs/PRIVACY.en.md), [third-party notices](docs/THIRD_PARTY_NOTICES.md), and [modernization plan](docs/FRONTEND_MODERNIZATION_PLAN.md).

Calculated times can differ by minutes from a local mosque or issuing authority.
