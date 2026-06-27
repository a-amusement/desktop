const button = document.getElementById('btn-test');
const result = document.getElementById('result');
const debugLog = document.getElementById('debug-log');

function writeLog(message) {
  const item = document.createElement('li');
  const time = document.createElement('time');
  const text = document.createElement('span');

  time.textContent = new Date().toLocaleTimeString();
  text.textContent = message;

  item.append(time, text);
  debugLog.append(item);
  debugLog.scrollTop = debugLog.scrollHeight;
}

function setResult(message, state) {
  result.textContent = message;
  result.classList.toggle('is-ok', state === 'ok');
  result.classList.toggle('is-error', state === 'error');
}

function renderStatus(summary) {
  document.getElementById('db-host').textContent = `${summary.host}:${summary.port}`;
  document.getElementById('db-name').textContent = summary.database;
  document.getElementById('db-user').textContent = summary.user;
  document.getElementById('db-password').textContent = summary.passwordConfigured
    ? 'Configured'
    : 'Missing';
}

async function loadStatus() {
  const status = await window.miniClient.getStatus();
  renderStatus(status);
  writeLog('Mini-client loaded.');
  writeLog(`Target database: ${status.database} on ${status.host}:${status.port}.`);

  if (!status.passwordConfigured) {
    writeLog('A_AMU_DB_PASSWORD is not set on this computer.');
  }

  if (status.configError) {
    setResult(status.configError, 'error');
    writeLog(`Configuration error: ${status.configError}`);
  }
}

button.addEventListener('click', async () => {
  button.disabled = true;
  setResult('Testing database connection...', null);
  writeLog('Starting database connection test.');

  try {
    const response = await window.miniClient.testConnection();
    renderStatus(response.summary);
    writeLog(response.message);

    if (response.ok) {
      setResult(response.message, 'ok');
      writeLog(`Connected as ${response.details.user}.`);
      writeLog(`Server: ${response.details.version}`);
    } else {
      setResult(response.message, 'error');
      writeLog(`Connection failed: ${response.code}.`);
    }
  } catch (error) {
    setResult(error.message, 'error');
    writeLog(`Mini-client error: ${error.message}`);
  } finally {
    button.disabled = false;
  }
});

loadStatus().catch((error) => {
  setResult(error.message, 'error');
  writeLog(`Startup error: ${error.message}`);
});
