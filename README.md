# Pray Times

A browser extension and web dashboard that show the next prayer in any selected place. Before a time is displayed, the app verifies its coordinates, returned date, time zone, and calculation method.

## What is included

- A Manifest V3 browser extension written in TypeScript for Chrome, Edge, Firefox, and Safari, with loading, error, and clearly labelled cached-result states.
- A toolbar countdown to the next prayer on the extension icon, readable without opening the popup and available on every supported browser.
- Opt-in prayer notifications scheduled by a background service worker, with per-prayer controls and duplicate protection.
- Sunrise shown alongside the prayers, marking where the Fajr window closes.
- A Ramadan mode that appears on its own, counting down to imsak and then to iftar.
- A qibla compass on the dashboard, computed from fixed coordinates without asking for your location.
- Any city in the world: a curated offline catalog of Saudi cities, place search, and opt-in location detection — each pinned to fixed coordinates before a time is shown.
- The calculation authority a country follows, chosen automatically and overridable per place.
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

### The toolbar countdown

The extension icon carries a badge counting down to the next prayer — `26m` inside the final hour, `6h` before that, in Arabic numerals when the interface is Arabic. It needs no permission beyond the `action` key the popup already uses, and it works on Chrome 88, Firefox 109, and Safari 15.4, which makes it the only background signal Safari users can receive.

The badge redraws once per minute only inside the final hour before a prayer. Outside that window a single alarm is booked for the moment the final hour begins, so the background worker stays asleep for most of the gap between prayers. That policy lives in `badgeRefreshAt` in [time.ts](packages/core/src/time.ts) as a pure function, so it can be retuned and tested on its own.

`setBadgeTextColor` is the one badge method Safari lacks, so it is called optionally. The countdown can be switched off in the settings dialog; when off, the badge is cleared and no prayer data is fetched on its behalf.

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

## Choosing a place anywhere

A place reaches the app three ways, and all three end up as the same thing: a
pinned `City` carrying fixed coordinates, an IANA zone, and a country. Every
provider response is then checked against that anchor exactly as it always was —
the verification model did not change, its anchor just stopped being limited to
the bundled catalog.

| Source     | Coordinates from                     | Zone from                | Country from            |
| ---------- | ------------------------------------ | ------------------------ | ----------------------- |
| `preset`   | the bundled catalog                  | the catalog              | the catalog             |
| `searched` | Open-Meteo geocoding, rounded to 4dp | the geocoder             | the geocoder            |
| `detected` | the device, rounded to 2dp           | the device's `Intl` zone | inferred from that zone |

The country picks the calculation authority — Umm Al-Qura in Saudi Arabia, ISNA
in North America, Diyanet in Turkey, and so on, falling back to the Muslim World
League where no local authority is listed. Any place can be pinned to a different
authority in settings; the choice is stored per place and invalidates that
place's cached times, since they were produced by the old one.

A detected place keeps a single id as you move, so the caches compare
coordinates as well as the id. Moving invalidates yesterday's times rather than
serving them for the wrong city.

## Sunrise, Ramadan, and the qibla

Three things are derived rather than displayed verbatim, and all three live in `@pray-times/core` so the extension and the dashboard cannot disagree.

**Sunrise** closes the Fajr window. The provider already returns it, and `dayTimeline` places it by its own clock time rather than assuming it follows Fajr. It is deliberately not a `PrayerKey`, so it never becomes notifiable or enters a notification schedule. Sunrise and imsak are both parsed leniently: a provider that omits or mangles them loses only that row, never the verified prayer times.

**Ramadan mode** is decided by the Hijri month _number_, never the month name, so it does not depend on the provider's transliteration. `fastingStatusFor` reports suhoor until imsak, fasting until Maghrib, and completed after that. Once the fast is complete no countdown to tomorrow's suhoor is shown, because that time is not in the day the app has verified. When the provider omits imsak, Fajr closes suhoor instead.

**The qibla** is the initial great-circle bearing from the city's fixed coordinates to the Kaaba — no provider call, no geolocation prompt, no permission. The compass is north-up by default; "Align with my device" asks for device-orientation access, which iOS grants only from that tap. Standing at the Haram reports no bearing at all, since a direction there would be noise.

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

The push cache is keyed by exactly what a response is verified against — coordinates, time zone, calculation method, and date — rather than by a catalog id. Everyone at the same position shares one upstream fetch, and a place whose zone or authority differs never reads a day that was verified for someone else. Detected coordinates are rounded again on the server rather than trusting the browser to have done it, and a claimed catalog id always resolves to the bundled entry, so a caller cannot relocate a known city.

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

# Privacy policy

