const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browser', {
  getState: () => ipcRenderer.invoke('browser:get-state'),
  suggest: (query) => ipcRenderer.invoke('browser:suggest', query),
  navigate: (address) => ipcRenderer.send('browser:navigate', address),
  action: (action) => ipcRenderer.send('browser:action', action),
  selectTab: (id) => ipcRenderer.send('browser:select-tab', id),
  closeTab: (id) => ipcRenderer.send('browser:close-tab', id),
  moveTab: (id, targetId, placeAfter) => ipcRenderer.send('browser:move-tab', id, targetId, placeAfter),
  setSuggestionHeight: (height) => ipcRenderer.send('browser:set-suggestion-height', height),
  windowAction: (action) => ipcRenderer.send('browser:window-action', action),
  onState: (listener) => ipcRenderer.on('browser:state', (_event, state) => listener(state)),
  onWindowState: (listener) => ipcRenderer.on('browser:window-state', (_event, state) => listener(state)),
});
