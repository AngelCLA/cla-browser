const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const build = packageJson.build;

test('Windows packaging preserves the npm package identity and app executable name', () => {
  assert.equal(packageJson.name, 'cla-browser');
  assert.equal(build.productName, 'CLA Browser');
  assert.match(packageJson.devDependencies['electron-builder'], /^\^\d+\.\d+\.\d+$/);
});

test('build:win packages x64 NSIS and portable targets with distinct artifact names', () => {
  assert.match(packageJson.scripts['build:win'], /electron-builder/);
  assert.match(packageJson.scripts['build:win'], /--win/);
  assert.match(packageJson.scripts['build:win'], /--x64/);

  assert.deepEqual(build.win.target, [
    { target: 'nsis', arch: ['x64'] },
    { target: 'portable', arch: ['x64'] },
  ]);
  assert.equal(build.nsis.artifactName, 'CLA Browser Setup.exe');
  assert.equal(build.portable.artifactName, 'CLA Browser.exe');
  assert.equal(build.directories.output, 'dist');
});

test('generated packaging output is ignored by git', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(gitignore, /^dist\/$/m);
});
