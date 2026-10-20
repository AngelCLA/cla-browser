const { app, BaseWindow, WebContentsView, clipboard, dialog, ipcMain, Menu, nativeTheme, net, session, webContents } = require('electron');
// Stop secondary processes before loading configuration or registering startup work.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createBenchmarkState, installBenchmarkApi, markInitialTabReady } = require('./benchmark');
const { normalizeAdBlockerSettings, normalizeHostname, shouldBlockRequest } = require('./ad-blocker');
const { normalizeBookmarkUrl, normalizeBookmarks, selectBookmarks } = require('./bookmarks');
const { edition, institutionalLogoUrl, isBlockedUrl, isRestrictedInstaller, loadInstitutionalConfig } = require('./edition');
const { normalizeHistory } = require('./history');
const { installPopupWindowPolicy } = require('./popup-window');
const { createExternalLaunchHandler } = require('./external-launch');

const TOOLBAR_HEIGHT = 76;
const BOOKMARKS_BAR_HEIGHT = 32;
const SOURCE_DIR = path.join(__dirname, '..');
const ASSETS_DIR = path.join(SOURCE_DIR, 'assets');
const PRELOAD_DIR = path.join(SOURCE_DIR, 'preload');
const RENDERER_DIR = path.join(SOURCE_DIR, 'renderer');
const HISTORY_PAGE_URL = pathToFileURL(path.join(RENDERER_DIR, 'history', 'index.html')).toString();
const RESTRICTED_PAGE_URL = pathToFileURL(path.join(RENDERER_DIR, 'restricted', 'index.html')).toString();
const BOOKMARKS_PAGE_URL = pathToFileURL(path.join(RENDERER_DIR, 'bookmarks', 'index.html')).toString();
const KEYBOARD_SHORTCUTS_PAGE_URL = pathToFileURL(path.join(RENDERER_DIR, 'keyboard-shortcuts', 'index.html')).toString();
const institutionalConfig = loadInstitutionalConfig(app.getAppPath());
const addressAccentColor = edition === 'institutional' ? institutionalConfig.accentColor : '#fafafa';
const blankPageUrl = pathToFileURL(path.join(RENDERER_DIR, 'new-tab', 'index.html'));
blankPageUrl.searchParams.set('edition', edition);
if (edition === 'institutional') {
  blankPageUrl.searchParams.set('organizationName', institutionalConfig.organizationName);
  blankPageUrl.searchParams.set('accentColor', institutionalConfig.accentColor);
  const logoUrl = institutionalLogoUrl(app.getAppPath(), institutionalConfig.logo);
  if (logoUrl) blankPageUrl.searchParams.set('logo', logoUrl);
}
const BLANK_PAGE_URL = blankPageUrl.toString();
const benchmarkState = createBenchmarkState(process.env.CLA_BENCHMARK === '1');

// Make prefers-color-scheme dark available before any page selects its assets, including favicons.
nativeTheme.themeSource = 'dark';

let window;
let toolbarView;
let activeTabId;
let contentFullscreen = false;
let toolbarSuggestionHeight = 0;
let bookmarksVisible = true;
let bookmarksBarMenuItem;
let adBlockerMenuItem;
let lightweightModeMenuItem;
let reinforcedModeMenuItem;
let browserReady = false;
let nextTabId = 1;
const tabs = [];
const closedTabs = [];
const recentPages = [];
const historyEntries = [];
let bookmarks = [];
let legacyBookmarks = [];
let adBlockerSettings = normalizeAdBlockerSettings();
let blockedRequestNotificationTimer;
const externalLaunch = createExternalLaunchHandler({
  argv: process.argv,
  isPackaged: app.isPackaged,
  openTab: (destination) => createTab(destination),
  focusWindow: () => {
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  },
});
app.on('second-instance', (_event, commandLine) => {
  externalLaunch.receive(commandLine);
  if (browserReady && !window) createWindow();
});

