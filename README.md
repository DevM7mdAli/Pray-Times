# Pray Times

A browser extension and landing page that show the next prayer in a selected Saudi city. Before a time is displayed, the app verifies the selected city’s coordinates, returned date, time zone, and calculation method.

## What is included

- A Manifest V3 browser extension written in TypeScript for Chrome, Edge, Firefox, and Safari, with loading, error, and clearly labelled cached-result states.
- Opt-in prayer notifications scheduled by a background service worker, with per-prayer controls and duplicate protection.
- A curated Saudi city catalog with fixed coordinates rather than ambiguous name searches.
- The declared Umm Al-Qura, Makkah calculation method.
- A `quran-uthmani` verse with the correct verse-in-surah reference.
- A React, Vite, and TypeScript landing page plus a standalone `/today/` prayer dashboard for users who do not want to install the extension.
- Free, opt-in Web Push alerts on the dashboard, backed by a Cloudflare Worker, D1, and a one-minute scheduled trigger.
- Arabic and English interfaces, with a persistent language switch and the correct reading direction for each language.
- Deterministic per-browser extension packaging with SHA-256 verification, tests, and CI.

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

The extension is built for Chrome and Edge, Firefox, and Safari from one source tree.

```bash
pnpm build:extension
```

That writes `apps/extension/dist/chrome`, `apps/extension/dist/firefox`, and `apps/extension/dist/safari`. Pass a target name to build only one, for example `pnpm build:extension firefox`.

Create the store archives:

```bash
pnpm package:extension
```

Each archive and its checksum are written to `artifacts/` as `pray-times-<browser>-<version>.zip`.

### How the targets differ

`apps/extension/manifest.base.json` holds everything the engines agree on, and `tooling/extension/targets.ts` applies the per-browser keys. Only three things actually differ:

|               | Chrome and Edge                                     | Firefox                              | Safari                               |
| ------------- | --------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| Background    | `service_worker`, ES module                         | `scripts` event page, classic bundle | `scripts` event page, classic bundle |
| Engine keys   | `minimum_chrome_version`                            | `browser_specific_settings.gecko`    | `browser_specific_settings.safari`   |
| Notifications | `contextMessage`, `eventTime`, `priority`, `silent` | title and message only               | not supported by the engine          |

Firefox has no Manifest V3 `service_worker` support, and Safari only gained it in 16.4, so both run an event page instead. Firefox also rejects notification options it does not implement, so the calculation method is folded into the message body there rather than shown as a separate context line.

Safari implements no extension notifications API at all. The `notifications` permission stays declared so the feature switches itself on if Safari ever ships it, and `supportsNotifications` in `browser-api.ts` gates every call at runtime: on Safari the popup shows prayer times normally and the alert toggle is disabled with an explanation. Prayer alerts on Apple devices are served by the `/today/` dashboard's Web Push instead.

All extension code reaches the browser through `apps/extension/src/browser-api.ts`, which resolves the promise-based `browser` namespace and falls back to `chrome`. Firefox ships a callback-based `chrome` alias, so awaiting it directly returns `undefined` instead of the real result — never call `chrome.*` from extension source.

### Loading a development build

- **Chrome or Edge**: enable Developer mode at `chrome://extensions`, then _Load unpacked_ on `apps/extension/dist/chrome`.
- **Firefox**: open `about:debugging#/runtime/this-firefox`, then _Load Temporary Add-on_ on `apps/extension/dist/firefox/manifest.json`.
- **Safari**: convert the build to an Xcode project, then enable _Develop → Allow Unsigned Extensions_ in Safari.

```bash
xcrun safari-web-extension-converter apps/extension/dist/safari --macos-only
```

A Safari extension ships inside an app bundle, so releasing it needs Xcode and an Apple Developer account. CI builds that Xcode project unsigned on every run and uploads it as the `safari-xcode-project` artifact; signing and App Store submission stay manual.

Validate the Firefox build against the add-on policies:

```bash
pnpm lint:firefox
```

## Landing page

```bash
pnpm build:landing
```

The deployable site is written to `apps/landing-page/dist`. Vite is configured for the GitHub Pages base path `/Pray-Times/`; the no-install daily prayer experience is available at `/Pray-Times/today/`.

### Free web notifications

The website uses the browser Push API, so prayer alerts can arrive after the page is closed. The small backend in `apps/web-push-worker` is designed for Cloudflare's free Workers and D1 tiers.

To connect a Cloudflare account:

```bash
pnpm --filter @pray-times/web-push-worker exec wrangler login
pnpm --filter @pray-times/web-push-worker exec wrangler d1 create pray-times-push
pnpm --filter @pray-times/web-push-worker exec web-push generate-vapid-keys
```

Copy the D1 database ID into `apps/web-push-worker/wrangler.jsonc`. Add both generated keys with `wrangler secret put VAPID_PUBLIC_KEY` and `wrangler secret put VAPID_PRIVATE_KEY`, then run:

```bash
pnpm --filter @pray-times/web-push-worker db:migrate:remote
pnpm --filter @pray-times/web-push-worker run deploy
```

Set the GitHub Actions repository variable `PUSH_API_URL` to the deployed `workers.dev` URL. The next landing-page deployment will enable the notification controls. For local development, copy `.dev.vars.example` to `.dev.vars`, add the generated keys, and set `VITE_PUSH_API_URL` to the local Worker URL.

## Continuous deployment

After `Verify` succeeds on `main`, the `Deploy landing page` workflow builds and publishes the landing page to GitHub Pages. Enable **Settings → Pages → Source → GitHub Actions** once for the repository. You can also trigger the workflow manually from the Actions tab.

## Automated releases

Do not create version tags manually. After a Conventional Commit reaches `main`, CI validates the commit history and the code, then determines the version, updates `apps/extension/manifest.base.json`, creates the tag, builds a ZIP and SHA-256 checksum for each browser, and publishes them all on the GitHub Release.

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
