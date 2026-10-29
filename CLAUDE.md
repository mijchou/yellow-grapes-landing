# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, static **landing page** for the Yellow Grapes wine-map app
(`index.html`). It is styled with a **locally-built Tailwind CSS v3** stylesheet
and deployed via **GitHub Pages** at the custom domain `yellow.grapes.com.tw`
(see `CNAME`). There is no backend or framework; the app-link fallbacks have Node test coverage.

## Commands

```bash
npm install        # first-time setup
npm run watch      # dev: rebuilds dist/output.css on change — run in a real terminal
npm run build      # production: minified dist/output.css
npm run build:legal  # render terms.html / privacy.html from Firestore (needs creds — see below)
npm run build:all    # build:legal then build (the order CI uses)
```

Run `npm test` for manager invitation, shared-link fallback, association-file, and artifact assembly checks.

**Deploy = push to `main` → GitHub Action.** Pages is set to deploy *from GitHub
Actions* (`.github/workflows/deploy.yml`), not directly from the branch. On each
push (and via the manual **Run workflow** button) the Action: renders the legal
pages from Firestore → builds the CSS → publishes `index.html`, the generated
`terms.html` / `privacy.html`, `dist/`, `logo/`, `images/`, `CNAME` to Pages,
plus a generated `store-config.js` (see **Store links** below).
The committed `dist/output.css` is what local preview uses; CI rebuilds it on
deploy. See **Legal pages** below for the Firestore secret the Action needs.

## Architecture

The whole page lives in **`index.html`** — header, hero, contact form, and
footer in one file. Tailwind is a build input, not a runtime dependency:
`src/input.css` (the three `@tailwind` layers only) compiles to the committed
`dist/output.css`, which `index.html` links.

### Design tokens live in TWO places that must stay in sync
- **`index.html` `<style>` `:root`** — the *actual* brand values, stored as
  space-separated **RGB channels** (`--bg-rgb`, `--fg-rgb`, `--fg-muted-rgb`,
  `--accent-rgb`, `--accent-strong-rgb`) plus `--line` and header/logo sizing.
  Channels (not hex) so Tailwind can apply opacity (`border-fg/30`) and raw CSS
  can do `rgb(var(--x-rgb) / a)`. Intentionally inline (not in `src/input.css`)
  so they can be tuned and previewed **without a rebuild**.
- **`tailwind.config.js`** — `theme.extend.colors` maps utility names
  (`bg`, `fg`, `fgmuted`, `accent`, `accentstrong`, `onaccent`, `hairline`) to
  those channels via `rgb(var(--…-rgb) / <alpha-value>)`, and `fontFamily`
  defines `sans` (system stack) + `brand` (Urbanist 400–800).

So adding a brand color means editing **both**: define the `--var` in
`:root` and add the utility mapping in `tailwind.config.js`. The same inline
`<style>` also holds bespoke component CSS that has no Tailwind equivalent
(`.site-header` translucency/blur, `.yg-logo` fill, scroll offsets).

