const { cpSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { build } = require('./build-store-config');

const root = resolve(__dirname, '..');
const output = resolve(process.argv[2] || '_site');
mkdirSync(output, { recursive: true });
for (const file of ['index.html', 'terms.html', 'privacy.html', 'CNAME', 'dist', 'logo', 'images', 'manager-invite', 'merchant']) {
  cpSync(resolve(root, file), resolve(output, file), { recursive: true });
}
build(output, process.env);
execFileSync(process.execPath, [resolve(__dirname, 'build-association-files.js'), resolve(output, '.well-known')], { stdio: 'inherit' });
