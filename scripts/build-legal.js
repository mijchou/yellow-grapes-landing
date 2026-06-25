#!/usr/bin/env node
/**
 * Build-time render of the Terms of Service and Privacy Policy.
 *
 * Reads the canonical documents from Firestore (the single source of truth,
 * authored by the master panel) with the Firebase Admin SDK and writes static
 * `terms.html` / `privacy.html` to the repo root. Runs at BUILD time only — the
 * deployed pages are plain static HTML with no Firebase SDK and no runtime fetch.
 *
 * Auth (a trusted server-side read that bypasses Firestore security rules):
 *   - CI:    env FIREBASE_SERVICE_ACCOUNT = the full service-account JSON string.
 *   - Local: env GOOGLE_APPLICATION_CREDENTIALS = path to the key file (ADC).
 * If neither is present the build fails loudly (we never deploy a blank policy).
 *
 * All paths/IDs/locales live in ./legal.config.js. Visual tokens are mirrored
 * from index.html's :root by the template below.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const config = require('./legal.config.js');

const ROOT = path.join(__dirname, '..');

// ── Small helpers ────────────────────────────────────────────────────────────

/** Escape text destined for HTML so plain-text policy bodies can't inject markup. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render a plain-text body (the format stored in Firestore) into HTML:
 * blank lines start a new <p>; single newlines become <br>. Text is escaped.
 */
