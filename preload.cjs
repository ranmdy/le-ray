const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lerayNative', {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),

  on: (channel, callback) => {
    function listener(event, ...args) {
      callback(...args);
    }

    ipcRenderer.on(channel, listener);

    return () => ipcRenderer.removeListener(channel, listener);
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (data) => ipcRenderer.invoke('settings:set', data),
  },

  metadata: {
    catalogs: () => ipcRenderer.invoke('metadata:catalogs'),
    search: (query) => ipcRenderer.invoke('metadata:search', { query }),
    detail: (id, type) => ipcRenderer.invoke('metadata:detail', { id, type }),
    episodes: (id, season) => ipcRenderer.invoke('metadata:episodes', { id, season }),
  },

  sources: {
    search: (params) => ipcRenderer.invoke('sources:search', params),
  },

  torrent: {
    start: (source) => ipcRenderer.invoke('torrent:start', source),
    stop: (infoHash) => ipcRenderer.invoke('torrent:stop', { infoHash }),
    stats: (infoHash) => ipcRenderer.invoke('torrent:stats', { infoHash }),
  },
});

//review: this is what we did here: preload.cjs is the only doorway between the window you
//see and the part of the app allowed to touch the internet and your disk. The window runs
//locked down and cannot fetch or read files itself, so this file hands it a small list of
//named jobs it may ask for, like "get settings" or "start this torrent", and nothing else.
//The important detail is the .cjs on the end of the filename. Electron runs this file in a
//locked down mode where the modern import keyword does not work, only require. If it is
//renamed to .js the file quietly fails, the window never receives this list, and the app
//falls back to fake sample data while still looking like it works. Do not rename it.
