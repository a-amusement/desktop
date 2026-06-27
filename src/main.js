const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  shell,
  nativeTheme,
  Menu,
  Tray,
  nativeImage,
  dialog,
  session,
} = require('electron');
const path = require('path');
const fs = require('fs');
const credentials = require('./credentials');
const miniClientDb = require('./mini-client-db');

const SITE_URL = 'https://a-amu.uk';
const SITE_ORIGIN = 'https://a-amu.uk';
const SITE_PARTITION = 'persist:a-amu';
const TITLEBAR_HEIGHT = 40;
const ALLOWED_HOSTS = ['a-amu.uk', 'www.a-amu.uk'];

let mainWindow;
let siteView;
let tray;
let startupWindow;
let miniClientWindow;
let allowStartupWindowClose = false;
let debugMode = false;
let isQuitting = false;
const startupLogEntries = [];

function isAllowedUrl(urlString) {
  try {
    const { hostname, protocol } = new URL(urlString);
    if (protocol !== 'https:' && protocol !== 'http:') {
      return false;
    }
    return ALLOWED_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function getSiteSession() {
  return session.fromPartition(SITE_PARTITION);
}

function logStartup(message) {
  const entry = {
    time: new Date().toLocaleTimeString(),
    message,
  };

  startupLogEntries.push(entry);

  if (startupWindow && !startupWindow.isDestroyed()) {
    startupWindow.webContents.send('startup-log', entry);
  }
}

function createStartupWindow() {
  startupWindow = new BrowserWindow({
    width: 560,
    height: 360,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: 'Welcome to a-amusement desktop!',
    backgroundColor: '#f4f6fb',
    webPreferences: {
      preload: path.join(__dirname, 'startup-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  startupWindow.setMenuBarVisibility(false);

  startupWindow.on('close', (event) => {
    if (!allowStartupWindowClose && !isQuitting) {
      event.preventDefault();
    }
  });

  startupWindow.webContents.once('did-finish-load', () => {
    startupWindow.webContents.send('startup-log-history', startupLogEntries);
  });

  startupWindow.once('ready-to-show', () => {
    startupWindow.show();
  });

  startupWindow
    .loadFile(path.join(__dirname, 'shell', 'startup.html'))
    .catch((error) => {
      logStartup(`Startup window failed to load: ${error.message}`);
    });
}

function closeStartupWindow() {
  if (!startupWindow || startupWindow.isDestroyed()) {
    return;
  }

  allowStartupWindowClose = true;
  startupWindow.close();
  startupWindow = null;
}

function updateSiteBounds() {
  if (!mainWindow || !siteView) {
    return;
  }

  const { width, height } = mainWindow.getContentBounds();
  siteView.setBounds({
    x: 0,
    y: TITLEBAR_HEIGHT,
    width,
    height: Math.max(0, height - TITLEBAR_HEIGHT),
  });
}

function notifyMaximizeState() {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send('maximize-change', mainWindow.isMaximized());
}

function notifyDebugMode() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('debug-mode-change', debugMode);
}

function isSiteWebContents(webContents) {
  return siteView?.webContents === webContents;
}

function isTitlebarWebContents(webContents) {
  return mainWindow?.webContents === webContents;
}

function isMiniClientWebContents(webContents) {
  return miniClientWindow?.webContents === webContents;
}

function getTrayIcon() {
  const iconCandidates = [
    path.join(__dirname, '..', 'assets', 'electron.ico'),
    path.join(path.dirname(process.execPath), 'electron.ico'),
  ];

  for (const iconPath of iconCandidates) {
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath);
    }
  }

  return nativeImage.createEmpty();
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  mainWindow.setSkipTaskbar(false);

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
}

function hideMainWindow() {
  if (!mainWindow) {
    return;
  }

  mainWindow.setSkipTaskbar(true);
  mainWindow.hide();
}

function setDebugMode(enabled) {
  debugMode = Boolean(enabled);

  if (siteView && !siteView.webContents.isDestroyed()) {
    if (debugMode && !siteView.webContents.isDevToolsOpened()) {
      siteView.webContents.openDevTools({ mode: 'detach' });
    }

    if (!debugMode && siteView.webContents.isDevToolsOpened()) {
      siteView.webContents.closeDevTools();
    }
  }

  notifyDebugMode();
  return debugMode;
}

function toggleDebugMode() {
  return setDebugMode(!debugMode);
}

function showMiniClientWindow() {
  if (miniClientWindow && !miniClientWindow.isDestroyed()) {
    miniClientWindow.show();
    miniClientWindow.focus();
    return;
  }

  miniClientWindow = new BrowserWindow({
    width: 720,
    height: 560,
    minWidth: 560,
    minHeight: 460,
    title: 'a-amusement mini-client',
    backgroundColor: '#f4f6fb',
    webPreferences: {
      preload: path.join(__dirname, 'mini-client-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  miniClientWindow.setMenuBarVisibility(false);
  miniClientWindow.loadFile(path.join(__dirname, 'shell', 'mini-client.html')).catch((error) => {
    dialog.showErrorBox(
      'Mini-client failed to open',
      `The mini-client window could not load: ${error.message}`
    );
  });

  miniClientWindow.on('closed', () => {
    miniClientWindow = null;
  });
}

function createTray() {
  if (tray) {
    return;
  }

  tray = new Tray(getTrayIcon());
  tray.setToolTip('a-amusement');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open a-amusement',
      click: showMainWindow,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', showMainWindow);
}

async function clearAllAppData() {
  credentials.clearAllCredentials();

  const siteSession = getSiteSession();
  await siteSession.clearStorageData();
  await siteSession.clearCache();
  await siteSession.clearAuthCache();

  if (siteView) {
    siteView.webContents.loadURL(SITE_URL);
  }
}

function createWindow() {
  logStartup('Creating the main desktop window.');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 480,
    minHeight: 360,
    frame: false,
    show: false,
    backgroundColor: '#0b0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  logStartup('Preparing the embedded a-amusement website view.');

  siteView = new BrowserView({
    webPreferences: {
      partition: SITE_PARTITION,
      preload: path.join(__dirname, 'site-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setBrowserView(siteView);

  const shellReady = new Promise((resolve) => {
    mainWindow.once('ready-to-show', () => {
      logStartup('Desktop shell is ready.');
      resolve();
    });
  });

  const siteReady = new Promise((resolve) => {
    siteView.webContents.once('did-finish-load', () => {
      logStartup('a-amusement has loaded.');
      resolve();
    });

    siteView.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
      logStartup(`Website load reported: ${errorDescription} (${errorCode}).`);
      resolve();
    });
  });

  logStartup('Loading the desktop shell.');
  mainWindow.loadFile(path.join(__dirname, 'shell', 'index.html')).catch((error) => {
    logStartup(`Desktop shell failed to load: ${error.message}`);
  });

  logStartup('Connecting to a-amusement.');
  siteView.webContents.loadURL(SITE_URL).catch((error) => {
    logStartup(`Website failed to load: ${error.message}`);
  });

  Promise.all([shellReady, siteReady]).then(() => {
    logStartup('Startup complete. Opening the app.');
    updateSiteBounds();
    closeStartupWindow();
    mainWindow.show();
    notifyMaximizeState();
  });

  mainWindow.on('resize', updateSiteBounds);
  mainWindow.on('maximize', notifyMaximizeState);
  mainWindow.on('unmaximize', notifyMaximizeState);
  mainWindow.webContents.on('did-finish-load', notifyDebugMode);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideMainWindow();
    }
  });

  siteView.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url)) {
      siteView.webContents.loadURL(url);
    } else {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  siteView.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  siteView.webContents.on('did-navigate-in-page', (_event, url) => {
    mainWindow.webContents.send('navigation-change', url);
  });

  siteView.webContents.on('did-navigate', (_event, url) => {
    mainWindow.webContents.send('navigation-change', url);
  });

  siteView.webContents.on('devtools-closed', () => {
    if (debugMode) {
      debugMode = false;
      notifyDebugMode();
    }
  });
}

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  hideMainWindow();
});

ipcMain.on('mini-client-open', (event) => {
  if (isTitlebarWebContents(event.sender)) {
    showMiniClientWindow();
  }
});

ipcMain.handle('debug-mode-get', (event) => {
  if (!isTitlebarWebContents(event.sender)) {
    return false;
  }

  return debugMode;
});

ipcMain.handle('debug-mode-toggle', (event) => {
  if (!isTitlebarWebContents(event.sender)) {
    return false;
  }

  return toggleDebugMode();
});

ipcMain.handle('get-theme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

ipcMain.handle('mini-client-get-status', (event) => {
  if (!isMiniClientWebContents(event.sender)) {
    return null;
  }

  return miniClientDb.getConnectionSummary();
});

ipcMain.handle('mini-client-test-connection', async (event) => {
  if (!isMiniClientWebContents(event.sender)) {
    return {
      ok: false,
      message: 'Mini-client request was rejected.',
    };
  }

  return miniClientDb.testConnection();
});

ipcMain.handle('auth-get-credentials', (event) => {
  if (!isSiteWebContents(event.sender)) {
    return null;
  }

  return credentials.getCredentials(SITE_ORIGIN);
});

ipcMain.handle('auth-save-credentials', (event, { email, password }) => {
  if (!isSiteWebContents(event.sender)) {
    return false;
  }

  if (!email?.trim() || !password) {
    return false;
  }

  credentials.saveCredentials(SITE_ORIGIN, email.trim(), password);
  return true;
});

ipcMain.handle('clear-app-data', async (event) => {
  if (!isTitlebarWebContents(event.sender)) {
    return { cleared: false };
  }

  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Cancel', 'Clear everything'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
    title: 'Clear app data',
    message: 'Clear all saved app data?',
    detail:
      'This removes saved login credentials, cookies, cache, and site storage. You will be logged out.',
  });

  if (response !== 1) {
    return { cleared: false };
  }

  await clearAllAppData();
  return { cleared: true };
});

app.whenReady().then(() => {
  createStartupWindow();
  logStartup('Starting a-amusement desktop.');

  Menu.setApplicationMenu(null);
  logStartup('Application menu hidden.');

  createTray();
  logStartup('System tray is ready.');

  createWindow();

  app.on('activate', () => {
    showMainWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  allowStartupWindowClose = true;
});

app.on('window-all-closed', () => {
  // Keep running in the system tray.
});

nativeTheme.on('updated', () => {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send(
    'theme-change',
    nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  );
});
