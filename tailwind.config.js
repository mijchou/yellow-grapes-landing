/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan the page so JIT generates exactly the utilities/variants used,
  // including arbitrary values (e.g. tracking-[0.3em]) and peer-* variants.
  content: ['./index.html'],
  theme: {
    extend: {
      // Brand palette — mirrors the :root design tokens in index.html.
      // (The actual values live in index.html's <style> so they stay tunable
      // without a rebuild; these just let Tailwind utilities reference them.)
      colors: {
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        fgmuted: 'var(--fg-muted)',
        accent: 'var(--accent)',
        accentmuted: 'var(--accent-muted)',
        hairline: 'var(--border)',
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
