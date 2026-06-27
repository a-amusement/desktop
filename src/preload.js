const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  clearAppData: () => ipcRenderer.invoke('clear-app-data'),
  getDebugMode: () => ipcRenderer.invoke('debug-mode-get'),
  toggleDebugMode: () => ipcRenderer.invoke('debug-mode-toggle'),
  openMiniClient: () => ipcRenderer.send('mini-client-open'),
  close: () => ipcRenderer.send('window-close'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  onDebugModeChange: (callback) => {
    const listener = (_event, isEnabled) => callback(isEnabled);
    ipcRenderer.on('debug-mode-change', listener);
    return () => ipcRenderer.removeListener('debug-mode-change', listener);
  },
  onMaximizeChange: (callback) => {
    const listener = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('maximize-change', listener);
    return () => ipcRenderer.removeListener('maximize-change', listener);
  },
  onThemeChange: (callback) => {
    const listener = (_event, theme) => callback(theme);
    ipcRenderer.on('theme-change', listener);
    return () => ipcRenderer.removeListener('theme-change', listener);
  },
  onNavigationChange: (callback) => {
    const listener = (_event, url) => callback(url);
    ipcRenderer.on('navigation-change', listener);
    return () => ipcRenderer.removeListener('navigation-change', listener);
  },
});
