const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

const output = process.argv[2];
if (!output) throw new Error('Pass the output .well-known directory as the first argument.');

const fingerprint = (process.env.PLAY_APP_SIGNING_CERT_SHA256 || '')
  .replaceAll(':', '')
  .replaceAll(/\s/g, '')
  .toUpperCase();
if (!/^[A-F0-9]{64}$/.test(fingerprint)) {
  throw new Error('PLAY_APP_SIGNING_CERT_SHA256 is missing or invalid.');
}

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
const assetLinks = [{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: 'tw.com.grapes.yellow',
    sha256_cert_fingerprints: [fingerprint.match(/.{2}/g).join(':')],
  },
}];

async function main() {
  const directory = resolve(output);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(directory, 'apple-app-site-association'),
      `${JSON.stringify(aasa, null, 2)}\n`,
    ),
    writeFile(resolve(directory, 'assetlinks.json'), `${JSON.stringify(assetLinks, null, 2)}\n`),
  ]);
}

main();