Pray Times has no accounts, no analytics, and no advertising. There is no server
that belongs to this project other than the optional web push service described
below, and nothing you do is tied to an identity.

Last reviewed: 1 August 2026.

## What is stored, and where

Everything below is stored **on your own device** — in extension storage for the
browser extension, and in `localStorage` for the website. None of it is sent to
the project.

| Stored                                         | Why                                                   |
| ---------------------------------------------- | ----------------------------------------------------- |
| Chosen city or place                           | To show times without asking again                    |
| Places you added by search or detection        | To list them alongside the built-in cities            |
| Calculation method override                    | To respect your chosen authority                      |
| Interface language                             | To open in the language you last used                 |
| Notification and toolbar-countdown preferences | To honour the switches you set                        |
| A recent copy of verified prayer times         | To show today's times when the network is unavailable |

Clearing your browser's site data, or removing the extension, removes all of it.

## What leaves your device

Three providers are contacted directly by your browser. The project never sees
these requests.

| Provider                       | What is sent                                                             | When                                     |
| ------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------- |
| `api.aladhan.com`              | Coordinates of the chosen place, the date, and the calculation method id | Whenever prayer times are fetched        |
| `api.alquran.cloud`            | A verse number                                                           | When the extension popup shows a verse   |
| `geocoding-api.open-meteo.com` | The text you type into place search                                      | Only while you are searching for a place |

These providers have their own privacy practices, which this project does not
control.

## Location

The extension and the website both work without any access to your location. A
city can always be chosen from a list or found by search.

If you press **Use my current location**, the browser asks your permission
first, and:

- The coordinates are **rounded to two decimal places** — roughly a kilometre —
  before they are used for anything. The precise position your device reported
  is discarded and never stored.
- The rounded coordinates are sent only to the prayer-time provider, in the same
  request shape used for any other place.
- The rounded coordinates and your device's time zone are stored on your device
  so the place can be reopened. They are not sent to the project.
- Nothing is reverse-geocoded, so no provider is asked to name where you are.

Prayer times change by seconds over a kilometre, so the rounding costs nothing
in accuracy.

## Optional web prayer alerts

The `/today/` dashboard can send prayer alerts after the page is closed. This is
off unless you switch it on. When you do, the following is stored in a Cloudflare
D1 database run for this project:

- The push endpoint your browser generates, and its two encryption keys. This is
  an anonymous address for your browser, issued by your browser vendor.
- The city you selected, your interface language, and which prayers you chose.

No name, email, account, or IP log is kept alongside it. Turning alerts off
deletes the record. The subscription is used only to deliver the prayer alerts
you asked for.

Alerts currently cover the built-in cities only.

## Children

The app collects nothing, so it is suitable for any age.

## Changes

Material changes to this policy will appear in the repository history alongside
the release that introduces them.

# Third-party notices

## Data providers

### Aladhan API — `api.aladhan.com`

Prayer times and the Hijri date. Every response is checked against the declared
coordinates, date, time zone, and calculation method before anything is shown.
Free to use, no key required. <https://aladhan.com/prayer-times-api>

### AlQuran Cloud API — `api.alquran.cloud`

The `quran-uthmani` verse shown in the extension popup. Free to use, no key
required. <https://alquran.cloud/api>

### Open-Meteo Geocoding API — `geocoding-api.open-meteo.com`

Place search. Open-Meteo's APIs are offered free for non-commercial use, and the
geocoding data derives from **GeoNames**, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution is shown
beside the search field in the app.

- <https://open-meteo.com/en/docs/geocoding-api>
- <https://www.geonames.org/>

## Fonts

All three are licensed under the SIL Open Font License 1.1. The full licence text
ships beside each font in `apps/extension/public/fonts/` and
`apps/landing-page/public/licenses/`.

| Font                 | Used for              | Licence |
| -------------------- | --------------------- | ------- |
| Alexandria           | Headings and numerals | OFL 1.1 |
| IBM Plex Sans Arabic | Interface text        | OFL 1.1 |
| Amiri                | Qur'anic verse        | OFL 1.1 |

## The Kaaba coordinates

The qibla is computed against 21.4224779°N, 39.8251832°E, the commonly published
position of the Kaaba. No third-party service is contacted for it.

Location is never required. A city can be chosen from the bundled list or found by search; pressing **Use my current location** asks the browser's permission first, and the coordinates are rounded to two decimal places — roughly a kilometre — before they are used for anything. The precise position is discarded, nothing is reverse-geocoded, and the rounded pair goes only to the prayer-time provider. Prayer times move by seconds over that distance, so the rounding costs no accuracy.

Calculated times can differ by minutes from a local mosque or issuing authority.
