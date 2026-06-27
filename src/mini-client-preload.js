const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miniClient', {
  getStatus: () => ipcRenderer.invoke('mini-client-get-status'),
  testConnection: () => ipcRenderer.invoke('mini-client-test-connection'),
});
