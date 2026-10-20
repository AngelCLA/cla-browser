const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browser', {
  getState: () => ipcRenderer.invoke('browser:get-state'),
  suggest: (query) => ipcRenderer.invoke('browser:suggest', query),
  navigate: (address) => ipcRenderer.send('browser:navigate', address),
  action: (action) => ipcRenderer.send('browser:action', action),
  selectTab: (id, options) => ipcRenderer.send('browser:select-tab', id, { focus: options?.focus === 'toolbar' ? 'toolbar' : 'content' }),
  closeTab: (id, options) => ipcRenderer.send('browser:close-tab', id, { focus: options?.focus === 'toolbar' ? 'toolbar' : 'content' }),
  moveTab: (id, targetId, placeAfter) => ipcRenderer.send('browser:move-tab', id, targetId, placeAfter),
  reorderBookmark: (sourceUrl, targetUrl, placeAfter) => ipcRenderer.invoke('browser:reorder-bookmarks', sourceUrl, targetUrl, placeAfter),
  setSuggestionHeight: (height) => ipcRenderer.send('browser:set-suggestion-height', height),
  windowAction: (action) => ipcRenderer.send('browser:window-action', action),
  onState: (listener) => ipcRenderer.on('browser:state', (_event, state) => listener(state)),
  onWindowState: (listener) => ipcRenderer.on('browser:window-state', (_event, state) => listener(state)),
});
