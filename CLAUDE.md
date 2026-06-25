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
npm run build      # production: minified dist/output.css (run before committing)
```

There is no lint or test step.

**Deploy = commit + push to `main`.** GitHub Pages serves the repo's files
directly with **no build step**, so the committed `dist/output.css` *is* what
production loads. Always `npm run build` before committing or the live site
ships stale styles. (Pushing to `main` triggers the live deploy.)

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
- Tailwind only generates classes it finds **literally in `index.html`**
  (content scan). Classes toggled from JS (e.g. `hidden`) must also appear in
  the static markup, and arbitrary values (`tracking-[0.3em]`, etc.) only exist
  if written out in the HTML.

## Gotchas

- **Node 18** pins this to Tailwind **v3**. Tailwind v4 needs Node 20+ and a
  different (CSS-first) config; don't `npm install tailwindcss@latest` without
  bumping Node and migrating the config.
- `tailwindcss --watch` exits instantly when stdin is closed (non-interactive /
  background shells). Run `npm run watch` in a real terminal/TTY.

## Outstanding TODOs (in `index.html`)
- `og:url` / `canonical` still use placeholder `yellowgrapes.app`; the real
  domain is `yellow.grapes.com.tw`.
- Footer `Privacy` / `Terms` are placeholder `#` links; `Contact` points to the
  waitlist section.
- OG/Twitter preview uses the portrait `app-map.png` (crops in wide cards); a
  dedicated 1200×630 `images/og.png` would preview better.
