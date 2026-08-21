const assert = require('node:assert/strict');
const test = require('node:test');
const {
  androidStoreUrl,
  destinationForDevice,
} = require('../manager-invite/redirect.js');

const appStoreUrl = 'https://apps.apple.com/tw/app/yellow-grapes/id1234567890';

test('iPhone redirects to the configured public App Store URL', () => {
  assert.equal(destinationForDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }, appStoreUrl), appStoreUrl);
});

test('iPadOS identifies iPads that report themselves as Mac', () => {
  assert.equal(destinationForDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 5 }, appStoreUrl), appStoreUrl);
});

test('Android redirects to the public Play Store', () => {
  assert.equal(destinationForDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)' }, appStoreUrl), androidStoreUrl);
});

test('desktop remains on the mobile-device requirement page', () => {
  assert.equal(destinationForDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', platform: 'MacIntel', maxTouchPoints: 0 }, appStoreUrl), null);
});
