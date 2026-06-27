const { Client } = require('pg');
const fs = require('fs');

const DEFAULT_HOST = 'a-amu.uk';
const DEFAULT_PORT = 5432;
const DEFAULT_DATABASE = 'my_webapp__13';
const DEFAULT_USER = 'my_webapp__13';

function cleanHost(value) {
  const rawValue = value || DEFAULT_HOST;

  try {
    return new URL(rawValue).hostname;
  } catch {
    return rawValue.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  }
}

function readSslConfig() {
  if (process.env.A_AMU_DB_SSL === 'disable') {
    return false;
  }

  if (process.env.A_AMU_DB_CA_FILE) {
    return {
      ca: fs.readFileSync(process.env.A_AMU_DB_CA_FILE, 'utf8'),
    };
  }

  return true;
}

function readConfig() {
  return {
    host: cleanHost(process.env.A_AMU_DB_HOST),
    port: Number(process.env.A_AMU_DB_PORT || DEFAULT_PORT),
    database: process.env.A_AMU_DB_NAME || DEFAULT_DATABASE,
    user: process.env.A_AMU_DB_USER || DEFAULT_USER,
    password: process.env.A_AMU_DB_PASSWORD || '',
    ssl: readSslConfig(),
    connectionTimeoutMillis: 6000,
    statement_timeout: 8000,
  };
}

function getConnectionSummary() {
  let config;

  try {
    config = readConfig();
  } catch (error) {
    return {
      host: cleanHost(process.env.A_AMU_DB_HOST),
      port: Number(process.env.A_AMU_DB_PORT || DEFAULT_PORT),
      database: process.env.A_AMU_DB_NAME || DEFAULT_DATABASE,
      user: process.env.A_AMU_DB_USER || DEFAULT_USER,
      passwordConfigured: Boolean(process.env.A_AMU_DB_PASSWORD),
      ssl: process.env.A_AMU_DB_SSL !== 'disable',
      configError: error.message,
    };
  }

  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    passwordConfigured: Boolean(config.password),
    ssl: Boolean(config.ssl),
  };
}

async function testConnection() {
  let config;

  try {
    config = readConfig();
  } catch (error) {
    return {
      ok: false,
      code: 'config-error',
      message: error.message,
      summary: getConnectionSummary(),
    };
  }

  if (!config.password) {
    return {
      ok: false,
      code: 'missing-password',
      message:
        'Set A_AMU_DB_PASSWORD on this computer before testing the database connection.',
      summary: getConnectionSummary(),
    };
  }

  const client = new Client(config);

  try {
    await client.connect();
    const result = await client.query(
      'select current_database() as database, current_user as user, version() as version'
    );

    return {
      ok: true,
      message: 'Database connection succeeded.',
      summary: getConnectionSummary(),
      details: result.rows[0],
    };
  } catch (error) {
    return {
      ok: false,
      code: error.code || 'connection-error',
      message: error.message,
      summary: getConnectionSummary(),
    };
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = {
  getConnectionSummary,
  testConnection,
};
