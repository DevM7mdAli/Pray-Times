# Publishing the browser extension

Every release that semantic-release tags on `main` is pushed to the Chrome Web Store, Firefox
Add-ons (AMO), and Microsoft Edge Add-ons by the `Publish extension` workflow
([publish-extension.yml](../.github/workflows/publish-extension.yml)). The `release` job in
`Verify` starts it once a new tag exists, as a separate run, so a store failure or a pending
approval never marks `Verify` failed or delays the landing-page deploy. Each store receives the
exact ZIP attached to the GitHub Release, after its SHA-256 checksum matches.

- **Chrome Web Store**: `chrome-webstore-upload-cli` uploads the Chrome archive and submits it for
  review.
- **Firefox Add-ons**: `web-ext sign --channel listed` submits the Firefox build as a new listed
  version, together with a `git archive` of the tagged source. The scripts are TypeScript bundled by
  esbuild, and AMO reviewers need the original source to rebuild them. The job ends once AMO has
  accepted the upload; review continues on AMO.
- **Edge Add-ons**: the [`wdzeng/edge-addon`](https://github.com/wdzeng/edge-addon) action uploads
  the Chrome archive, which Edge runs unchanged, and submits it for certification. It is pinned to
  a commit because it receives the store credentials.
- **Safari** is not published by CI. It ships inside a signed app, so App Store submission stays
  manual.

Run the workflow from the Actions tab with a tag such as `v1.9.1` to publish an older release or
to retry one that a store rejected. Each store refuses a version it already has, so a retry only
succeeds for the store that did not take it.

## One-time setup

The store APIs can only add versions to an item that already exists, so the first version of each
listing is uploaded by hand.

### Chrome Web Store

1. In the [developer dashboard](https://chrome.google.com/webstore/devconsole), create the item by
   uploading `artifacts/pray-times-chrome-<version>.zip` from `pnpm package:extension`, fill in the
   store listing and privacy tab, and submit it once.
2. Note the item's extension ID (the 32-letter ID in its dashboard URL) and your publisher ID
   (shown in the dashboard's account settings).
3. Create an OAuth client and refresh token by following
   [chrome-webstore-upload-keys](https://github.com/fregante/chrome-webstore-upload-keys). Publish
   the OAuth consent screen to production, or Google expires the refresh token after seven days.

### Firefox Add-ons

1. Submit the first version at <https://addons.mozilla.org/developers/addon/submit/> as a listed
   add-on, using `artifacts/pray-times-firefox-<version>.zip`. The add-on ID is fixed in the
   manifest (`pray-times@devm7mdali.github.io`), so later uploads attach to this listing.
2. Generate API credentials at <https://addons.mozilla.org/developers/addon/api/key/>. The JWT
   issuer is the API key and the JWT secret is the API secret.

### Edge Add-ons

1. In [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview), create the
   extension by uploading `artifacts/pray-times-chrome-<version>.zip`, fill in the listing, and
   submit it once.
2. Copy the product ID from the extension's overview page (the GUID in its URL).
3. Open **Microsoft Edge → Publish API**, enable the new experience if asked, and select **Create
   API credentials** to get a client ID and an API key. The key has an expiry date shown on that
   page; renew it there and update `EDGE_API_KEY` before it lapses.

### GitHub

Create three environments under **Settings → Environments** and add these values to each. Add
yourself as a required reviewer on an environment if every store push should wait for approval.

| Environment        | Kind     | Name                   | Value                                     |
| ------------------ | -------- | ---------------------- | ----------------------------------------- |
| `chrome-web-store` | Variable | `CHROME_EXTENSION_ID`  | The item's extension ID                   |
| `chrome-web-store` | Secret   | `CHROME_PUBLISHER_ID`  | Your Chrome Web Store publisher ID        |
| `chrome-web-store` | Secret   | `CHROME_CLIENT_ID`     | OAuth client ID                           |
| `chrome-web-store` | Secret   | `CHROME_CLIENT_SECRET` | OAuth client secret                       |
| `chrome-web-store` | Secret   | `CHROME_REFRESH_TOKEN` | OAuth refresh token                       |
| `firefox-amo`      | Variable | `AMO_ADDON_SLUG`       | The listing's URL slug, used for its link |
| `firefox-amo`      | Secret   | `AMO_API_KEY`          | JWT issuer from the AMO API keys page     |
| `firefox-amo`      | Secret   | `AMO_API_SECRET`       | JWT secret from the AMO API keys page     |
| `edge-add-ons`     | Variable | `EDGE_PRODUCT_ID`      | The extension's Partner Center product ID |
| `edge-add-ons`     | Secret   | `EDGE_CLIENT_ID`       | Client ID from the Publish API page       |
| `edge-add-ons`     | Secret   | `EDGE_API_KEY`         | API key from the Publish API page         |

Until these exist, each release starts a `Publish extension` run that fails at the upload step;
the release itself and the rest of CI are unaffected.
