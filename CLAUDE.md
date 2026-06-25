# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, static **landing page** for the Yellow Grapes wine-map app
(`index.html`). It is styled with a **locally-built Tailwind CSS v3** stylesheet
and deployed via **GitHub Pages** at the custom domain `yellow.grapes.com.tw`
(see `CNAME`). There is no backend, no framework, and no test suite.

## Commands

```bash
npm install        # first-time setup
npm run watch      # dev: rebuilds dist/output.css on change — run in a real terminal
npm run build      # production: minified dist/output.css
npm run build:legal  # render terms.html / privacy.html from Firestore (needs creds — see below)
npm run build:all    # build:legal then build (the order CI uses)
```

There is no lint or test step.

**Deploy = push to `main` → GitHub Action.** Pages is set to deploy *from GitHub
Actions* (`.github/workflows/deploy.yml`), not directly from the branch. On each
push (and via the manual **Run workflow** button) the Action: renders the legal
pages from Firestore → builds the CSS → publishes `index.html`, the generated
`terms.html` / `privacy.html`, `dist/`, `logo/`, `images/`, `CNAME` to Pages.
The committed `dist/output.css` is what local preview uses; CI rebuilds it on
deploy. See **Legal pages** below for the Firestore secret the Action needs.

## Architecture

The whole page lives in **`index.html`** — header, hero, waitlist form, and
footer in one file. Tailwind is a build input, not a runtime dependency:
`src/input.css` (the three `@tailwind` layers only) compiles to the committed
`dist/output.css`, which `index.html` links.

### Design tokens live in TWO places that must stay in sync
- **`index.html` `<style>` `:root`** — the *actual* brand values as CSS custom
  properties (`--bg`, `--fg`, `--accent`, `--border`, header sizing, etc.).
  These are intentionally inline (not in `src/input.css`) so they can be tuned
  and previewed **without a rebuild**.
- **`tailwind.config.js`** — `theme.extend.colors` maps utility names
  (`bg`, `fg`, `fgmuted`, `accent`, `accentmuted`, `hairline`) to those vars via
  `var(--…)`, and `fontFamily` defines `sans` (system stack) + `brand`
  (Urbanist).

So adding a brand color means editing **both**: define the `--var` in
`:root` and add the utility mapping in `tailwind.config.js`. The same inline
`<style>` also holds bespoke component CSS that has no Tailwind equivalent
(`.site-header` translucency/blur, `.yg-logo` fill, scroll offsets).

### Brand consistency with the Flutter app
Colors and fonts are derived from the sibling Flutter app at
`../yellow_grapes_app` — `lib/theme/colors.dart`, `lib/theme/typography.dart`,
and `lib/widgets/splash/splash_overlay.dart`. When changing brand styling, match
the app: e.g. `--accent #6C4D27` = `themeText5Light`, `--border #8A6E47` =
`themeBorder5Light`, `--fg #423D35` = splash text, body = system font, wordmark
= Urbanist. **Constraint: do not introduce colors outside the `:root` tokens /
the app theme.**

### Other structural notes
- The logo is **inlined SVG** (combined `y` + dot, duplicated in header and
  footer) using `currentColor` so it inherits `--fg`. The `logo/` `.svg` files
  are the source art; `logo/dark-y.svg` is also the favicon.
- The right-column app screenshot is `images/app-map.png` (portrait); it has a
  JS `onerror` fallback to the logo.
- The waitlist form is **UI-only** — client-side validation + a "thanks" state,
  no submission. Wire a backend where the `// TODO` marks the submit handler.
- Tailwind only generates classes it finds **literally in the HTML** it scans
  (`content: ['./*.html']` — `index.html` plus the generated `terms.html` /
  `privacy.html`). Always run `build:legal` **before** the Tailwind build so the
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

## Outstanding TODOs (in `index.html`)
- `og:url` / `canonical` still use placeholder `yellowgrapes.app`; the real
  domain is `yellow.grapes.com.tw`. (The generated `/terms` & `/privacy` pages
  already use the correct canonical.)
- OG/Twitter preview uses the portrait `app-map.png` (crops in wide cards); a
  dedicated 1200×630 `images/og.png` would preview better.
