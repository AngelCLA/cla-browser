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

test('Windows app, portable executable, and installer use the CLA Browser icon', () => {
  const iconPath = 'src/assets/icon.png';
  assert.equal(build.win.icon, iconPath);

  const icon = fs.readFileSync(path.join(root, iconPath));
  assert.equal(icon.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(icon.readUInt32BE(16) >= 256);
  assert.ok(icon.readUInt32BE(20) >= 256);

  assert.equal(build.nsis.installerIcon ?? build.win.icon, iconPath);
  assert.equal(build.portable.icon ?? build.win.icon, iconPath);
});

test('only NSIS includes browser registration with scoped capabilities and quoted commands', () => {
  assert.equal(build.nsis.include, 'build/installer.nsh');
  assert.equal(build.portable.include, undefined);
  assert.equal(build.protocols, undefined);
  assert.equal(build.fileAssociations, undefined);
  const script = fs.readFileSync(path.join(root, build.nsis.include), 'utf8');
  assert.match(script, /!macro customInstall/);
  assert.match(script, /!macro customUnInstall/);
  assert.match(script, /Software\\Clients\\StartMenuInternet\\CLA Browser/);
  assert.match(script, /WriteRegStr SHELL_CONTEXT "Software\\RegisteredApplications" "CLA Browser"/);
  for (const [association, progId] of [['.htm', 'CLA Browser.HTML'], ['.html', 'CLA Browser.HTML'],
    ['http', 'CLA Browser.URL'], ['https', 'CLA Browser.URL']]) {
    assert.ok(script.includes(`"${association}" "${progId}"`));
  }
  for (const field of ['ApplicationName', 'ApplicationDescription', 'ApplicationIcon']) {
    assert.ok(script.includes(`"${field}"`));
  }
  assert.ok(script.includes(`'"$INSTDIR\\\${APP_EXECUTABLE_FILENAME}" "%1"'`));
  assert.match(script, /SHChangeNotify/);
  assert.doesNotMatch(script, /UserChoice|WriteReg\w+ HK(?:CR|CU|LM)/);
  assert.doesNotMatch(script, /WriteReg\w+ SHELL_CONTEXT "Software\\Classes\\(?:https?|\.html?)"/);
});

test('uninstall checks ownership before removing only app-owned registration', () => {
  const script = fs.readFileSync(path.join(root, 'build/installer.nsh'), 'utf8');
  const uninstall = script.slice(script.indexOf('!macro customUnInstall'));
  assert.match(uninstall, /ReadRegStr .* SHELL_CONTEXT .* "InstallPath"/);
  assert.match(uninstall, /\$INSTDIR/);
  assert.match(uninstall, /DeleteRegValue SHELL_CONTEXT "Software\\RegisteredApplications" "CLA Browser"/);
  assert.doesNotMatch(uninstall, /DeleteRegKey SHELL_CONTEXT "Software\\(?:Classes|RegisteredApplications)"/);
  const deletions = [...uninstall.matchAll(/DeleteRegKey SHELL_CONTEXT "([^"]+)"/g)];
  assert.ok(deletions.length > 0);
  for (const [, key] of deletions) assert.match(key, /CLA Browser|\$\{CLA_/);
  assert.match(uninstall, /\$\{If\} \$0 == "\$INSTDIR"[\s\S]*?DeleteRegKey SHELL_CONTEXT "\$\{CLA_CLIENT\}"\s*\$\{EndIf\}/);
  for (const progId of ['CLA Browser.HTML', 'CLA Browser.URL']) {
    const guard = `ReadRegStr $0 SHELL_CONTEXT "Software\\Classes\\${progId}\\shell\\open\\command" ""`;
    const deletion = `DeleteRegKey SHELL_CONTEXT "Software\\Classes\\${progId}"`;
    assert.ok(uninstall.includes(`${guard}\n  \${If} $0 == '"$INSTDIR\\\${APP_EXECUTABLE_FILENAME}" "%1"'\n    ${deletion}\n  \${EndIf}`));
  }
});