const ADDRESS_OVERLAY_SCRIPT = `
  (() => {
    document.getElementById('cla-address-overlay')?.remove();
    const host = document.createElement('div');
    host.id = 'cla-address-overlay';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent =
      ':host { all: initial; }' +
      '.backdrop { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgb(0 0 0 / 68%); font-family: Inter, ui-sans-serif, system-ui, sans-serif; animation: fade .14s ease-out; }' +
      '.dialog { width: min(620px, calc(100vw - 40px)); animation: rise .18s cubic-bezier(.16, 1, .3, 1); }' +
      '.panel { padding: 0; }' +
      'input { width: 100%; height: 48px; box-sizing: border-box; padding: 0 14px; border: 1px solid #3f3f46; border-radius: 9px; outline: none; background: #18181b; color: #f5f5f5; font: 14px Inter, ui-sans-serif, system-ui, sans-serif; box-shadow: 0 24px 80px #0009; }' +
       'input:focus { border-color: ${addressAccentColor}; box-shadow: 0 0 0 2px #ffffff1f, 0 24px 80px #0009; }' +
      '.suggestions { display: none; overflow: hidden; margin-top: 8px; border: 1px solid #3f3f46; border-radius: 9px; background: #18181b; box-shadow: 0 24px 80px #0009; }' +
      '.suggestions.visible { display: block; }' +
      '.suggestion { display: grid; width: 100%; height: 42px; box-sizing: border-box; grid-template-columns: 14px minmax(0, 1fr); align-items: center; gap: 9px; padding: 5px 12px; border: 0; border-bottom: 1px solid #303036; background: transparent; color: #e5e5e5; font: 12px Inter, ui-sans-serif, system-ui, sans-serif; text-align: left; cursor: pointer; }' +
      '.suggestion:last-child { border-bottom: 0; } .suggestion:hover, .suggestion.selected { background: #27272a; } .suggestion-icon { color: #a1a1aa; } .suggestion-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }' +
      '@keyframes rise { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }';
    shadow.prepend(style);
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    const form = document.createElement('form');
    form.className = 'panel';
    const input = document.createElement('input');
    input.autofocus = true;
    input.placeholder = 'Buscar o escribir una dirección...';
    input.setAttribute('aria-label', 'Address');
    input.autocomplete = 'off';
    const suggestionsElement = document.createElement('div');
    suggestionsElement.className = 'suggestions';
    form.append(input);
    dialog.append(form, suggestionsElement);
    backdrop.append(dialog);
    shadow.append(backdrop);
    document.documentElement.append(host);
    const close = () => host.remove();
    let suggestionRequest = 0;
    let suggestionTimer;
    let suggestions = [];
    let selectedSuggestionIndex = -1;
    const internalLocalPage = [${JSON.stringify(BOOKMARKS_PAGE_URL)}, ${JSON.stringify(KEYBOARD_SHORTCUTS_PAGE_URL)}]
      .some((url) => location.href.startsWith(url));
    input.value = location.href.startsWith('file:') || internalLocalPage ? '' : location.href;
    requestAnimationFrame(() => { input.focus(); input.select(); });
    shadow.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
    const navigate = (value) => {
      const destination = /^[a-z][a-z\\d+.-]*:/i.test(value) ? value : (value.includes('.') || value === 'localhost' ? 'https://' + value : 'https://www.google.com/search?q=' + encodeURIComponent(value));
      location.href = destination;
    };
    const hideSuggestions = () => { suggestions = []; selectedSuggestionIndex = -1; suggestionsElement.replaceChildren(); suggestionsElement.classList.remove('visible'); };
    const renderSuggestions = (items) => {
      suggestions = items;
      selectedSuggestionIndex = -1;
      suggestionsElement.replaceChildren();
      if (!items.length) return hideSuggestions();
      for (const suggestion of items) {
        const option = document.createElement('button');
        option.className = 'suggestion';
        option.type = 'button';
        option.setAttribute('aria-selected', 'false');
        const icon = document.createElement('span');
        icon.className = 'suggestion-icon';
        icon.textContent = suggestion.kind === 'url' ? 'O' : 'S';
        const text = document.createElement('span');
        text.className = 'suggestion-text';
        text.textContent = suggestion.label;
        option.append(icon, text);
        option.addEventListener('click', () => navigate(suggestion.value));
        suggestionsElement.append(option);
      }
      suggestionsElement.classList.add('visible');
    };
    const selectSuggestion = (index) => {
      if (!suggestions.length) return;
      selectedSuggestionIndex = (index + suggestions.length) % suggestions.length;
      suggestionsElement.querySelectorAll('.suggestion').forEach((option, optionIndex) => {
        const selected = optionIndex === selectedSuggestionIndex;
        option.classList.toggle('selected', selected);
        option.setAttribute('aria-selected', String(selected));
      });
    };
    const requestSuggestions = () => {
      const value = input.value.trim();
      const request = ++suggestionRequest;
      clearTimeout(suggestionTimer);
      if (!value) return hideSuggestions();
      const url = /^[a-z][a-z\\d+.-]*:/i.test(value) ? value : (value.includes('.') || value === 'localhost' ? 'https://' + value : null);
      if (url) return renderSuggestions([{ value: url, label: url, kind: 'url' }]);
      suggestionTimer = setTimeout(async () => {
        try {
          const response = await fetch('https://suggestqueries.google.com/complete/search?client=firefox&q=' + encodeURIComponent(value));
          const [, suggestions] = await response.json();
          if (request === suggestionRequest) renderSuggestions(Array.isArray(suggestions) ? suggestions.slice(0, 3).map((suggestion) => ({ value: suggestion, label: suggestion, kind: 'search' })) : []);
        } catch { if (request === suggestionRequest) hideSuggestions(); }
      }, 160);
    };
    input.addEventListener('input', requestSuggestions);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!suggestions.length) return;
        event.preventDefault();
        selectSuggestion(selectedSuggestionIndex + (event.key === 'ArrowDown' ? 1 : -1));
      } else if (event.key === 'Enter' && selectedSuggestionIndex !== -1) {
        event.preventDefault();
        navigate(suggestions[selectedSuggestionIndex].value);
      }
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return close();
      navigate(value);
    });
  })();
`;

function normalizeAddress(value) {
  const input = value.trim();
  if (!input) return BLANK_PAGE_URL;

  if (/^[a-z][a-z\d+.-]*:/i.test(input)) return input;
  if (input.includes('.') || input === 'localhost') return `https://${input}`;

  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}

function restrictedPageUrl(url) {
  const pageUrl = new URL(RESTRICTED_PAGE_URL);
  try {
    pageUrl.searchParams.set('site', new URL(url).hostname);
  } catch {}
  pageUrl.searchParams.set('organizationName', institutionalConfig.organizationName);
  const logoUrl = institutionalLogoUrl(app.getAppPath(), institutionalConfig.logo);
  if (logoUrl) pageUrl.searchParams.set('logo', logoUrl);
  return pageUrl.toString();
}

