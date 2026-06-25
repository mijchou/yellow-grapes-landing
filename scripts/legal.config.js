/**
 * Single source of configuration for the build-time legal-pages render.
 *
 * The canonical Terms of Service and Privacy Policy live ONLY in Firestore
 * (project `yellow-grapes-prod`, collection `legal_documents`), authored by the
 * sibling master panel. `scripts/build-legal.js` reads them at BUILD time with
 * the Firebase Admin SDK and emits static /terms and /privacy pages. Nothing
 * here is fetched at runtime and no Firebase SDK ships to the browser.
 *
 * Every tunable path / ID / locale / output filename lives in THIS object so
 * there is exactly one place to change them. (Visual tokens live in index.html's
 * :root and are mirrored into each generated page by the template.)
 */
module.exports = {
  // ── Firebase / Firestore (the single source of truth) ──────────────────────
  projectId: 'yellow-grapes-prod',
  collection: 'legal_documents',

  // Absolute origin used for <link rel="canonical"> and og:url on the pages.
  siteOrigin: 'https://yellow.grapes.com.tw',

  // ── Locale handling ─────────────────────────────────────────────────────────
  // Keys are our internal locale codes; `field` is the Firestore array field and
  // `htmlLang` is the value written to <html lang>. The default is shown first.
  defaultLocale: 'zh',
  locales: {
    zh: { field: 'articles_zh', htmlLang: 'zh-Hant', intl: 'zh-Hant', label: '中' },
    en: { field: 'articles_en', htmlLang: 'en', intl: 'en', label: 'EN' },
  },

  // ── Firestore field names (mirrors the app/panel LegalDocument model) ────────
  fields: {
    version: 'current_version',
    updatedAt: 'updated_at',
    article: { title: 'title', body: 'body' },
  },

  // ── Pages to generate ────────────────────────────────────────────────────────
  // `docId` = Firestore document id; `outFile` = file written to repo root;
  // `path` = the public, stable URL (baked into the app + app-store listings —
  // DO NOT change). `title` = per-locale page heading / <title>.
  pages: {
    terms: {
      docId: 'tos',
      outFile: 'terms.html',
      path: '/terms',
      title: { zh: '服務條款', en: 'Terms of Service' },
    },
    privacy: {
      docId: 'privacy_policy',
      outFile: 'privacy.html',
      path: '/privacy',
      title: { zh: '隱私權政策', en: 'Privacy Policy' },
    },
  },
};
