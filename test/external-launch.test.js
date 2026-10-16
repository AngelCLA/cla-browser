const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseLaunchArguments, createExternalLaunchHandler } = require('../src/main/external-launch');

test('packaged and development argv skip the executable and development entry point', () => {
  assert.deepEqual(parseLaunchArguments(['app.exe', 'https://example.com/a', 'http://example.org'], true),
    ['https://example.com/a', 'http://example.org/']);
  assert.deepEqual(parseLaunchArguments(['electron.exe', 'https://entry.invalid', 'https://example.org'], false),
    ['https://example.org/']);
});

test('HTML paths preserve spaces, hashes, percent signs and Unicode as file URLs', () => {
  assert.deepEqual(parseLaunchArguments(['app.exe', 'C:\\My pages\\résumé #1%.HTML', 'D:\\docs\\index.htm'], true), [
    'file:///C:/My%20pages/r%C3%A9sum%C3%A9%20%231%25.HTML',
    'file:///D:/docs/index.htm',
  ]);
  assert.deepEqual(parseLaunchArguments(['app.exe', '\\\\server\\share\\page #1.html'], true),
    ['file://server/share/page%20%231.html']);
});

test('HTML file URLs accept query/fragment and reject other file types', () => {
  assert.deepEqual(parseLaunchArguments(['app.exe', 'file:///C:/docs/page.html?q=1#section',
    'file:///C:/docs/not-html.pdf', 'file:///C:/docs/bad%ZZ.html'], true),
  ['file:///C:/docs/page.html?q=1#section']);
});

test('external input ignores options, relative paths, arbitrary schemes and malformed URLs', () => {
  assert.deepEqual(parseLaunchArguments(['app.exe', '--url=https://example.org', '-x',
    'javascript:alert(1)', 'data:text/html,test', 'mailto:a@example.org', 'about:blank',
    'https://', 'relative.html', 'C:relative.html', 'C:\\page.pdf', '', 'file:///C:/a%00.html'], true), []);
});

function harness(argv = ['app.exe']) {
  const opened = [];
  let focused = 0;
  const handler = createExternalLaunchHandler({ argv, isPackaged: true,
    openTab: (url) => opened.push(url), focusWindow: () => focused++ });
  return { handler, opened, focused: () => focused };
}

test('cold launch and requests queued before window readiness replace the initial blank tab', () => {
  const { handler, opened, focused } = harness(['app.exe', 'https://first.example']);
  handler.receive(['app.exe', 'https://second.example']);
  assert.deepEqual(opened, []);
  handler.ready();
  assert.deepEqual(opened, ['https://first.example/', 'https://second.example/']);
  assert.equal(focused(), 1);
});

test('ordinary launch creates one blank tab; subsequent launches open tabs and focus', () => {
  const { handler, opened, focused } = harness();
  handler.ready();
  handler.receive(['app.exe', 'https://example.org', 'javascript:alert(1)']);
  handler.receive(['app.exe', '--flag']);
  assert.deepEqual(opened, [undefined, 'https://example.org/']);
  assert.equal(focused(), 2);
});

test('requests received while a window is closed wait for its replacement', () => {
  const { handler, opened } = harness();
  handler.ready();
  handler.pause();
  handler.receive(['app.exe', 'C:\\docs\\page.html']);
  assert.deepEqual(opened, [undefined]);
  handler.ready();
  assert.deepEqual(opened, [undefined, 'file:///C:/docs/page.html']);
});

test('a secondary process quits before configuration, IPC or window bootstrap', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/main/index.js'), 'utf8');
  const calls = [];
  const app = {
    requestSingleInstanceLock: () => { calls.push('lock'); return false; },
    quit: () => calls.push('quit'),
  };
  const run = vm.runInNewContext(`(function(require) { ${source}\n })`);
  run((moduleName) => {
    assert.equal(moduleName, 'electron', 'secondary processes must not load application modules');
    return { app };
  });
  assert.deepEqual(calls, ['lock', 'quit']);
});

test('primary lifecycle wires queued launches after bootstrap and restores the existing window', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/main/index.js'), 'utf8');
  assert.match(source, /app\.on\('second-instance',[\s\S]*?externalLaunch\.receive\(commandLine\)/);
  assert.match(source, /if \(browserReady && !window\) createWindow\(\)/);
  assert.match(source, /if \(window\.isMinimized\(\)\) window\.restore\(\);\s*window\.focus\(\)/);
  assert.match(source, /window\.on\('closed', \(\) => \{\s*externalLaunch\.pause\(\)/);
  const createWindowSource = source.slice(source.indexOf('function createWindow()'), source.indexOf("ipcMain.handle('browser:get-state'"));
  assert.match(createWindowSource, /externalLaunch\.ready\(\)/);
  assert.doesNotMatch(createWindowSource, /\bcreateTab\(\)/);
  assert.match(source, /Menu\.setApplicationMenu\(menu\);\s*browserReady = true;\s*createWindow\(\)/);
});
