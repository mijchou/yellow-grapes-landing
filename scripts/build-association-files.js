const { mkdir, writeFile, rm } = require('node:fs/promises');
const { resolve } = require('node:path');

const output = process.argv[2];
if (!output) throw new Error('Pass the output .well-known directory as the first argument.');

const rawFingerprint = (process.env.PLAY_APP_SIGNING_CERT_SHA256 || '')
  .replaceAll(':', '')
  .replaceAll(/\s/g, '')
  .toUpperCase();
if (rawFingerprint && !/^[A-F0-9]{64}$/.test(rawFingerprint)) {
  throw new Error(
    'PLAY_APP_SIGNING_CERT_SHA256 must contain the Play App Signing SHA-256 fingerprint.',
  );
}
const fingerprint = rawFingerprint;

const aasa = {
  applinks: {
    details: [{
      appIDs: ['4A6YA857FU.tw.com.grapes.yellow'],
      components: [
        { '/': '/merchant/*', comment: 'Yellow Grapes merchant links' },
        { '/': '/manager-invite/*', comment: 'Yellow Grapes manager invitation links' },
      ],
    }],
  },
};
const assetLinks = rawFingerprint ? [{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: 'tw.com.grapes.yellow',
    sha256_cert_fingerprints: [fingerprint.match(/.{2}/g).join(':')],
  },
}] : null;

async function main() {
  if (!assetLinks) console.log('Android signing fingerprint not set — publishing iOS associations and coming-soon pages only.');
  const directory = resolve(output);
  await mkdir(directory, { recursive: true });
  if (!assetLinks) await rm(resolve(directory, 'assetlinks.json'), { force: true });
  await Promise.all([
    writeFile(
      resolve(directory, 'apple-app-site-association'),
      `${JSON.stringify(aasa, null, 2)}\n`,
    ),
    ...(assetLinks ? [writeFile(resolve(directory, 'assetlinks.json'), `${JSON.stringify(assetLinks, null, 2)}\n`)] : []),
  ]);
}

main();
