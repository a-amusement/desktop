const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_FILE = 'credentials.json';

function getCredentialsPath() {
  return path.join(app.getPath('userData'), CREDENTIALS_FILE);
}

function isEncryptionAvailable() {
  return safeStorage.isEncryptionAvailable();
}

function encrypt(value) {
  if (isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64');
  }

  return Buffer.from(value, 'utf8').toString('base64');
}

function decrypt(encoded) {
  const buffer = Buffer.from(encoded, 'base64');

  if (isEncryptionAvailable()) {
    return safeStorage.decryptString(buffer);
  }

  return buffer.toString('utf8');
}

function loadStore() {
  const filePath = getCredentialsPath();

  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function saveStore(store) {
  fs.writeFileSync(getCredentialsPath(), JSON.stringify(store, null, 2), 'utf8');
}

function getCredentials(origin) {
  const entry = loadStore()[origin];

  if (!entry?.email || !entry?.password) {
    return null;
  }

  return {
    email: decrypt(entry.email),
    password: decrypt(entry.password),
  };
}

function saveCredentials(origin, email, password) {
  const store = loadStore();

  store[origin] = {
    email: encrypt(email),
    password: encrypt(password),
    updatedAt: new Date().toISOString(),
  };

  saveStore(store);
}

function clearCredentials(origin) {
  const store = loadStore();
  delete store[origin];
  saveStore(store);
}

function clearAllCredentials() {
  const filePath = getCredentialsPath();

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  clearAllCredentials,
  clearCredentials,
  getCredentials,
  isEncryptionAvailable,
  saveCredentials,
};
