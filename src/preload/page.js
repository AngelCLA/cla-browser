const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('claBrowserHistory', {
  getEntries: () => ipcRenderer.invoke('browser:get-history'),
});

contextBridge.exposeInMainWorld('claBrowserShortcuts', {
  getBookmarks: () => ipcRenderer.invoke('browser:get-shortcuts'),
  openBookmark: (url) => ipcRenderer.invoke('browser:open-shortcut', url),
});

let lastZoomAt = 0;

function sendZoom(direction) {
  const now = Date.now();
  if (direction !== 'reset' && now - lastZoomAt < 90) return;
  lastZoomAt = now;
  ipcRenderer.send('browser:zoom', direction);
}

window.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey)) return;

  if (event.key.toLowerCase() === 'l') {
    event.preventDefault();
    event.stopImmediatePropagation();
    ipcRenderer.send('browser:focus-address');
  } else if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    sendZoom('in');
  } else if (event.key === '-') {
    event.preventDefault();
    sendZoom('out');
  } else if (event.key === '0') {
    event.preventDefault();
    sendZoom('reset');
  } else if (event.key.toLowerCase() === 'h') {
    event.preventDefault();
    ipcRenderer.send('browser:show-history');
  }
}, { capture: true });

window.addEventListener('wheel', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.deltaY === 0) return;
  event.preventDefault();
  sendZoom(event.deltaY < 0 ? 'in' : 'out');
}, { capture: true, passive: false });

window.addEventListener('cla-browser:go-back', () => ipcRenderer.send('browser:go-back'));
