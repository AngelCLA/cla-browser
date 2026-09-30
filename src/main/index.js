const { app, BaseWindow, WebContentsView, clipboard, ipcMain, Menu, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const TOOLBAR_HEIGHT = 76;
const SOURCE_DIR = path.join(__dirname, '..');
const ASSETS_DIR = path.join(SOURCE_DIR, 'assets');
const PRELOAD_DIR = path.join(SOURCE_DIR, 'preload');
const RENDERER_DIR = path.join(SOURCE_DIR, 'renderer');
const BLANK_PAGE_URL = pathToFileURL(path.join(RENDERER_DIR, 'new-tab', 'index.html')).toString();

let window;
let toolbarView;
let activeTabId;
let contentFullscreen = false;
let toolbarSuggestionHeight = 0;
let nextTabId = 1;
const tabs = [];
const closedTabs = [];
const recentPages = [];

const ADDRESS_OVERLAY_SCRIPT = `
  (() => {
    document.getElementById('cla-address-overlay')?.remove();
    const host = document.createElement('div');
    host.id = 'cla-address-overlay';
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = '<style>' +
      ':host { all: initial; }' +
      '.backdrop { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgb(0 0 0 / 68%); font-family: Inter, ui-sans-serif, system-ui, sans-serif; animation: fade .14s ease-out; }' +
      '.dialog { width: min(620px, calc(100vw - 40px)); animation: rise .18s cubic-bezier(.16, 1, .3, 1); }' +
      '.panel { padding: 9px; border: 1px solid #3f3f46; border-radius: 9px; background: #18181b; box-shadow: 0 24px 80px #0009; }' +
      'input { width: 100%; height: 40px; box-sizing: border-box; padding: 0 14px; border: 1px solid #52525b; border-radius: 6px; outline: none; background: #0a0a0a; color: #f5f5f5; font: 14px Inter, ui-sans-serif, system-ui, sans-serif; }' +
      'input:focus { border-color: #fafafa; box-shadow: 0 0 0 2px #ffffff1f; }' +
      '.suggestions { display: none; overflow: hidden; margin-top: 8px; border: 1px solid #3f3f46; border-radius: 9px; background: #18181b; box-shadow: 0 24px 80px #0009; }' +
      '.suggestions.visible { display: block; }' +
      '.suggestion { display: grid; width: 100%; height: 42px; box-sizing: border-box; grid-template-columns: 14px minmax(0, 1fr); align-items: center; gap: 9px; padding: 5px 12px; border: 0; border-bottom: 1px solid #303036; background: transparent; color: #e5e5e5; font: 12px Inter, ui-sans-serif, system-ui, sans-serif; text-align: left; cursor: pointer; }' +
      '.suggestion:last-child { border-bottom: 0; } .suggestion:hover { background: #27272a; } .suggestion-icon { color: #a1a1aa; } .suggestion-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
      '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }' +
      '@keyframes rise { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }' +
      '</style><div class="backdrop"><div class="dialog"><form class="panel"><input autofocus placeholder="Enter URL or search..." aria-label="Address" autocomplete="off"></form><div class="suggestions"></div></div></div>';
    document.documentElement.append(host);
    const backdrop = shadow.querySelector('.backdrop');
    const input = shadow.querySelector('input');
    const suggestionsElement = shadow.querySelector('.suggestions');
    const close = () => host.remove();
    let suggestionRequest = 0;
    let suggestionTimer;
    input.value = location.href.startsWith('file:') ? '' : location.href;
    requestAnimationFrame(() => { input.focus(); input.select(); });
    shadow.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
    const navigate = (value) => {
      const destination = /^[a-z][a-z\\d+.-]*:/i.test(value) ? value : (value.includes('.') || value === 'localhost' ? 'https://' + value : 'https://www.google.com/search?q=' + encodeURIComponent(value));
      location.href = destination;
    };
    const hideSuggestions = () => { suggestionsElement.replaceChildren(); suggestionsElement.classList.remove('visible'); };
    const renderSuggestions = (suggestions) => {
      suggestionsElement.replaceChildren();
      if (!suggestions.length) return hideSuggestions();
      for (const suggestion of suggestions) {
        const option = document.createElement('button');
        option.className = 'suggestion';
        option.type = 'button';
        option.innerHTML = '<span class="suggestion-icon"></span><span class="suggestion-text"></span>';
        option.querySelector('.suggestion-icon').textContent = suggestion.kind === 'url' ? 'O' : 'S';
        option.querySelector('.suggestion-text').textContent = suggestion.label;
        option.addEventListener('click', () => navigate(suggestion.value));
        suggestionsElement.append(option);
      }
      suggestionsElement.classList.add('visible');
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
    shadow.querySelector('form').addEventListener('submit', (event) => {
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

function getActiveTab() {
  return tabs.find((tab) => tab.id === activeTabId);
}

function tabState() {
  return {
    activeTabId,
    tabs: tabs.map(({ id, title, url, loading }) => ({ id, title, url, loading })),
  };
}

function recordVisitedPage(url, title) {
  if (!url || url === BLANK_PAGE_URL) return;
  const existing = recentPages.findIndex((page) => page.url === url);
  if (existing !== -1) recentPages.splice(existing, 1);
  recentPages.unshift({ url, title: title || url });
  if (recentPages.length > 100) recentPages.pop();
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

  const { width, height } = window.getContentBounds();
  const toolbarHeight = contentFullscreen ? 0 : TOOLBAR_HEIGHT + toolbarSuggestionHeight;
  toolbarView.setBounds({ x: 0, y: 0, width, height: toolbarHeight });

  for (const tab of tabs) {
    tab.view.setBounds({ x: 0, y: toolbarHeight, width, height: Math.max(0, height - toolbarHeight) });
  }
}

function showTab(id) {
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
  nextTab.view.webContents.focus();
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
  view.setBackgroundColor('#000000');
  view.webContents.setZoomLevel(0);
  const tab = { id, view, title: 'Nueva pestaña', url: '', loading: true };
  tabs.push(tab);

  const updateTab = () => {
    const currentUrl = view.webContents.getURL();
    tab.url = currentUrl === BLANK_PAGE_URL ? '' : currentUrl;
    tab.title = view.webContents.getTitle() || tab.url || 'Nueva pestaña';
    recordVisitedPage(tab.url, tab.title);
    notifyToolbar();
  };

  view.webContents.on('did-start-loading', () => {
    tab.loading = true;
    notifyToolbar();
  });
  view.webContents.on('did-stop-loading', () => {
    tab.loading = false;
    updateTab();
  });
  view.webContents.on('did-finish-load', () => applyDefaultScrollbar(view.webContents));
  view.webContents.on('context-menu', (_event, params) => showPageContextMenu(view.webContents, params));
  view.webContents.on('did-navigate', updateTab);
  view.webContents.on('did-navigate-in-page', updateTab);
  view.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    tab.title = title || tab.url || 'Nueva pestaña';
    notifyToolbar();
  });
  view.webContents.setWindowOpenHandler(({ url }) => {
    createTab(url, true);
    return { action: 'deny' };
  });
  view.webContents.loadURL(normalizeAddress(address));
  if (makeActive) showTab(id);
  else notifyToolbar();
  return tab;
}

function closeTab(id = activeTabId) {
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
  if (id === activeTabId) showTab(tabs[Math.max(0, index - 1)].id);
  else notifyToolbar();
}

function navigate(address) {
  const tab = getActiveTab();
  if (!tab) return;

  const url = normalizeAddress(address);
  tab.url = url === BLANK_PAGE_URL ? '' : url;
  notifyToolbar();
  tab.view.webContents.loadURL(url);
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
  window.on('resize', layoutViews);
  window.on('maximize', () => {
    layoutViews();
    notifyWindowState();
  });
  window.on('unmaximize', () => {
    layoutViews();
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
    for (const tab of tabs) tab.view.webContents.close();
    tabs.length = 0;
    closedTabs.length = 0;
    recentPages.length = 0;
    activeTabId = undefined;
    contentFullscreen = false;
    toolbarSuggestionHeight = 0;
    window = undefined;
  });

  createTab();
}

ipcMain.handle('browser:get-state', () => tabState());
ipcMain.handle('browser:suggest', async (event, query) => {
  if (event.sender !== toolbarView?.webContents || typeof query !== 'string' || query.length > 256) return [];
  return getSuggestions(query);
});
ipcMain.on('browser:navigate', (_event, address) => navigate(typeof address === 'string' ? address : ''));
ipcMain.on('browser:action', (_event, action) => {
  if (action === 'back') goBack();
  if (action === 'forward') goForward();
  if (action === 'reload') getActiveTab()?.view.webContents.reload();
  if (action === 'new-tab') createTab();
  if (action === 'close-tab') closeTab();
  if (action === 'focus-address') focusAddress();
  if (action === 'devtools') toggleDevTools();
});
ipcMain.on('browser:select-tab', (_event, id) => showTab(id));
ipcMain.on('browser:close-tab', (_event, id) => closeTab(id));
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
  Menu.setApplicationMenu(Menu.buildFromTemplate([
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
  ]));
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (!window) createWindow();
});