function installRequestFilters() {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (edition === 'institutional' && details.resourceType === 'mainFrame' && isBlockedUrl(details.url, institutionalConfig.blockedSites)) {
      callback({ cancel: true });
      setImmediate(() => {
        const contents = webContents.fromId(details.webContentsId);
        if (!contents || contents.isDestroyed()) return;
        contents.loadURL(restrictedPageUrl(details.url)).catch(() => {});
      });
      return;
    }

    const tab = tabs.find((candidate) => candidate.view.webContents.id === details.webContentsId);
    if (shouldBlockRequest({ url: details.url, resourceType: details.resourceType, pageUrl: tab?.url, settings: adBlockerSettings })) {
      if (tab) {
        tab.blockedRequests += 1;
        scheduleBlockedRequestNotification();
      }
      callback({ cancel: true });
      return;
    }
    callback({ cancel: false });
  });

  if (edition === 'institutional') session.defaultSession.on('will-download', (event, item) => {
    if (!isRestrictedInstaller(item.getFilename())) return;
    event.preventDefault();
    dialog.showMessageBox({
      type: 'warning',
      title: 'Descarga restringida',
      message: 'Esta descarga no está permitida por las políticas de la institución.',
    });
  });
}

function getActiveTab() {
  return tabs.find((tab) => tab.id === activeTabId);
}

function tabState() {
  const activeTab = getActiveTab();
  const activeHostname = normalizeHostname(activeTab?.url);
  return {
    activeTabId,
    addressAccentColor,
    tabs: tabs.map(({ id, title, url, loading }) => ({
      id, title, url, loading,
      restricted: url.startsWith(RESTRICTED_PAGE_URL),
      internalPage: url.startsWith(BOOKMARKS_PAGE_URL) || url.startsWith(KEYBOARD_SHORTCUTS_PAGE_URL),
    })),
    bookmarks,
    bookmarksVisible,
    adBlocker: {
      enabled: adBlockerSettings.enabled,
      mode: adBlockerSettings.mode,
      blockedRequests: activeTab?.blockedRequests || 0,
      siteException: Boolean(activeHostname && adBlockerSettings.exceptions.includes(activeHostname)),
    },
  };
}

function browserDataPath() {
  return path.join(app.getPath('userData'), 'browser-data.json');
}

function historyPath() {
  return path.join(app.getPath('userData'), 'history.json');
}

function bookmarksPath() {
  return path.join(app.getPath('userData'), 'bookmarks.json');
}

function legacyBookmarksPath() {
  return path.join(app.getAppPath(), 'bookmarks.json');
}

