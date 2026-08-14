/**
 * EduWow production configuration check.
 * Reports PASS/FAIL without printing secrets or credentials.
 *
 * Usage (from backend/):
 *   NODE_ENV=production npm run check:production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const results = [];

function pass(label, detail = '') {
  results.push({ ok: true, label, detail });
}

function fail(label, detail = '') {
  results.push({ ok: false, label, detail });
}

function warn(label, detail = '') {
  results.push({ ok: true, warn: true, label, detail });
}

function isHttpOrigin(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(parsed.protocol)
      && value !== '*'
      && !String(value).includes('*');
  } catch {
    return false;
  }
}

async function main() {
  console.log('EduWow Production Configuration Check');
  console.log('====================================');
  console.log('');

  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv !== 'production') {
    fail('NODE_ENV', `Expected production, got "${nodeEnv}". Run with NODE_ENV=production.`);
  } else {
    pass('NODE_ENV', 'production');
  }

  // Database
  const dbKeys = ['DB_HOST', 'DB_NAME', 'DB_USER'];
  const missingDb = dbKeys.filter((key) => !process.env[key]);
  if (missingDb.length) {
    fail('Database configuration', `Missing: ${missingDb.join(', ')}`);
  } else if (process.env.DB_PASSWORD === undefined) {
    fail('Database configuration', 'DB_PASSWORD must be set in production (may be empty only if intentional)');
  } else {
    pass('Database configuration', 'DB_HOST / DB_NAME / DB_USER / DB_PASSWORD present');
    if (!process.env.DB_PASSWORD) {
      warn('Database password', 'DB_PASSWORD is empty — confirm this is intentional for your MySQL host');
    }
  }

  // JWT
  const jwtSecret = String(process.env.JWT_SECRET || '');
  const weakSecrets = new Set([
    'change_this_to_a_long_random_secret',
    'secret',
    'jwt_secret',
    'password',
    'eduquest',
  ]);
  if (!jwtSecret) {
    fail('JWT configuration', 'JWT_SECRET is missing');
  } else if (jwtSecret.length < 32) {
    fail('JWT configuration', 'JWT_SECRET must be at least 32 characters in production');
  } else if (weakSecrets.has(jwtSecret.toLowerCase())) {
    fail('JWT configuration', 'JWT_SECRET is too weak');
  } else {
    pass('JWT configuration', `JWT_SECRET length ${jwtSecret.length}; expires ${process.env.JWT_EXPIRES_IN || '1d (default)'}`);
  }

  // CLIENT_URL / CORS
  const clientUrl = process.env.CLIENT_URL || '';
  if (!clientUrl) {
    fail('CLIENT_URL', 'Required in production for CORS');
  } else if (!isHttpOrigin(clientUrl)) {
    fail('CLIENT_URL', 'Must be an exact http(s) origin without wildcards');
  } else {
    pass('CLIENT_URL', 'Valid origin configured (value not printed)');
  }

  // PORT
  if (!process.env.PORT) {
    fail('PORT', 'PORT must be set in production');
  } else if (!Number(process.env.PORT)) {
    fail('PORT', 'PORT must be a valid number');
  } else {
    pass('PORT', `Listening port configured`);
  }

  // Uploads
  const defaultUploads = path.resolve(path.join(__dirname, '../uploads'));
  const uploadDir = process.env.UPLOAD_DIR
    ? path.resolve(String(process.env.UPLOAD_DIR).trim())
    : defaultUploads;

  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.accessSync(uploadDir, fs.constants.W_OK);
    pass('Upload directory', process.env.UPLOAD_DIR ? 'Custom UPLOAD_DIR is writable' : 'Default backend/uploads is writable');
    warn(
      'Persistent storage',
      'Confirm this path is on a persistent volume (not ephemeral serverless storage)'
    );
  } catch (error) {
    fail('Upload directory', `Not writable: ${error.message}`);
  }

  // Optional SMTP
  if (process.env.MAIL_HOST) {
    const mailBits = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_FROM'];
    const missingMail = mailBits.filter((key) => !process.env[key]);
    if (missingMail.length) {
      fail('SMTP configuration', `MAIL_HOST set but missing: ${missingMail.join(', ')}`);
    } else {
      pass('SMTP configuration', 'Configured for password-reset email delivery');
    }
  } else {
    warn(
      'SMTP configuration',
      'MAIL_HOST unset — forgot-password API works, but reset emails will not be delivered'
    );
  }

  // Optional AI
  if (process.env.GEMINI_API_KEY) {
    pass('AI configuration', 'Gemini configured');
  } else if (process.env.OPENAI_API_KEY) {
    pass('AI configuration', 'OpenAI configured');
  } else {
    warn('AI configuration', 'No provider key — local/demo AI fallback will be used');
  }

  // Frontend reminder (cannot read frontend env from backend reliably)
  warn(
    'Frontend API configuration',
    'Build frontend with VITE_API_URL=https://<your-api-host>/api (non-localhost)'
  );

  // Live DB ping (no credentials printed)
  if (!missingDb.length) {
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME,
        connectTimeout: 5000,
      });
      await connection.ping();
      await connection.end();
      pass('Database connectivity', 'MySQL ping succeeded');
    } catch (error) {
      fail('Database connectivity', error.message);
    }
  }

  console.log('');
  for (const item of results) {
    const mark = item.ok ? (item.warn ? '!' : '✓') : '✗';
    const suffix = item.detail ? ` — ${item.detail}` : '';
    console.log(`${mark} ${item.label}${suffix}`);
  }

  const failed = results.filter((item) => !item.ok);
  console.log('');
  if (failed.length) {
    console.log(`Production configuration is INVALID (${failed.length} failure(s)).`);
    process.exit(1);
  }

  console.log('Production configuration is valid.');
}

main().catch((error) => {
  console.error('check:production failed:', error.message);
  process.exit(1);
});
