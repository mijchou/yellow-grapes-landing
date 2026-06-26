/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan every page so JIT generates exactly the utilities/variants used,
  // including arbitrary values (e.g. tracking-[0.3em]) and peer-* variants.
  // The glob also picks up the build-generated terms.html / privacy.html — so
  // always run `build:legal` (which writes them) BEFORE the Tailwind build.
  content: ['./*.html'],
  theme: {
    extend: {
      // Brand palette — mirrors the :root design tokens in index.html.
      // (The actual values live in index.html's <style> so they stay tunable
      // without a rebuild; these just let Tailwind utilities reference them.)
      // Defined as rgb(<channels> / <alpha-value>) so Tailwind opacity
      // modifiers work (e.g. border-fg/30, via-bg/70). The channel vars are
      // the single source of truth, in index.html's :root (tunable, no rebuild).
      colors: {
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        fg: 'rgb(var(--fg-rgb) / <alpha-value>)',
        fgmuted: 'rgb(var(--fg-muted-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',          // lemon-curd yellow (fills/marks only)
        accentstrong: 'rgb(var(--accent-strong-rgb) / <alpha-value>)', // hover / focus / yellow borders
        onaccent: 'rgb(var(--fg-rgb) / <alpha-value>)',            // text on yellow = charcoal (never white)
        hairline: 'var(--line)',                                    // grid hairlines / dividers / borders
      },
      fontFamily: {
        // App body/UI uses the platform system font (SF Pro / Roboto).
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Noto Sans TC"', 'sans-serif'],
        // Brand wordmark + headings.
        brand: ['Urbanist', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
