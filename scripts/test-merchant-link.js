const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  build,
  readAndroidUrl,
  readIosUrl,
} = require('./build-store-config.js');

const merchantLanding = fs.readFileSync(
  path.resolve(__dirname, '../merchant/index.html'),
  'utf8',
);

test('merchant fallback is branded and never navigates automatically', () => {
  assert.match(merchantLanding, /data-yellow-grapes-merchant-landing/);
  assert.match(merchantLanding, /never redirects automatically/i);
  assert.doesNotMatch(
    merchantLanding,
    /(?:location\.(?:replace|assign)|location\.href\s*=|setTimeout\s*\(|intent:|market:)/i,
  );
});

test('empty store configuration keeps both buttons disabled', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yg-store-config-'));
  const result = build(directory, {});
  assert.equal(result.iosUrl, '');
  assert.equal(result.androidUrl, '');
  const config = fs.readFileSync(path.join(directory, 'store-config.js'), 'utf8');
  assert.match(config, /YELLOW_GRAPES_IOS_APP_STORE_URL = ""/);
  assert.match(config, /YELLOW_GRAPES_ANDROID_PLAY_STORE_URL = ""/);
});

test('configured public listings are emitted together', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yg-store-config-'));
  const iosUrl = 'https://apps.apple.com/tw/app/yellow-grapes/id1234567890';
  const androidUrl =
    'https://play.google.com/store/apps/details?id=tw.com.grapes.yellow';
  const result = build(directory, {
    IOS_APP_STORE_URL: iosUrl,
    ANDROID_PLAY_STORE_URL: androidUrl,
  });
  assert.equal(result.iosUrl, iosUrl);
  assert.equal(result.androidUrl, androidUrl);
  const config = fs.readFileSync(path.join(directory, 'store-config.js'), 'utf8');
  assert.match(config, /apps\.apple\.com/);
  assert.match(config, /play\.google\.com/);
});

test('store URL readers reject lookalike destinations', () => {
  assert.throws(
    () => readIosUrl({ IOS_APP_STORE_URL: 'https://example.com/app' }),
    /apps\.apple\.com/,
  );
  assert.throws(
    () => readAndroidUrl({ ANDROID_PLAY_STORE_URL: 'https://example.com/app' }),
    /tw\.com\.grapes\.yellow/,
  );
});

const { execFileSync, spawnSync } = require('node:child_process');

test('iOS associations and fallback build without an Android fingerprint', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yg-associations-'));
  execFileSync(process.execPath, [path.resolve(__dirname, 'build-association-files.js'), directory], { env: { ...process.env, PLAY_APP_SIGNING_CERT_SHA256: '' } });
  const ios = JSON.parse(fs.readFileSync(path.join(directory, 'apple-app-site-association'), 'utf8'));
  assert.equal(ios.applinks.details[0].components[0]['/'], '/merchant/*');
  assert.equal(fs.existsSync(path.join(directory, 'assetlinks.json')), false);
});

test('valid Android fingerprints are published; malformed values fail', () => {
  const script = path.resolve(__dirname, 'build-association-files.js');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yg-associations-'));
  const fingerprint = Array(32).fill('AB').join(':');
  execFileSync(process.execPath, [script, directory], { env: { ...process.env, PLAY_APP_SIGNING_CERT_SHA256: fingerprint } });
  const android = JSON.parse(fs.readFileSync(path.join(directory, 'assetlinks.json'), 'utf8'));
  assert.equal(android[0].target.sha256_cert_fingerprints[0], fingerprint);
  assert.notEqual(spawnSync(process.execPath, [script, directory], { env: { ...process.env, PLAY_APP_SIGNING_CERT_SHA256: 'invalid' } }).status, 0);
  execFileSync(process.execPath, [script, directory], { env: { ...process.env, PLAY_APP_SIGNING_CERT_SHA256: '' } });
  assert.equal(fs.existsSync(path.join(directory, 'assetlinks.json')), false);
});

test('event shares present event wording without rewriting their location', () => {
  const vm = require('node:vm');
  const inline = merchantLanding.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const heading = { textContent: '' };
  const location = { search: '?id=merchant-1&event=event-1' };
  const document = { title: '', getElementById: (id) => { assert.equal(id, 'shareHeading'); return heading; } };
  vm.runInNewContext(inline, { window: { location }, document, URLSearchParams });
  assert.equal(heading.textContent, '在 App 中查看這場活動');
  assert.equal(location.search, '?id=merchant-1&event=event-1');
});

test('assembled artifact contains merchant fallback, assets, and empty store config', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yg-site-artifact-'));
  execFileSync(process.execPath, [path.resolve(__dirname, 'assemble-site.js'), directory], { env: { ...process.env, IOS_APP_STORE_URL: '', ANDROID_PLAY_STORE_URL: '', PLAY_APP_SIGNING_CERT_SHA256: '' } });
  assert.match(fs.readFileSync(path.join(directory, 'merchant/index.html'), 'utf8'), /data-yellow-grapes-merchant-landing/);
  assert.match(fs.readFileSync(path.join(directory, 'store-config.js'), 'utf8'), /YELLOW_GRAPES_IOS_APP_STORE_URL = ""/);
  assert.ok(fs.existsSync(path.join(directory, 'logo/app-icon.png')));
  assert.ok(fs.existsSync(path.join(directory, '.well-known/apple-app-site-association')));
  assert.equal(fs.existsSync(path.join(directory, 'scripts')), false);
});
