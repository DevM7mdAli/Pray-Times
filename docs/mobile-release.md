# Releasing the mobile app

The app is built and submitted with EAS (Expo Application Services): EAS Build compiles it in the
cloud, EAS Submit uploads it to App Store Connect and Google Play, and EAS stores the signing
credentials and build numbers. The project is
[`@devm7mdali/pray-times`](https://expo.dev/accounts/devm7mdali/projects/pray-times); its ID is in
`apps/mobile/app.json` under `extra.eas.projectId`.

## Requirements

- An Expo account with access to `devm7mdali` (`npx eas-cli@latest whoami`). The free plan's
  monthly build allowance covers occasional releases; see <https://expo.dev/pricing>.
- An Apple Developer Program membership (paid yearly) and a Google Play developer account (paid
  once).
- `pnpm install` done and `pnpm verify:release` green. No Xcode, Android SDK, or JDK is needed:
  `android/` and `ios/` are gitignored, so EAS runs `expo prebuild` on its own machines.

## One-time setup

### Apple

1. `expo.ios.appleTeamId` in `apps/mobile/app.json` is the Team ID (`QTB7497H9Y`). It is not a secret, and `@bacons/apple-targets` needs it to sign the
   widget extension.
2. Run `pnpm mobile:release:ios` and answer the prompts: sign in with your Apple ID, let EAS
   generate the distribution certificate and the provisioning profiles for the app
   (`com.devm7mdali.praytimes`) and the widget (`com.devm7mdali.praytimes.widget`), and let it
   register the `group.com.devm7mdali.praytimes` App Group. EAS Submit then creates the App Store
   Connect app record if it does not exist yet.

The App Store Connect app ID (`6826502662`) is in `eas.json` as `submit.production.ios.ascAppId`,
so submissions skip the lookup. "Pray Times" was taken on the App Store, so the record was created
as "Pray Times (c530c3)"; rename it under App Store Connect → App Information before review.

### Google Play

Google only lets the API upload to an app that already has one manually uploaded build:

1. Create the app in Play Console (All apps → Create app), package `com.devm7mdali.praytimes`.
2. Build without submitting, so EAS generates the upload keystore:
   `cd apps/mobile && npx eas-cli@latest build -p android --profile production`.
3. Download the `.aab` from the build page and upload it by hand under Testing → Internal testing →
   Create new release. This enrols the app in Play App Signing with the EAS keystore as the upload
   key.
4. Create a Google Cloud service account with access to the app (Play Console → Users and
   permissions → invite the service account with release permissions), download its JSON key, and
   upload it with `npx eas-cli@latest credentials -p android` → Google Service Account. Keep the
   JSON out of git; `apps/mobile/credentials/` is ignored if you need a place for it.

From then on `pnpm mobile:release:android` builds and submits on its own.

## Every release

1. If the store-facing version changes, edit `expo.version` in `apps/mobile/app.json` and commit.
   Build numbers (`ios.buildNumber`, `android.versionCode`) are not in the repo: `eas.json` sets
   `appVersionSource: "remote"` and the production profile auto-increments them on every build.
   `npx eas-cli@latest build:version:get` shows the current values.
2. Build and submit:

   ```bash
   pnpm mobile:release            # both platforms
   pnpm mobile:release:ios        # or one at a time
   pnpm mobile:release:android
   ```

3. iOS: the build lands in TestFlight after Apple processes it (minutes). Add it to a tester
   group, then create the version under App Store → iOS App, attach the build, and submit for
   review.
4. Android: the release arrives on the internal track as a draft (`releaseStatus: "draft"` in
   `eas.json`, which Google requires until the app is first published). Roll it out in Play
   Console, then promote it to closed testing and production. Personal developer accounts created
   after late 2023 must run a closed test with at least 12 testers for 14 days before production
   access is granted. Once the app is live, `releaseStatus` can become `"completed"`.

Tag the commit by hand if you want a marker, for example `mobile-v1.0.0` (the plain `v*` pattern
belongs to the extension's semantic-release flow).

## What prebuild changes for a release

`apps/mobile/android/` and `apps/mobile/ios/` are generated; do not hand-edit them. Anything a
release needs lives in `app.json` or `apps/mobile/plugins/`:

- `plugins/with-ios-local-notifications-only.js` drops the `aps-environment` entitlement that
  `expo-notifications` adds. The app only schedules local notifications, so the App ID needs no
  Push Notifications capability. Delete the plugin if you ever add remote push.
- `@bacons/apple-targets` adds the widget target and declares it under
  `extra.eas.build.experimental.ios.appExtensions`, which is how EAS knows to create its
  provisioning profile.
- `app.json` declares the 1024 px icon and Android adaptive icon (`assets/`), the splash screen,
  a monochrome notification icon, `ITSAppUsesNonExemptEncryption: false` (HTTPS only, so no
  export-compliance prompt per upload), and drops the unused "always" location strings.

The icons in `assets/` are derived from the 512 px `icon.png` at the repo root. A 1024 px master
(the landing page's `og-image.svg` holds the same mark as vectors) would be crisper on the App
Store listing.

## Store listing checklist

Both stores need these before the first submission:

- A privacy policy URL. The README's "Privacy policy" section is the complete one; the landing
  page summarises it at <https://pray-times.mohammed.win/#privacy>. A dedicated page on
  the site is the tidiest answer for both consoles.
- Screenshots: Apple wants 6.9" iPhone shots and, because `ios.supportsTablet` is `true`, 13"
  iPad shots too (set it to `false` before building if you do not want an iPad listing). Google
  wants at least two phone screenshots, a 1024×500 feature graphic, and a 512×512 icon (the root
  `icon.png` is exactly that).
- Name, subtitle/short description, full description, category (Lifestyle fits), support URL
  or email, and the age/content rating questionnaire.

App Privacy (Apple) and Data safety (Google) answers, derived from the README's privacy policy;
double-check them against the code you ship:

- Location is sent off the device to `api.aladhan.com` to compute times, so declare it as
  collected, for app functionality only, not linked to the user (no accounts), and not used for
  tracking. Google additionally asks whether it is shared with a third party: yes, with the data
  provider, and it is optional because a city can be chosen by hand.
- City search text goes to `geocoding-api.open-meteo.com` only while searching; it is not
  stored.
- No advertising, no analytics SDK in the app, no account, nothing else leaves the device.
- Android permissions: fine and coarse location (when in use), notifications. Google's target
  API level requirement (36) is met by React Native 0.86's defaults.

## Troubleshooting

- `Expo config is missing required ios.appleTeamId`: set `expo.ios.appleTeamId` in `app.json`.
- `Missing provisioning profile for com.devm7mdali.praytimes.widget`: run
  `npx eas-cli@latest credentials -p ios` and let it set up the widget target, or rerun the build
  interactively.
- `Only releases with status draft may be created on draft app`: keep `releaseStatus: "draft"`
  until the app has been published once.
- `The caller does not have permission` from Google Play: the service account has not been
  invited in Play Console, or the invite has not propagated yet (it can take up to a day).
- `Google Play requires the first upload to be done manually`: Google Play setup step 3.
- A build number already used: `npx eas-cli@latest build:version:set` to move the remote counter
  past it.
