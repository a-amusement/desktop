const controls = window.windowControls;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

function setMaximized(isMaximized) {
  document.getElementById('icon-maximize').classList.toggle('hidden', isMaximized);
  document.getElementById('icon-restore').classList.toggle('hidden', !isMaximized);

  const maximizeBtn = document.getElementById('btn-maximize');
  maximizeBtn.setAttribute('aria-label', isMaximized ? 'Restore' : 'Maximize');
  maximizeBtn.title = isMaximized ? 'Restore' : 'Maximize';
}

function setDebugMode(isEnabled) {
  const debugBtn = document.getElementById('btn-debug-mode');
  const label = isEnabled ? 'Turn debug mode off' : 'Turn debug mode on';

  debugBtn.classList.toggle('is-active', isEnabled);
  debugBtn.setAttribute('aria-pressed', String(isEnabled));
  debugBtn.setAttribute('aria-label', label);
  debugBtn.title = label;
}

document.getElementById('btn-minimize').addEventListener('click', () => {
  controls.minimize();
});

document.getElementById('btn-maximize').addEventListener('click', () => {
  controls.maximize();
});

document.getElementById('btn-close').addEventListener('click', () => {
  controls.close();
});

document.getElementById('btn-debug-mode').addEventListener('click', async () => {
  const isEnabled = await controls.toggleDebugMode();
  setDebugMode(isEnabled);
});

document.getElementById('btn-clear-data').addEventListener('click', async () => {
  const button = document.getElementById('btn-clear-data');
  button.classList.add('is-busy');

  try {
    await controls.clearAppData();
  } finally {
    button.classList.remove('is-busy');
  }
});

controls.getTheme().then(setTheme);
controls.getDebugMode().then(setDebugMode);
controls.onThemeChange(setTheme);
controls.onMaximizeChange(setMaximized);
controls.onDebugModeChange(setDebugMode);