function readBookmarks(filePath) {
  try {
    return normalizeBookmarks(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  } catch {
    return [];
  }
}

function loadBrowserData() {
  try {
    const data = JSON.parse(fs.readFileSync(browserDataPath(), 'utf8'));
    bookmarksVisible = typeof data.bookmarksVisible === 'boolean' ? data.bookmarksVisible : true;
    legacyBookmarks = normalizeBookmarks(data.bookmarks);
    adBlockerSettings = normalizeAdBlockerSettings(data.adBlocker);
  } catch {}
}

function loadBookmarks() {
  const hasUserFile = fs.existsSync(bookmarksPath());
  bookmarks = selectBookmarks({
    hasUserFile,
    userBookmarks: hasUserFile ? readBookmarks(bookmarksPath()) : [],
    legacyAppBookmarks: hasUserFile ? [] : readBookmarks(legacyBookmarksPath()),
    legacyBrowserBookmarks: legacyBookmarks,
  });
  // Removes legacy Base64 favicons and duplicate URLs on first launch.
  saveBookmarks();
  if (!hasUserFile) saveBrowserData();
}

function saveBrowserData() {
  try {
    fs.writeFileSync(browserDataPath(), JSON.stringify({ bookmarksVisible, adBlocker: adBlockerSettings }));
  } catch {}
}

function saveBookmarks() {
  try {
    fs.writeFileSync(bookmarksPath(), `${JSON.stringify(normalizeBookmarks(bookmarks), null, 2)}\n`);
  } catch {}
}

function scheduleBlockedRequestNotification() {
  if (blockedRequestNotificationTimer) return;
  blockedRequestNotificationTimer = setTimeout(() => {
    blockedRequestNotificationTimer = undefined;
    notifyToolbar();
  }, 120);
}

function updateAdBlockerMenu() {
  if (adBlockerMenuItem) adBlockerMenuItem.checked = adBlockerSettings.enabled;
  if (lightweightModeMenuItem) lightweightModeMenuItem.checked = adBlockerSettings.mode === 'lightweight';
  if (reinforcedModeMenuItem) reinforcedModeMenuItem.checked = adBlockerSettings.mode === 'reinforced';
}

function setAdBlockerEnabled(enabled) {
  adBlockerSettings.enabled = enabled;
  saveBrowserData();
  updateAdBlockerMenu();
  notifyToolbar();
}

function setAdBlockerMode(mode) {
  adBlockerSettings.mode = mode === 'reinforced' ? 'reinforced' : 'lightweight';
  saveBrowserData();
  updateAdBlockerMenu();
  notifyToolbar();
}

function toggleActiveSiteException() {
  const hostname = normalizeHostname(getActiveTab()?.url);
  if (!hostname) return;
  const index = adBlockerSettings.exceptions.indexOf(hostname);
  if (index === -1) adBlockerSettings.exceptions.push(hostname);
  else adBlockerSettings.exceptions.splice(index, 1);
  saveBrowserData();
  notifyToolbar();
  getActiveTab()?.view.webContents.reload();
}

function loadInstitutionalHistory() {
  if (edition !== 'institutional') return;
  try {
    historyEntries.push(...normalizeHistory(JSON.parse(fs.readFileSync(historyPath(), 'utf8'))));
  } catch {}
  for (const entry of historyEntries.slice(0, 100)) {
    if (!recentPages.some((page) => page.url === entry.url)) recentPages.push({ url: entry.url, title: entry.title });
  }
  saveInstitutionalHistory();
}

function saveInstitutionalHistory() {
  if (edition !== 'institutional') return;
  try {
    const normalized = normalizeHistory(historyEntries);
    historyEntries.splice(0, historyEntries.length, ...normalized);
    fs.writeFileSync(historyPath(), `${JSON.stringify(historyEntries, null, 2)}\n`);
  } catch {}
}

function recordVisitedPage(url, title) {
  if (!url || url === BLANK_PAGE_URL || url.startsWith(HISTORY_PAGE_URL) || url.startsWith(RESTRICTED_PAGE_URL)) return;
  const existing = recentPages.findIndex((page) => page.url === url);
  if (existing !== -1) recentPages.splice(existing, 1);
  recentPages.unshift({ url, title: title || url });
  if (recentPages.length > 100) recentPages.pop();
  if (edition === 'institutional') {
    historyEntries.unshift({ url, title: title || url, visitedAt: Date.now() });
    saveInstitutionalHistory();
  }
}

async function getSuggestions(query) {
  const value = query.trim();
  if (!value) return [];

  const needle = value.toLowerCase();
  const seen = new Set();
  const local = [...tabs, ...recentPages]
    .filter((page) => page.url && `${page.title} ${page.url}`.toLowerCase().includes(needle))
    .filter((page) => !seen.has(page.url) && seen.add(page.url))
    .slice(0, 5)
    .map((page) => ({ value: page.url, label: page.title || page.url, detail: page.url, kind: 'site' }));

  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.includes('.')) return local;

  try {
    const response = await net.fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(value)}`);
    const [, suggestions] = await response.json();
    const searches = Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
    return [...local, ...searches
      .filter((suggestion) => typeof suggestion === 'string' && !seen.has(`search:${suggestion}`))
      .map((suggestion) => ({ value: suggestion, label: suggestion, detail: 'Buscar con Google', kind: 'search' }))];
  } catch {
    return local;
  }
}

function notifyToolbar() {
  if (!toolbarView.webContents.isDestroyed()) {
    toolbarView.webContents.send('browser:state', tabState());
  }
}

function notifyWindowState() {
  if (!toolbarView.webContents.isDestroyed()) {
    toolbarView.webContents.send('browser:window-state', { maximized: window.isMaximized() });
  }
}

function setBookmarksVisible(visible) {
  bookmarksVisible = visible;
  if (bookmarksBarMenuItem) bookmarksBarMenuItem.checked = visible;
  saveBrowserData();
  layoutViews();
  notifyToolbar();
}

function toggleBookmarksBar() {
  setBookmarksVisible(!bookmarksVisible);
}

function toggleActiveBookmark() {
  const tab = getActiveTab();
  const url = normalizeBookmarkUrl(tab?.url || tab?.view.webContents.getURL());
  if (!url || url === BLANK_PAGE_URL) return;

  const index = bookmarks.findIndex((bookmark) => bookmark.url === url);
  if (index === -1) bookmarks.push({ url, title: tab.title || url });
  else bookmarks.splice(index, 1);
  saveBookmarks();
  notifyToolbar();
}

function reorderBookmark(sourceUrl, targetUrl, placeAfter) {
  if (typeof sourceUrl !== 'string' || typeof targetUrl !== 'string' || typeof placeAfter !== 'boolean') return false;
  if (normalizeBookmarkUrl(sourceUrl) !== sourceUrl || normalizeBookmarkUrl(targetUrl) !== targetUrl || sourceUrl === targetUrl) return false;
  const sourceIndex = bookmarks.findIndex((bookmark) => bookmark.url === sourceUrl);
  const targetIndex = bookmarks.findIndex((bookmark) => bookmark.url === targetUrl);
  if (sourceIndex === -1 || targetIndex === -1) return false;

  const [bookmark] = bookmarks.splice(sourceIndex, 1);
  const nextTargetIndex = bookmarks.findIndex((candidate) => candidate.url === targetUrl);
  bookmarks.splice(nextTargetIndex + (placeAfter ? 1 : 0), 0, bookmark);
  saveBookmarks();
  notifyToolbar();
  return true;
}

function applyDefaultScrollbar(webContents) {
  // Prepending a low-priority author stylesheet lets a site's own scrollbar rules win.
  webContents.executeJavaScript(`
    if (!document.getElementById('cla-browser-scrollbar')) {
      const style = document.createElement('style');
      style.id = 'cla-browser-scrollbar';
      style.textContent =
        ':where(*)::-webkit-scrollbar { width: 10px; height: 10px; }' +
        ':where(*)::-webkit-scrollbar-track { background: #0a0a0a; }' +
        ':where(*)::-webkit-scrollbar-thumb { background: #3f3f46; border: 3px solid #0a0a0a; border-radius: 999px; }' +
        ':where(*)::-webkit-scrollbar-thumb:hover { background: #71717a; }' +
        ':where(*) { scrollbar-color: #3f3f46 #0a0a0a; scrollbar-width: thin; }';
      document.head.prepend(style);
    }
  `).catch(() => {});
}

function layoutViews() {
  if (!window || window.isDestroyed()) return;

  // The content view tracks the final client area, including after maximize and DPI changes.
  const { width, height } = window.contentView.getBounds();
  const toolbarHeight = contentFullscreen ? 0 : TOOLBAR_HEIGHT + (bookmarksVisible ? BOOKMARKS_BAR_HEIGHT : 0) + toolbarSuggestionHeight;
  toolbarView.setBounds({ x: 0, y: 0, width, height: toolbarHeight });

  for (const tab of tabs) {
    tab.view.setBounds({ x: 0, y: toolbarHeight, width, height: Math.max(0, height - toolbarHeight) });
  }
}

function layoutViewsAfterResize() {
  layoutViews();
  // BaseWindow can emit its state event before the native client area reaches its final size.
  setImmediate(layoutViews);
}

function showTab(id, keepToolbarFocus = false) {
  const nextTab = tabs.find((tab) => tab.id === id);
  if (!nextTab) return;

  const previousTab = getActiveTab();
  if (previousTab && previousTab.id !== id) {
    window.contentView.removeChildView(previousTab.view);
  }

  activeTabId = id;
  if (!window.contentView.children.includes(nextTab.view)) {
    window.contentView.addChildView(nextTab.view);
  }
  layoutViews();
  if (keepToolbarFocus) toolbarView.webContents.focus();
  else nextTab.view.webContents.focus();
  notifyToolbar();
}

function createTab(address = BLANK_PAGE_URL, makeActive = true) {
  const id = nextTabId++;
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(PRELOAD_DIR, 'page.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // Light pages can leave unused regions transparent; use a neutral page fallback.
  view.setBackgroundColor('#ffffff');
  view.webContents.setZoomLevel(0);
  const tab = { id, view, title: 'Nueva pestaña', url: '', loading: true, favicon: '', blockedRequests: 0 };
  tabs.push(tab);

  const updateTab = () => {
    const currentUrl = view.webContents.getURL();
    tab.url = currentUrl === BLANK_PAGE_URL ? '' : normalizeBookmarkUrl(currentUrl) || currentUrl;
    tab.title = view.webContents.getTitle() || tab.url || 'Nueva pestaña';
    recordVisitedPage(tab.url, tab.title);
    notifyToolbar();
  };

  view.webContents.on('did-start-loading', () => {
    tab.loading = true;
    tab.favicon = '';
    tab.blockedRequests = 0;
    notifyToolbar();
  });
  view.webContents.on('did-stop-loading', () => {
    tab.loading = false;
    updateTab();
  });
  view.webContents.on('did-finish-load', () => {
    applyDefaultScrollbar(view.webContents);
    if (view.webContents.getURL() === BLANK_PAGE_URL) markInitialTabReady(benchmarkState);
  });
  view.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.control || input.meta) && input.key.toLowerCase() === 'l') {
      event.preventDefault();
      focusAddress();
    }
  });
  view.webContents.on('page-favicon-updated', (_event, favicons) => {
    const faviconUrl = favicons.find((candidate) => typeof candidate === 'string') || '';
    const pageUrl = view.webContents.getURL();
    if (!faviconUrl) return;
    // The Chromium session caches site-provided icons in userData; keep only the URL in memory.
    if (view.webContents.getURL() === pageUrl && tab.favicon !== faviconUrl) {
      tab.favicon = faviconUrl;
      const bookmark = bookmarks.find((candidate) => candidate.url === normalizeBookmarkUrl(tab.url));
      if (bookmark) {
        bookmark.favicon = faviconUrl;
        notifyToolbar();
      }
    }
  });
  view.webContents.on('context-menu', (_event, params) => showPageContextMenu(view.webContents, params));
  view.webContents.on('did-navigate', updateTab);
  view.webContents.on('did-navigate-in-page', updateTab);
  view.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    tab.title = title || tab.url || 'Nueva pestaña';
    const bookmark = bookmarks.find((candidate) => candidate.url === normalizeBookmarkUrl(tab.url));
    if (bookmark && title) {
      bookmark.title = title;
      saveBookmarks();
    }
    notifyToolbar();
  });
  installPopupWindowPolicy(view.webContents, path.join(ASSETS_DIR, 'icon.png'), createTab);
  view.webContents.loadURL(normalizeAddress(address));
  if (makeActive) showTab(id);
  else notifyToolbar();
  return tab;
}

function closeTab(id = activeTabId, keepToolbarFocus = false) {
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return;

  const [tab] = tabs.splice(index, 1);
  closedTabs.push({ url: tab.url || BLANK_PAGE_URL });
  if (closedTabs.length > 20) closedTabs.shift();
  if (window.contentView.children.includes(tab.view)) {
    window.contentView.removeChildView(tab.view);
  }
  tab.view.webContents.close();

  if (!tabs.length) {
    window.close();
    return;
  }
  if (id === activeTabId) showTab(tabs[Math.max(0, index - 1)].id, keepToolbarFocus);
  else notifyToolbar();
}

function navigate(address) {
  const tab = getActiveTab();
  if (!tab) return;
  const webContents = tab.view?.webContents;
  if (!webContents || webContents.isDestroyed()) return;

  const url = normalizeAddress(address);
  tab.url = url === BLANK_PAGE_URL ? '' : url;
  notifyToolbar();
  webContents.loadURL(url);
}

function focusAddress() {
  const webContents = getActiveTab()?.view.webContents;
  if (!webContents) return;
  webContents.executeJavaScript(ADDRESS_OVERLAY_SCRIPT).catch(() => {});
  webContents.focus();
}

function goBack() {
  const tab = getActiveTab();
  if (tab?.view.webContents.navigationHistory.canGoBack()) tab.view.webContents.navigationHistory.goBack();
}

function goForward() {
  const tab = getActiveTab();
  if (tab?.view.webContents.navigationHistory.canGoForward()) tab.view.webContents.navigationHistory.goForward();
}

function selectRelativeTab(direction) {
  const index = tabs.findIndex((tab) => tab.id === activeTabId);
  if (index === -1 || tabs.length < 2) return;
  showTab(tabs[(index + direction + tabs.length) % tabs.length].id);
}

function selectTabByNumber(number) {
  const tab = number === 9 ? tabs.at(-1) : tabs[number - 1];
  if (tab) showTab(tab.id);
}

function reopenClosedTab() {
  const tab = closedTabs.pop();
  if (tab) createTab(tab.url);
}

function showInstitutionalHistory() {
  if (edition === 'institutional') createTab(HISTORY_PAGE_URL);
}

function moveTab(id, targetId, placeAfter) {
  const sourceIndex = tabs.findIndex((tab) => tab.id === id);
  const targetIndex = tabs.findIndex((tab) => tab.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

  const [tab] = tabs.splice(sourceIndex, 1);
  const nextTargetIndex = tabs.findIndex((candidate) => candidate.id === targetId);
  tabs.splice(nextTargetIndex + (placeAfter ? 1 : 0), 0, tab);
  notifyToolbar();
}

function changeZoom(delta) {
  const webContents = getActiveTab()?.view.webContents;
  if (!webContents) return;
  webContents.setZoomLevel(Math.max(-5, Math.min(5, webContents.getZoomLevel() + delta)));
}

function resetZoom() {
  getActiveTab()?.view.webContents.setZoomLevel(0);
}

function toggleFullscreen() {
  if (window) window.setFullScreen(!window.isFullScreen());
}

function printActiveTab() {
  getActiveTab()?.view.webContents.print();
}

function toggleDevTools() {
  const webContents = getActiveTab()?.view.webContents;
  if (!webContents) return;
  if (webContents.isDevToolsOpened()) webContents.closeDevTools();
  else webContents.openDevTools({ mode: 'right', activate: true });
}

function showPageContextMenu(webContents, params) {
  const history = webContents.navigationHistory;
  const template = [
    { label: 'Atrás', enabled: history.canGoBack(), click: () => history.goBack() },
    { label: 'Adelante', enabled: history.canGoForward(), click: () => history.goForward() },
    { label: 'Recargar', click: () => webContents.reload() },
    { type: 'separator' },
  ];

  if (params.linkURL) {
    template.push(
      { label: 'Abrir enlace en una pestaña nueva', click: () => createTab(params.linkURL) },
      { label: 'Copiar dirección del enlace', click: () => clipboard.writeText(params.linkURL) },
      { type: 'separator' },
    );
  }
  if (params.selectionText) template.push({ label: 'Copiar', click: () => webContents.copy() });
  if (params.isEditable) {
    template.push(
      { label: 'Cortar', enabled: params.editFlags.canCut, click: () => webContents.cut() },
      { label: 'Pegar', enabled: params.editFlags.canPaste, click: () => webContents.paste() },
    );
  }
  if (params.selectionText || params.isEditable) {
    template.push({ label: 'Seleccionar todo', click: () => webContents.selectAll() });
  }

  template.push(
    { type: 'separator' },
    {
      label: 'Inspeccionar',
      click: () => {
        webContents.inspectElement(params.x, params.y);
        if (!webContents.isDevToolsOpened()) webContents.openDevTools({ mode: 'right', activate: true });
      },
    },
  );
  Menu.buildFromTemplate(template).popup({ window });
}

function createWindow() {
  window = new BaseWindow({
    width: 1100,
    height: 760,
    minWidth: 500,
    minHeight: 350,
    backgroundColor: '#000000',
    icon: path.join(ASSETS_DIR, 'icon.png'),
    titleBarStyle: 'hidden',
  });
  toolbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(PRELOAD_DIR, 'toolbar.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.contentView.addChildView(toolbarView);
  toolbarView.webContents.loadFile(path.join(RENDERER_DIR, 'toolbar', 'index.html'));
  toolbarView.webContents.on('did-finish-load', () => {
    notifyToolbar();
    notifyWindowState();
  });
  window.on('resize', layoutViewsAfterResize);
  window.on('maximize', () => {
    layoutViewsAfterResize();
    notifyWindowState();
  });
  window.on('unmaximize', () => {
    layoutViewsAfterResize();
    notifyWindowState();
  });
  window.on('enter-full-screen', () => {
    contentFullscreen = true;
    layoutViews();
  });
  window.on('leave-full-screen', () => {
    contentFullscreen = false;
    layoutViews();
  });
  window.on('closed', () => {
    externalLaunch.pause();
    for (const tab of tabs) tab.view.webContents.close();
    tabs.length = 0;
    closedTabs.length = 0;
    recentPages.length = 0;
    activeTabId = undefined;
    contentFullscreen = false;
    toolbarSuggestionHeight = 0;
    window = undefined;
  });

  externalLaunch.ready();
}

ipcMain.handle('browser:get-state', () => tabState());
ipcMain.handle('browser:reorder-bookmarks', (event, sourceUrl, targetUrl, placeAfter) => {
  if (event.sender !== toolbarView?.webContents) return false;
  return reorderBookmark(sourceUrl, targetUrl, placeAfter);
});
ipcMain.handle('browser:suggest', async (event, query) => {
  if (event.sender !== toolbarView?.webContents || typeof query !== 'string' || query.length > 256) return [];
  return getSuggestions(query);
});
ipcMain.handle('browser:get-history', (event) => {
  if (edition !== 'institutional' || !event.sender.getURL().startsWith(HISTORY_PAGE_URL)) return [];
  return historyEntries;
});
ipcMain.handle('browser:get-shortcuts', (event) => {
  if (!tabs.some((tab) => tab.view.webContents === event.sender) || event.sender.getURL() !== BLANK_PAGE_URL) return [];
  return bookmarks.map(({ title, url }) => ({ title, url }));
});
ipcMain.handle('browser:open-shortcut', (event, url) => {
  if (getActiveTab()?.view.webContents !== event.sender || event.sender.getURL() !== BLANK_PAGE_URL) return false;
  if (typeof url !== 'string') return false;
  const normalizedUrl = normalizeBookmarkUrl(url);
  const bookmark = bookmarks.find((candidate) => candidate.url === normalizedUrl);
  if (!bookmark) return false;
  navigate(bookmark.url);
  return true;
});
ipcMain.handle('browser:get-local-bookmarks', (event) => {
  if (!tabs.some((tab) => tab.view.webContents === event.sender) || getActiveTab()?.view.webContents !== event.sender || event.sender.getURL() !== BOOKMARKS_PAGE_URL) return [];
  return bookmarks.map(({ title, url }) => ({ title, url }));
});
ipcMain.handle('browser:open-local-bookmark', (event, url) => {
  if (!tabs.some((tab) => tab.view.webContents === event.sender) || getActiveTab()?.view.webContents !== event.sender || event.sender.getURL() !== BOOKMARKS_PAGE_URL || typeof url !== 'string') return false;
  const normalizedUrl = normalizeBookmarkUrl(url);
  const bookmark = bookmarks.find((candidate) => candidate.url === normalizedUrl);
  if (!bookmark) return false;
  navigate(bookmark.url);
  return true;
});
ipcMain.handle('browser:open-local-page', (event, page) => {
  if (!tabs.some((tab) => tab.view.webContents === event.sender) || getActiveTab()?.view.webContents !== event.sender || event.sender.getURL() !== BLANK_PAGE_URL) return false;
  const url = page === 'bookmarks' ? BOOKMARKS_PAGE_URL : page === 'keyboard-shortcuts' ? KEYBOARD_SHORTCUTS_PAGE_URL : null;
  if (!url) return false;
  createTab(url);
  return true;
});
ipcMain.on('browser:navigate', (event, address) => {
  if (event.sender !== toolbarView?.webContents) return;
  navigate(typeof address === 'string' ? address : '');
});
ipcMain.on('browser:show-history', (event) => {
  if (event.sender === getActiveTab()?.view.webContents) showInstitutionalHistory();
});
ipcMain.on('browser:go-back', (event) => {
  if (event.sender === getActiveTab()?.view.webContents) goBack();
});
ipcMain.on('browser:focus-address', (event) => {
  if (event.sender === getActiveTab()?.view.webContents) focusAddress();
});
ipcMain.on('browser:action', (_event, action) => {
  if (action === 'back') goBack();
  if (action === 'forward') goForward();
  if (action === 'reload') getActiveTab()?.view.webContents.reload();
  if (action === 'new-tab') createTab();
  if (action === 'close-tab') closeTab();
  if (action === 'focus-address') focusAddress();
  if (action === 'devtools') toggleDevTools();
  if (action === 'toggle-bookmark') toggleActiveBookmark();
  if (action === 'show-history') showInstitutionalHistory();
  if (action === 'toggle-ad-blocker') setAdBlockerEnabled(!adBlockerSettings.enabled);
  if (action === 'toggle-site-exception') toggleActiveSiteException();
  if (action === 'toggle-ad-blocker-mode') setAdBlockerMode(adBlockerSettings.mode === 'lightweight' ? 'reinforced' : 'lightweight');
});
ipcMain.on('browser:select-tab', (event, id, options) => {
  if (!Number.isSafeInteger(id)) return;
  showTab(id, event.sender === toolbarView?.webContents && options?.focus === 'toolbar');
});
ipcMain.on('browser:close-tab', (event, id, options) => {
  if (!Number.isSafeInteger(id)) return;
  closeTab(id, event.sender === toolbarView?.webContents && options?.focus === 'toolbar');
});
ipcMain.on('browser:set-suggestion-height', (event, height) => {
  if (event.sender !== toolbarView?.webContents || !Number.isFinite(height)) return;
  toolbarSuggestionHeight = Math.max(0, Math.min(280, Math.round(height)));
  layoutViews();
});
ipcMain.on('browser:move-tab', (_event, id, targetId, placeAfter) => {
  if (typeof id === 'number' && typeof targetId === 'number') moveTab(id, targetId, Boolean(placeAfter));
});
ipcMain.on('browser:zoom', (event, direction) => {
  if (event.sender !== getActiveTab()?.view.webContents) return;
  if (direction === 'in') changeZoom(1);
  if (direction === 'out') changeZoom(-1);
  if (direction === 'reset') resetZoom();
});
ipcMain.on('browser:window-action', (_event, action) => {
  if (action === 'minimize') window.minimize();
  if (action === 'toggle-maximize') {
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  }
  if (action === 'close') window.close();
});

app.whenReady().then(() => {
  installRequestFilters();
  loadBrowserData();
  loadBookmarks();
  loadInstitutionalHistory();
  const menu = Menu.buildFromTemplate([
    { label: 'Navegacion', submenu: [
      { label: 'Enfocar direccion', accelerator: 'CommandOrControl+L', click: focusAddress },
      { label: 'Nueva pestaña', accelerator: 'CommandOrControl+T', click: () => createTab() },
      { label: 'Cerrar pestaña', accelerator: 'CommandOrControl+W', click: () => closeTab() },
      { label: 'Reabrir pestaña cerrada', accelerator: 'CommandOrControl+Shift+T', click: reopenClosedTab },
      { label: 'Siguiente pestaña', accelerator: 'CommandOrControl+Tab', click: () => selectRelativeTab(1) },
      { label: 'Pestaña anterior', accelerator: 'CommandOrControl+Shift+Tab', click: () => selectRelativeTab(-1) },
      { label: 'Atras', accelerator: 'CommandOrControl+[', click: goBack },
      { label: 'Adelante', accelerator: 'CommandOrControl+]', click: goForward },
      { label: 'Recargar', accelerator: 'CommandOrControl+R', click: () => getActiveTab()?.view.webContents.reload() },
      { label: 'Recargar (F5)', accelerator: 'F5', click: () => getActiveTab()?.view.webContents.reload() },
      { label: 'Recargar sin cache', accelerator: 'CommandOrControl+Shift+R', click: () => getActiveTab()?.view.webContents.reloadIgnoringCache() },
      { label: 'Pantalla completa', accelerator: 'F11', click: toggleFullscreen },
      { label: 'Imprimir', accelerator: 'CommandOrControl+P', click: printActiveTab },
      { label: 'Herramientas de desarrollador', accelerator: 'CommandOrControl+Shift+I', click: toggleDevTools },
      { label: 'Herramientas de desarrollador (F12)', accelerator: 'F12', click: toggleDevTools },
      { label: 'Pestaña 1', accelerator: 'CommandOrControl+1', click: () => selectTabByNumber(1) },
      { label: 'Pestaña 2', accelerator: 'CommandOrControl+2', click: () => selectTabByNumber(2) },
      { label: 'Pestaña 3', accelerator: 'CommandOrControl+3', click: () => selectTabByNumber(3) },
      { label: 'Pestaña 4', accelerator: 'CommandOrControl+4', click: () => selectTabByNumber(4) },
      { label: 'Pestaña 5', accelerator: 'CommandOrControl+5', click: () => selectTabByNumber(5) },
      { label: 'Pestaña 6', accelerator: 'CommandOrControl+6', click: () => selectTabByNumber(6) },
      { label: 'Pestaña 7', accelerator: 'CommandOrControl+7', click: () => selectTabByNumber(7) },
      { label: 'Pestaña 8', accelerator: 'CommandOrControl+8', click: () => selectTabByNumber(8) },
      { label: 'Ultima pestaña', accelerator: 'CommandOrControl+9', click: () => selectTabByNumber(9) },
    ] },
    { label: 'Marcadores', submenu: [
      { label: 'Añadir o quitar marcador', accelerator: 'CommandOrControl+D', click: toggleActiveBookmark },
      { id: 'toggle-bookmarks-bar', label: 'Mostrar u ocultar barra de marcadores', type: 'checkbox', checked: bookmarksVisible, accelerator: 'CommandOrControl+Shift+B', click: toggleBookmarksBar },
    ] },
    { label: 'Bloqueador', submenu: [
      { id: 'toggle-ad-blocker', label: 'Activar bloqueador', type: 'checkbox', checked: adBlockerSettings.enabled, click: (item) => setAdBlockerEnabled(item.checked) },
      { type: 'separator' },
      { id: 'ad-blocker-lightweight', label: 'Modo ligero', type: 'radio', checked: adBlockerSettings.mode === 'lightweight', click: () => setAdBlockerMode('lightweight') },
      { id: 'ad-blocker-reinforced', label: 'Modo reforzado', type: 'radio', checked: adBlockerSettings.mode === 'reinforced', click: () => setAdBlockerMode('reinforced') },
      { type: 'separator' },
      { label: 'Permitir anuncios en este sitio', click: toggleActiveSiteException },
    ] },
  ]);
  bookmarksBarMenuItem = menu.getMenuItemById('toggle-bookmarks-bar');
  adBlockerMenuItem = menu.getMenuItemById('toggle-ad-blocker');
  lightweightModeMenuItem = menu.getMenuItemById('ad-blocker-lightweight');
  reinforcedModeMenuItem = menu.getMenuItemById('ad-blocker-reinforced');
  Menu.setApplicationMenu(menu);
  browserReady = true;
  createWindow();
  installBenchmarkApi(benchmarkState, {
    app,
    getActiveTab,
    createTab,
    closeTab,
    showTab,
    getWindow: () => window,
    getToolbarHeight: () => contentFullscreen ? 0 : TOOLBAR_HEIGHT + (bookmarksVisible ? BOOKMARKS_BAR_HEIGHT : 0) + toolbarSuggestionHeight,
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (!window) createWindow();
});