function renderBody(body) {
  return String(body || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br />')}</p>`)
    .join('\n          ');
}

/** Format a JS Date for a given locale, or null. */
function formatDate(date, intlLocale) {
  if (!date) return null;
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long' }).format(date);
}

/** "Last updated" line per locale (the visible drift safeguard). */
function lastUpdatedLine(localeKey, dateStr, version) {
  if (localeKey === 'zh') {
    const v = version != null ? ` · 第 ${version} 版` : '';
    return dateStr ? `最後更新：${dateStr}${v}` : `最後更新：—${v}`;
  }
  const v = version != null ? ` · v${version}` : '';
  return dateStr ? `Last updated: ${dateStr}${v}` : `Last updated: —${v}`;
}

/** Localized notice shown when a locale has no authored articles yet. */
function missingNotice(localeKey) {
  return localeKey === 'zh'
    ? '本文件目前僅提供英文版，請使用上方的語言切換查看。'
    : 'This document is currently only available in Chinese — use the language toggle above.';
}

// ── Template ─────────────────────────────────────────────────────────────────

/** Render one article ({ title, body }) to HTML. */
function renderArticle(article) {
  const titleField = config.fields.article.title;
  const bodyField = config.fields.article.body;
  const title = article[titleField];
  const heading = title ? `<h2>${escapeHtml(title)}</h2>\n          ` : '';
  return `<article class="legal-article">\n          ${heading}${renderBody(article[bodyField])}\n        </article>`;
}

/** Render the <section data-lang="…"> block for one locale. */
function renderLocaleSection(localeKey, pageDef, parsed) {
  const articles = parsed.articlesByLocale[localeKey] || [];
  const updated = lastUpdatedLine(
    localeKey,
    parsed.dateByLocale[localeKey],
    parsed.version,
  );
  const heading = pageDef.title[localeKey];
  const body = articles.length
    ? articles.map(renderArticle).join('\n        ')
    : `<p class="legal-missing">${missingNotice(localeKey)}</p>`;
  return `      <section data-lang="${localeKey}" hidden>
        <h1>${escapeHtml(heading)}</h1>
        <p class="last-updated">${escapeHtml(updated)}</p>
        ${body}
      </section>`;
}

/** Full standalone HTML page matching the landing page's chrome + styling. */
function renderPage(pageDef, parsed) {
  const canonical = config.siteOrigin + pageDef.path;
  const defLocale = config.defaultLocale;
  const htmlLang = config.locales[defLocale].htmlLang;
  const sections = Object.keys(config.locales)
    .map((localeKey) => renderLocaleSection(localeKey, pageDef, parsed))
    .join('\n');

  // Chrome (header CTA + footer nav + <title>) translations, applied client-side
  // by the same toggle the landing page uses. Values mirror index.html's I18N.
  const chrome = {
    en: {
      title: `${pageDef.title.en} — Yellow Grapes`,
      'nav.join': 'Join waitlist',
      'footer.home': 'Home',
      'footer.privacy': 'Privacy',
      'footer.terms': 'Terms',
      'footer.contact': 'Contact',
    },
    zh: {
      title: `${pageDef.title.zh} — Yellow Grapes`,
      'nav.join': '加入候補名單',
      'footer.home': '首頁',
      'footer.privacy': '隱私權',
      'footer.terms': '服務條款',
      'footer.contact': '聯絡我們',
    },
  };

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${escapeHtml(chrome[defLocale].title)}</title>
  <meta name="description" content="${escapeHtml(pageDef.title.en)} for Yellow Grapes." />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${canonical}" />

  <!-- Favicon: Yellow Grapes logo (SVG). -->
  <link rel="icon" type="image/svg+xml" href="/logo/dark-y.svg" />

  <!-- Brand wordmark font (Urbanist — matches the landing page). -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />

  <!-- Tailwind — same committed build the landing page links (absolute path so
       this works whether served at ${pageDef.path} or ${pageDef.path}/). -->
  <link rel="stylesheet" href="/dist/output.css" />

  <style>
    /* ───── Design tokens — kept in sync with index.html's :root ───── */
    :root {
      --bg: #FEFDFB;
      --bg-rgb: 254 253 251;

      --header-border: #8A6E47;
      --header-opacity: 0.85;
      --header-blur: 12px;
      --header-h-desktop: 100px;
      --header-h-mobile: 56px;

      --fg: #423D35;
      --fg-muted: #6C624D;

      --accent: #6C4D27;
      --accent-muted: #8C693C;

      --border: #8A6E47;

      --logo-h: 34px;
      --logo-h-mobile: 28px;
      --wordmark-size: 1rem;
      --wordmark-weight: 1000;
      --wordmark-tracking: 0.5em;
    }

    html { scroll-behavior: smooth; }
    body { background-color: var(--bg); }

    /* Sticky, translucent, blurred header (matches index.html) */
    .site-header {
      height: var(--header-h-desktop);
      background-color: rgb(var(--bg-rgb) / var(--header-opacity));
      -webkit-backdrop-filter: blur(var(--header-blur));
      backdrop-filter: blur(var(--header-blur));
      border-bottom: 1px solid var(--header-border);
    }
    @media (max-width: 640px) {
      .site-header { height: var(--header-h-mobile); }
    }

    .yg-logo { display: block; height: var(--logo-h); width: auto; }
    @media (max-width: 640px) { .yg-logo { height: var(--logo-h-mobile); } }
    .yg-wordmark {
      font-size: var(--wordmark-size);
      font-weight: var(--wordmark-weight);
      letter-spacing: var(--wordmark-tracking);
    }

    /* ───── Policy-body type (bespoke; no Tailwind equivalent) ───── */
    .legal-content { max-width: 46rem; }
    .legal-content h1 {
      font-size: 1.875rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      margin-bottom: 0.5rem;
    }
    .legal-content .last-updated {
      color: var(--fg-muted);
      font-size: 0.875rem;
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .legal-article { margin-bottom: 2rem; }
    .legal-content h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--fg);
      margin-bottom: 0.5rem;
    }
    .legal-content p {
      color: var(--fg-muted);
      line-height: 1.75;
      margin-bottom: 0.75rem;
    }
    .legal-content .legal-missing { font-style: italic; }
    [data-lang][hidden] { display: none; }
  </style>

  <!-- No-JS fallback: the toggle hides the inactive language, so without JS we
       reveal both languages (stacked) rather than showing an empty page. -->
  <noscript><style>[data-lang][hidden] { display: block; }</style></noscript>
</head>

<body id="top" class="font-sans text-fg antialiased">

  <!-- ─────────────────────────────  HEADER  ───────────────────────────── -->
  <header class="site-header sticky top-0 z-50">
    <div class="mx-auto flex h-full max-w-6xl items-center justify-between px-6 sm:px-8">
      <!-- Left: logo + wordmark -->
      <a href="/" class="flex items-center gap-5 text-fg" aria-label="Yellow Grapes — home">
        <img class="yg-logo" src="/logo/logo.svg" alt="Yellow Grapes logo" />
        <span class="yg-wordmark font-brand uppercase">
          Yellow&nbsp;Grapes
        </span>
      </a>

      <!-- Right: waitlist CTA + language toggle -->
      <div class="flex items-center gap-3 sm:gap-4">
        <a href="/#waitlist"
           class="rounded-full bg-accent px-4 py-2 text-xs font-semibold tracking-wide text-bg transition-opacity hover:opacity-90 sm:px-5 sm:text-sm"
           data-i18n="nav.join">
          Join waitlist
        </a>
        <button id="langToggle" type="button"
                class="rounded-full border border-hairline px-3 py-2 text-xs font-semibold tracking-wide text-fg transition-colors hover:border-accent hover:text-accent sm:text-sm">
          中
        </button>
      </div>
    </div>
  </header>

  <!-- ─────────────────────────────  CONTENT  ───────────────────────────── -->
  <main class="legal-content mx-auto px-6 py-12 sm:px-8 sm:py-16">
${sections}
  </main>

  <!-- ─────────────────────────────  FOOTER  ───────────────────────────── -->
  <footer class="border-t border-hairline">
    <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-8 sm:px-8 md:flex-row">
      <a href="/" class="flex items-center gap-5 text-fg" aria-label="Yellow Grapes — home">
        <img class="yg-logo" src="/logo/logo.svg" alt="Yellow Grapes logo" />
        <span class="yg-wordmark font-brand uppercase">Yellow&nbsp;Grapes</span>
      </a>

      <nav class="flex items-center gap-8 text-sm text-fgmuted">
        <a href="/" class="transition-colors hover:text-fg" data-i18n="footer.home">Home</a>
        <a href="/privacy" class="transition-colors hover:text-fg" data-i18n="footer.privacy">Privacy</a>
        <a href="/terms" class="transition-colors hover:text-fg" data-i18n="footer.terms">Terms</a>
        <a href="/#waitlist" class="transition-colors hover:text-fg" data-i18n="footer.contact">Contact</a>
      </nav>
    </div>
  </footer>

  <script>
    // Language toggle — reuses the landing page's shared 'yg-lang' key and the
    // #langToggle button so the choice is consistent across the whole site.
    (function () {
      var CHROME = ${JSON.stringify(chrome)};
      var DEFAULT = ${JSON.stringify(defLocale)};
      var langToggle = document.getElementById('langToggle');

      function applyLang(lang) {
        if (!CHROME[lang]) lang = DEFAULT;
        var dict = CHROME[lang];

        // Chrome strings (header CTA, footer nav).
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
          var val = dict[el.getAttribute('data-i18n')];
          if (val != null) el.textContent = val;
        });

        // Show the matching policy language, hide the rest.
        document.querySelectorAll('[data-lang]').forEach(function (el) {
          el.hidden = (el.getAttribute('data-lang') !== lang);
        });

        document.title = dict.title;
        document.documentElement.lang = (lang === 'zh') ? 'zh-Hant' : 'en';
        if (langToggle) {
          langToggle.textContent = (lang === 'zh') ? 'EN' : '中';
          langToggle.setAttribute('aria-label', (lang === 'zh') ? 'Switch to English' : '切換至繁體中文');
        }
        try { localStorage.setItem('yg-lang', lang); } catch (e) {}
        window.__ygLang = lang;
      }

      var saved;
      try { saved = localStorage.getItem('yg-lang'); } catch (e) {}
      var lang = saved || ((navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en');
      applyLang(lang);
      if (langToggle) {
        langToggle.addEventListener('click', function () {
          applyLang(window.__ygLang === 'zh' ? 'en' : 'zh');
        });
      }
    })();
  </script>
</body>
</html>
`;
}

// ── Firestore fetch + parse ──────────────────────────────────────────────────

function resolveCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw && raw.trim()) {
    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON: ' + err.message);
    }
    return cert(json);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  throw new Error(
    'No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT (JSON string, used in CI) ' +
      'or GOOGLE_APPLICATION_CREDENTIALS (path to a key file, for local builds).',
  );
}

/** Pull the fields we need out of a Firestore document snapshot. */
function parseDoc(snap, pageKey) {
  if (!snap.exists) {
    throw new Error(`Firestore doc ${config.collection}/${snap.id} for "${pageKey}" does not exist.`);
  }
  const data = snap.data() || {};
  const version = data[config.fields.version];

  const updatedAtRaw = data[config.fields.updatedAt];
  const updatedAt =
    updatedAtRaw && typeof updatedAtRaw.toDate === 'function' ? updatedAtRaw.toDate() : null;

  const articlesByLocale = {};
  const dateByLocale = {};
  for (const localeKey of Object.keys(config.locales)) {
    const loc = config.locales[localeKey];
    const arr = data[loc.field];
    articlesByLocale[localeKey] = Array.isArray(arr) ? arr : [];
    dateByLocale[localeKey] = formatDate(updatedAt, loc.intl);
  }

  // The default locale must have content — otherwise we'd ship a blank policy.
  if (articlesByLocale[config.defaultLocale].length === 0) {
    throw new Error(
      `Firestore doc ${config.collection}/${snap.id} has no "${config.defaultLocale}" articles ` +
        `(field ${config.locales[config.defaultLocale].field}). Refusing to write a blank page.`,
    );
  }
  if (updatedAt == null) {
    console.warn(`  ⚠ ${snap.id}: no "${config.fields.updatedAt}" — "Last updated" will show "—".`);
  }

  return { version, articlesByLocale, dateByLocale };
}

async function main() {
  const credential = resolveCredential();
  initializeApp({ credential, projectId: config.projectId });
  const db = getFirestore();

  console.log(`Reading legal documents from ${config.projectId}/${config.collection} …`);

  for (const pageKey of Object.keys(config.pages)) {
    const pageDef = config.pages[pageKey];
    const snap = await db.collection(config.collection).doc(pageDef.docId).get();
    const parsed = parseDoc(snap, pageKey);
    const html = renderPage(pageDef, parsed);
    const outPath = path.join(ROOT, pageDef.outFile);
    fs.writeFileSync(outPath, html, 'utf8');
    const counts = Object.keys(config.locales)
      .map((l) => `${l}:${parsed.articlesByLocale[l].length}`)
      .join(' ');
    console.log(`  ✓ ${pageDef.outFile}  (v${parsed.version} · ${counts})  → ${pageDef.path}`);
  }

  console.log('Legal pages built.');
}

// Run when invoked directly; export the pure renderers for offline testing.
if (require.main === module) {
  main().catch((err) => {
    console.error('\n✗ build-legal failed:', err.message);
    process.exit(1);
  });
}

module.exports = { renderPage, parseDoc, escapeHtml, renderBody, formatDate };