### Brand palette — editorial, aligned with the app and owner portal
Warm **cream** page (`--bg-rgb`), warm **charcoal** ink (`--fg-rgb`, also the
logo + rules), and exactly **one** yellow — **butter** (`--accent-rgb`, #F5E6BE,
the app's `AppColors.butter`) with its hairline edge (`--accent-strong-rgb`,
#AA8D40, `actionPrimaryBorder`), which is also the focus-ring colour. Since
2026-10-20 this replaces the old lemon-curd so the site, the Golden Grapes owner
portal and the app share one primary yellow. Butter is a *fill/mark* colour only
(the 送出訊息 button, the "Get the app" pill on the legal pages, the hero's short
rule); **text on butter is charcoal (`onaccent`)**, and butter is never text or
a thin line on cream (it vanishes there — use the edge colour, as the contact
title's rule does). Type is **left-aligned** (Urbanist headlines, system-font
body, Cormorant / Noto Serif TC section titles). The hero sits on a light
map with the original **charcoal** elements (slogan, intro, colophon, header,
translucent-cream store buttons). The contact section sits on a dark grapes
photograph and the footer continues its dark ground (`--contact-ground-rgb`).
Text on those is light (`--on-dark-rgb`, warmGrey50, the app's dark-theme ink),
and `--scrim-rgb` (photoScrim) tints the dark header bar. Everything interactive
on the dark grounds is **glass in one vocabulary**, set by the Threads /
Instagram / Email rows (`.contact-link`): hairline `on-dark / 0.2` → `0.4` on
hover, fill `on-dark / 0.06` → `0.12`, `--radius-row` (12px), butter focus
outlines. The form fields, topic chips, form card and footer icon tiles all
follow it; the rows and the card also blur what's beneath them (the card adds
a little of the ground's tone) so a grape never sits sharp behind text.
`--error-rgb` is the light red used for invalid fields on dark. The sibling app (`../yellow_grapes_app`)
supplies the canonical logo assets and the *wordmark* (Urbanist).
**Constraint: keep the palette to the `:root` tokens — one yellow, no extra hues.**

### Other structural notes
- App-matched logo assets live in `logo/`: `app-logo.svg` is the app splash
  wordmark used by generated legal pages, while `app-icon.png` is the app icon
  used for the landing page and legal-page favicons / Apple touch icons.
- Background art is **toned by hand in the source images — the page adds no
  veil, tint or filter over it** (the owner's explicit choice, 2026-10-20).
  - Hero: the source is `images/app-map-wide-extended-withoutfrost.png`
    (the light, untoned map, 4658×2919, restored 2026-10-24; the toned
    `images/new-bg1.png` it replaced is no longer referenced). The page serves
    `images/hero-bg-{1920,2880,3840}.webp`
    (desktop `srcset`), `images/hero-bg-mobile.webp` (≤767px, a crop of the
    map's right ~58%, the only part phones show) and `images/hero-bg.jpg`
    (fallback `src`). If the art changes, regenerate them, e.g.
    `cwebp -q 86 -m 6 -sharp_yuv -noalpha -resize 1920 0 images/app-map-wide-extended-withoutfrost.png -o images/hero-bg-1920.webp`,
    `cwebp … -crop 1956 0 2702 2919 -resize 0 2160 images/app-map-wide-extended-withoutfrost.png -o images/hero-bg-mobile.webp`,
    and a 1920px JPEG for `images/hero-bg.jpg`. The charcoal text needs the art
    to stay light-to-mid-tone under it.
  - Contact: the source is `images/new-bg2.png` (dark linen with yellow
    grapes, 1536×1024). The page serves `images/contact-bg.webp` +
    `images/contact-bg.jpg` (`cwebp … -noalpha images/new-bg2.png -o images/contact-bg.webp`).
    `bg.png` / `bg2.png` are older art, no longer referenced.
  The `<img>`s `onerror`-hide if missing. The portrait `images/app-map.png`
  only serves as the OG/Twitter preview image.
- Contact section: stacked below 900px; from 900px, intro + glass links (left)
  and the glass form card (right). Below 1100px the photo is a plate at the top
  (`--contact-plate-h`) fading into `--contact-ground-rgb` (#1F1D19, the app's
  darkBackground — the photo's own darkest tone), with the content starting
  over its lower part; from 1100px it fills the section, drawn slightly
  over-wide (`--contact-photo-bleed`) so the grapes gather in the open gap
  between the two columns — retune by screenshot at 1280–1920px if the photo
  changes. The footer continues the same ground below a hairline (top row:
  tagline/meta + social tiles; bottom row: copyright + header-style uppercase
  nav).
- Hero type sizes are tunable tokens in `:root` (`--hero-slogan-size`,
  `--hero-taiwan-size`, and `-mobile` variants for ≤767px). 「第一版 · 臺灣」 (600)
  uses **Noto Serif TC** loaded from Google Fonts as a glyph subset (`text=`
  in the `<head>` link) — if that wording changes, update the `text=` value
  too. The contact title (「與我們聯絡」 / "Get in touch.") is set like the hero
  slogan: Urbanist 700, CJK falling back to the system sans.
- The sticky header has charcoal ink over the hero (transparent at the very
  top, the cream bar once scrolled) and light ink while a dark section
  (`[data-dark-ground]`: the contact section and the footer) is under it
  (`.is-on-dark`: a dark glass bar once scrolled). Both classes are toggled by
  the small scroll script at the end of the page; header colours go through
  `--hdr-ink` / `--hdr-text-alpha`. A new dark section must carry
  `data-dark-ground`.
  `--header-h-mobile` (80px) must stay tall enough to contain the 中/EN toggle.

### Contact form → email (Google Apps Script)
- The `#contact` form POSTs JSON `{name, email, topic, message, lang, website}`
  (`website` = hidden honeypot) as `text/plain` (no CORS preflight) to
  `CONTACT_ENDPOINT` in index.html's `<script>`, and expects
  `{success: true}` / `{success: false, error}` back. Validation, sending /
  success / error states and a 20s timeout are handled client-side.
- The receiving web app's source is **`scripts/apps-script/contact-form.gs`**
  (not deployed by CI). It emails each message to **mchou@torsade.com.tw** with
  Reply-To = the sender, logs it to a `Contact` tab in the linked Sheet, and
  rate-limits. **To change it:** paste the file into the Apps Script project →
  run `authorize` once after scope changes → Deploy → Manage deployments → Edit
  the existing web app → *New version*. Editing the existing deployment keeps
  the `/exec` URL, so `CONTACT_ENDPOINT` doesn't change.
- Public fallback address on the page: **support@yellow.grapes.com.tw** (same
  as the app). Threads / Instagram: `@yellowgrapes.app` (icons inlined from the
  app's `assets/images/social/`).

### Store links
- **Android** is a fixed link in the markup:
  `https://play.google.com/store/apps/details?id=tw.com.grapes.yellow`.
- The merchant-link fallback only enables its Android button when the
  **`ANDROID_PLAY_STORE_URL` repo variable** contains that public listing URL.
  Until then it shows "Coming soon" and never sends recipients to a 404.
- **iOS** comes from the **`IOS_APP_STORE_URL` repo variable** (Settings →
  Secrets and variables → Actions → Variables). On deploy,
  `scripts/build-store-config.js` writes it into `_site/store-config.js` (landing
  badge) and `_site/manager-invite/store-config.js` (invite redirect), and swaps
  the `<!-- @ios-smart-app-banner -->` marker in index.html for Safari's Smart
  App Banner meta tag. Until it's set, the iOS badge reads "Coming soon / 即將上架"
  and isn't clickable. The committed root `store-config.js` is only the local
  preview default (empty).
- Tailwind only generates classes it finds **literally in the files** it scans
  (`content: ['./*.html', './scripts/build-legal.js']` — `index.html`, the
  generated `terms.html` / `privacy.html`, and the legal-page template). Always run `build:legal` **before** the Tailwind build so the
  generated pages exist when Tailwind scans. Classes toggled from JS (e.g.
  `hidden`) must also appear in the static markup, and arbitrary values
  (`tracking-[0.3em]`, etc.) only exist if written out in the HTML.

## Legal pages (Terms & Privacy)

`/terms` and `/privacy` are **build-time snapshots** of policies whose single
source of truth is **Firestore** — never edit policy text in this repo.

- **Source of truth:** Firestore project **`yellow-grapes-prod`**, collection
  **`legal_documents`**, docs **`tos`** and **`privacy_policy`**. Fields read:
  `current_version` (int), `updated_at` (Timestamp → "Last updated"),
  `articles_zh` / `articles_en` (arrays of `{ title, body }`, plain text). These
  are authored by the sibling **master panel**; the app reads the same docs.
- **Build mechanism:** `npm run build:legal` (`scripts/build-legal.js`) fetches
  the docs with the **Firebase Admin SDK** (a trusted server-side read that
  bypasses security rules — no public reads, no rule changes) and renders
  `terms.html` / `privacy.html` via a shared template that mirrors the landing
  page's chrome and `:root` tokens. Both languages render with the same 中/EN
  toggle as the landing page. **Nothing is fetched at runtime; no Firebase SDK
  ships to the browser.** The rendered pages are **gitignored** CI artifacts.
- **All paths/IDs/locales** live in one object: `scripts/legal.config.js`.
- **Public URLs:** `/terms`, `/privacy` — baked into the app
  (`yellow_grapes_app/.../legal_acceptance_dialog.dart`) and the App Store /
  Play listings. **Do not change them.**
- **⚠ Redeploy after editing a policy:** editing in the master panel writes to
  Firestore but does **not** trigger a landing deploy. After editing, re-run the
  deploy (GitHub → **Actions → Deploy to GitHub Pages → Run workflow**). The
  visible **"Last updated"** date (from `updated_at`) is the drift safeguard — if
  it looks stale on the live page, you forgot to redeploy.

### One-time manual setup (Firebase + GitHub)

1. **Service-account key** (read access to Firestore): Firebase Console → project
   **`yellow-grapes-prod`** → ⚙ **Project settings → Service accounts → Generate
   new private key**. Downloads a JSON file. Keep it secret; never commit it
   (`.gitignore` covers `service-account*.json`).
2. **GitHub secret:** repo **Settings → Secrets and variables → Actions → New
   repository secret** → name **`FIREBASE_SERVICE_ACCOUNT`**, value = the entire
   JSON file contents.
3. **Pages source:** repo **Settings → Pages → Build and deployment → Source →
   GitHub Actions** (one-time switch from "Deploy from a branch"). The custom
   domain is preserved via the `CNAME` file in the artifact.
4. **Local preview (optional):** `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`
   then `npm run build:all` and open `terms.html` / `privacy.html`. The build
   script also accepts `FIREBASE_SERVICE_ACCOUNT` (JSON string) like CI does.

No Firestore rule changes are required — the Admin SDK bypasses rules.

## Gotchas

- **Node 18** pins this to Tailwind **v3**. Tailwind v4 needs Node 20+ and a
  different (CSS-first) config; don't `npm install tailwindcss@latest` without
  bumping Node and migrating the config.
- `tailwindcss --watch` exits instantly when stdin is closed (non-interactive /
  background shells). Run `npm run watch` in a real terminal/TTY.

## Outstanding TODOs
- OG/Twitter preview uses the portrait `app-map.png` (crops in wide cards); a
  dedicated 1200×630 `images/og.png` would preview better.
- Set the `IOS_APP_STORE_URL` repo variable once the app is live on the App
  Store, then re-run the deploy (see **Store links**).
- Set `ANDROID_PLAY_STORE_URL` once the production Play listing is public.
- Set the `PLAY_APP_SIGNING_CERT_SHA256` secret to the Play **app signing**
  certificate when available. Missing configuration omits Android associations;
  malformed supplied values fail the build. The upload/debug certificate is not a substitute.


### Pre-release shared merchant and event links (29 October 2026)

The shared route is `/merchant/?id=MERCHANT_ID&event=EVENT_ID` (omit `event` for a merchant). `merchant/index.html` provides the branded fallback and event-aware heading. Both store URLs may remain unset until their listings are public. `scripts/assemble-site.js` packages this page, its assets, store configuration, and associations for GitHub Pages. Missing Android signing configuration omits `assetlinks.json` but still generates iOS associations; a malformed supplied fingerprint fails the build. Publishing requires explicit approval for the prepared update.
