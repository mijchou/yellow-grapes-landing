#!/usr/bin/env node
/**
 * Deploy-time store config. Run by the "Assemble site" step of
 * .github/workflows/deploy.yml after the site files are copied into _site/:
 *
 *   node scripts/build-store-config.js _site
 *
 * Reads the IOS_APP_STORE_URL repository variable (empty until the app is live
 * on the App Store) and writes it to the two places that need it:
 *   - _site/store-config.js                 → landing page iOS badge
 *   - _site/manager-invite/store-config.js  → manager-invite iPhone redirect
 * and, when the URL carries an App Store id (…/id1234567890), swaps the
 * `<!-- @ios-smart-app-banner -->` marker in _site/index.html for Safari's
 * native "Open in App Store" banner meta tag.
 *
 * Unset → both files get an empty URL (iOS badge reads "Coming soon", invite
 * redirect stays off) and the marker is left as a harmless comment.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BANNER_MARKER = '<!-- @ios-smart-app-banner -->';

function readIosUrl(env) {
  const url = (env.IOS_APP_STORE_URL || '').trim();
  if (url && !/^https:\/\/apps\.apple\.com\//.test(url)) {
    throw new Error('IOS_APP_STORE_URL must be a public apps.apple.com URL.');
  }
  return url;
}

function appIdFrom(url) {
  const match = /\/id(\d+)(?:[/?#]|$)/.exec(url);
  return match ? match[1] : null;
}

function configScript(url) {
  return `window.YELLOW_GRAPES_IOS_APP_STORE_URL = ${JSON.stringify(url)};\n`;
}

function build(siteDir, env) {
  const url = readIosUrl(env);
  const script = configScript(url);
  fs.writeFileSync(path.join(siteDir, 'store-config.js'), script);
  fs.mkdirSync(path.join(siteDir, 'manager-invite'), { recursive: true });
  fs.writeFileSync(path.join(siteDir, 'manager-invite', 'store-config.js'), script);

  const appId = appIdFrom(url);
  const indexPath = path.join(siteDir, 'index.html');
  if (appId && fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    if (!html.includes(BANNER_MARKER)) {
      throw new Error(`index.html is missing the ${BANNER_MARKER} marker.`);
    }
    fs.writeFileSync(
      indexPath,
      html.replace(BANNER_MARKER, `<meta name="apple-itunes-app" content="app-id=${appId}" />`),
    );
  }
  return { url, appId };
}

if (require.main === module) {
  const siteDir = process.argv[2];
  if (!siteDir) throw new Error('Pass the assembled site directory (e.g. _site) as the first argument.');
  const { url, appId } = build(path.resolve(siteDir), process.env);
  console.log(url
    ? `iOS App Store URL set${appId ? ` (smart banner app-id ${appId})` : ' (no app id found — smart banner skipped)'}.`
    : 'IOS_APP_STORE_URL not set — iOS badge shows "Coming soon"; invite redirect stays off for iPhone.');
}

module.exports = { build, appIdFrom, readIosUrl };
