const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('startupLog', {
  onEntry: (callback) => {
    const listener = (_event, entry) => callback(entry);
    ipcRenderer.on('startup-log', listener);
    return () => ipcRenderer.removeListener('startup-log', listener);
  },
  onHistory: (callback) => {
    const listener = (_event, entries) => callback(entries);
    ipcRenderer.on('startup-log-history', listener);
    return () => ipcRenderer.removeListener('startup-log-history', listener);
  },
});
