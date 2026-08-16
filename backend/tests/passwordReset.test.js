import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool, { query } from '../config/db.js';
import env from '../config/env.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  forgotPasswordValidation,
  resetPasswordValidation,
} from '../validations/authValidation.js';
import AuthController from '../controllers/AuthController.js';
import { errorHandler } from '../middleware/errorMiddleware.js';

const STAFF_SENT =
  'A password reset link has been sent to that staff email address.';
const LEARNER_BLOCKED =
  'Learner accounts cannot reset via email — even if an email is on file. Ask a school administrator to set a new password.';
const INELIGIBLE =
  'This email is not eligible for staff password reset. Learners should ask a school administrator. Staff should check the address and try again.';
const INVALID_TOKEN =
  'Your password reset link is invalid or has expired. Please request a new one.';

const createdUserIds = [];

after(async () => {
  for (const id of createdUserIds) {
    try {
      await query('DELETE FROM password_reset_tokens WHERE user_id = :id', { id });
      await query('DELETE FROM users WHERE id = :id', { id });
    } catch {
      // best-effort cleanup
    }
  }
  await pool.end();
});

async function ensurePasswordResetSchema() {
  const tables = await query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'password_reset_tokens'`
  );

  if (!tables.length) {
    await query(`
      CREATE TABLE password_reset_tokens (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_prt_user_test FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_prt_user (user_id),
        INDEX idx_prt_token_hash (token_hash),
        INDEX idx_prt_expires (expires_at)
      ) ENGINE=InnoDB
    `);
    return;
  }

  const cols = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'password_reset_tokens'`
  );
  const names = new Set(cols.map((row) => row.COLUMN_NAME));

  if (names.has('token') && !names.has('token_hash')) {
    await query(
      'ALTER TABLE password_reset_tokens CHANGE COLUMN token token_hash VARCHAR(255) NOT NULL'
    );
  }
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

async function createUser({ role, emailPrefix, password = 'OldPass123' }) {
  const { default: UserService } = await import('../services/UserService.js');
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${emailPrefix}-${suffix}@example.com`;
  const payload = {
    email,
    password,
    firstName: 'Reset',
    lastName: role,
    role,
    gradeLevel: 'Grade 10',
    schoolName: 'EduQuest High',
  };
  if (role === 'student') {
    payload.username = `u${emailPrefix}${suffix}`.replace(/[^a-z0-9]/gi, '').slice(0, 64).toLowerCase();
  }
  const user = await UserService.createUser(payload);
  createdUserIds.push(user.id);
  return { user, email, password, username: user.username };
}

function extractTokenFromUrl(resetUrl) {
  const url = new URL(resetUrl);
  return url.searchParams.get('token');
}

async function withCapturedResetEmail(fn) {
  const EmailService = (await import('../services/EmailService.js')).default;
  const original = EmailService.sendPasswordResetEmail;
  let captured = null;

  EmailService.sendPasswordResetEmail = async (payload) => {
    captured = payload;
    return { delivered: false, mode: 'test' };
  };

  try {
    const result = await fn();
    return { result, captured };
  } finally {
    EmailService.sendPasswordResetEmail = original;
  }
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

before(async () => {
  await ensurePasswordResetSchema();
});

describe('password reset - forgot password enumeration', () => {
  it('existing staff email returns sent response and sends mail', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { email } = await createUser({ role: 'teacher', emailPrefix: 'prt-exist' });

    const { result, captured } = await withCapturedResetEmail(() =>
      AuthService.requestPasswordReset({ email })
    );

    assert.equal(result.message, STAFF_SENT);
    assert.equal(result.eligible, true);
    assert.equal(result.reason, 'sent');
    assert.ok(captured?.resetUrl);
    assert.equal(captured.to, email);
    assert.equal(Object.hasOwn(result, 'token'), false);
    assert.equal(Object.hasOwn(result, 'userId'), false);
  });

  it('student email is blocked with a learner prompt and does not send mail', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { email } = await createUser({ role: 'student', emailPrefix: 'prt-student' });

    const { result, captured } = await withCapturedResetEmail(() =>
      AuthService.requestPasswordReset({ email })
    );

    assert.equal(result.message, LEARNER_BLOCKED);
    assert.equal(result.eligible, false);
    assert.equal(result.reason, 'learner');
    assert.equal(captured, null);
  });

  it('non-existing email returns ineligible prompt', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { result, captured } = await withCapturedResetEmail(() =>
      AuthService.requestPasswordReset({ email: `missing-${Date.now()}@example.com` })
    );

    assert.equal(result.message, INELIGIBLE);
    assert.equal(result.eligible, false);
    assert.equal(result.reason, 'ineligible');
    assert.equal(captured, null);
  });

  it('does not reveal reset tokens in the response payload', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { email } = await createUser({ role: 'teacher', emailPrefix: 'prt-enum' });

    const existing = await withCapturedResetEmail(() =>
      AuthService.requestPasswordReset({ email })
    );
    const missing = await withCapturedResetEmail(() =>
      AuthService.requestPasswordReset({ email: `no-user-${Date.now()}@example.com` })
    );

    assert.equal(Object.hasOwn(existing.result, 'token'), false);
    assert.equal(Object.hasOwn(missing.result, 'token'), false);
    assert.equal(Object.hasOwn(existing.result, 'userId'), false);
    assert.equal(Object.hasOwn(missing.result, 'userId'), false);
  });
});

describe('password reset - token security', () => {
  it('generates a cryptographically random URL-safe token and stores only the hash', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { user, email } = await createUser({ role: 'teacher', emailPrefix: 'prt-hash' });

    const { captured } = await withCapturedResetEmail(() =>
      AuthService.requestPasswordReset({ email })
    );

    const rawToken = extractTokenFromUrl(captured.resetUrl);
    assert.ok(rawToken);
    assert.ok(rawToken.length >= 32);

    const rows = await query(
      `SELECT token_hash, user_id, used_at
       FROM password_reset_tokens
       WHERE user_id = :userId
       ORDER BY id DESC
       LIMIT 1`,
      { userId: user.id }
    );

    assert.equal(rows.length, 1);
    assert.notEqual(rows[0].token_hash, rawToken);
    assert.equal(rows[0].token_hash, hashToken(rawToken));
    assert.equal(rows[0].used_at, null);

    const rawMatches = await query(
      `SELECT id FROM password_reset_tokens WHERE token_hash = :raw LIMIT 1`,
      { raw: rawToken }
    );
    assert.equal(rawMatches.length, 0);
  });

  it('valid token resets password; token cannot be reused', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { email, password: oldPassword } = await createUser({
      role: 'teacher',
      emailPrefix: 'prt-valid',
      password: 'OldPass123',
    });

    const { captured } = await withCapturedResetEmail(() =>
      AuthService.requestPasswordReset({ email })
    );
    const token = extractTokenFromUrl(captured.resetUrl);
    const newPassword = 'NewPass456';

    const resetResult = await AuthService.resetPassword({
      token,
      password: newPassword,
      confirmPassword: newPassword,
    });
    assert.match(resetResult.message, /reset successfully/i);

    await assert.rejects(
      () => AuthService.login({ email, password: oldPassword }),
      (error) => {
        assert.equal(error.statusCode, 401);
        return true;
      }
    );

    const login = await AuthService.login({ email, password: newPassword });
    assert.ok(login.token);
    assert.equal(login.user.email, email);

    await assert.rejects(
      () => AuthService.resetPassword({
        token,
        password: 'AnotherPass789',
        confirmPassword: 'AnotherPass789',
      }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, INVALID_TOKEN);
        return true;
      }
    );
  });

  it('rejects student reset tokens even if present', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { user } = await createUser({ role: 'student', emailPrefix: 'prt-exp' });
    const rawToken = crypto.randomBytes(32).toString('base64url');

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at)
       VALUES (:userId, :tokenHash, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE), NULL)`,
      { userId: user.id, tokenHash: hashToken(rawToken) }
    );

    await assert.rejects(
      () => AuthService.resetPassword({
        token: rawToken,
        password: 'NewPass456',
        confirmPassword: 'NewPass456',
      }),
      (error) => {
        assert.equal(error.message, INVALID_TOKEN);
        return true;
      }
    );
  });

  it('rejects expired tokens', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { user } = await createUser({ role: 'teacher', emailPrefix: 'prt-exp-staff' });
    const rawToken = crypto.randomBytes(32).toString('base64url');

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at)
       VALUES (:userId, :tokenHash, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE), NULL)`,
      { userId: user.id, tokenHash: hashToken(rawToken) }
    );

    await assert.rejects(
      () => AuthService.resetPassword({
        token: rawToken,
        password: 'NewPass456',
        confirmPassword: 'NewPass456',
      }),
      (error) => {
        assert.equal(error.message, INVALID_TOKEN);
        return true;
      }
    );
  });

  it('rejects used tokens', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { user } = await createUser({ role: 'teacher', emailPrefix: 'prt-used' });
    const rawToken = crypto.randomBytes(32).toString('base64url');

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at)
       VALUES (:userId, :tokenHash, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE), UTC_TIMESTAMP())`,
      { userId: user.id, tokenHash: hashToken(rawToken) }
    );

    await assert.rejects(
      () => AuthService.resetPassword({
        token: rawToken,
        password: 'NewPass456',
        confirmPassword: 'NewPass456',
      }),
      (error) => {
        assert.equal(error.message, INVALID_TOKEN);
        return true;
      }
    );
  });

  it('rejects invalid tokens safely', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;

    await assert.rejects(
      () => AuthService.resetPassword({
        token: crypto.randomBytes(32).toString('base64url'),
        password: 'NewPass456',
        confirmPassword: 'NewPass456',
      }),
      (error) => {
        assert.equal(error.message, INVALID_TOKEN);
        return true;
      }
    );
  });

  it('rejects weak passwords using existing password policy', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { email } = await createUser({ role: 'teacher', emailPrefix: 'prt-weak' });
    const { captured } = await withCapturedResetEmail(() =>
      AuthService.requestPasswordReset({ email })
    );
    const token = extractTokenFromUrl(captured.resetUrl);

    await assert.rejects(
      () => AuthService.resetPassword({
        token,
        password: 'weak',
        confirmPassword: 'weak',
      }),
      (error) => {
        assert.match(error.message, /at least 8|uppercase|lowercase|number/i);
        return true;
      }
    );
  });

  it('rejects password mismatch', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { email } = await createUser({ role: 'teacher', emailPrefix: 'prt-mismatch' });
    const { captured } = await withCapturedResetEmail(() =>
      AuthService.requestPasswordReset({ email })
    );
    const token = extractTokenFromUrl(captured.resetUrl);

    await assert.rejects(
      () => AuthService.resetPassword({
        token,
        password: 'NewPass456',
        confirmPassword: 'Different789',
      }),
      (error) => {
        assert.match(error.message, /do not match/i);
        return true;
      }
    );
  });
});

describe('password reset - roles', () => {
  for (const role of ['teacher', 'administrator']) {
    it(`works for ${role} accounts`, async () => {
      const AuthService = (await import('../services/AuthService.js')).default;
      const { email } = await createUser({
        role,
        emailPrefix: `prt-${role}`,
        password: 'RolePass123',
      });

      const { captured } = await withCapturedResetEmail(() =>
        AuthService.requestPasswordReset({ email })
      );
      assert.ok(captured?.resetUrl);

      const token = extractTokenFromUrl(captured.resetUrl);
      await AuthService.resetPassword({
        token,
        password: 'RolePass456',
        confirmPassword: 'RolePass456',
      });

      const login = await AuthService.login({ email, password: 'RolePass456' });
      assert.equal(login.user.role, role);
    });
  }

  it('admin can reset a student password', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { default: UserService } = await import('../services/UserService.js');
    const created = await createUser({
      role: 'student',
      emailPrefix: 'prt-recover',
      password: 'OldPass123',
    });

    const admin = await createUser({ role: 'administrator', emailPrefix: 'prt-rec-admin' });
    await UserService.setStudentPassword(
      { id: admin.user.id, role: 'administrator' },
      created.user.id,
      'NewPass456'
    );

    const login = await AuthService.login({
      login: created.username,
      password: 'NewPass456',
    });
    assert.equal(login.user.role, 'student');
    assert.equal(login.user.username, created.username);
  });
});

describe('password reset - HTTP layer', () => {
  it('forgot/reset endpoints return safe payloads and support rate limiting', async () => {
    const app = express();
    app.use(express.json());

    function authStyleLimiter(max) {
      return rateLimit({
        windowMs: 60_000,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          message: 'Too many authentication attempts. Please try again later.',
          errors: [],
        },
        validate: { xForwardedForHeader: false },
      });
    }

    app.post(
      '/api/auth/forgot-password',
      authStyleLimiter(3),
      forgotPasswordValidation,
      validate,
      AuthController.forgotPassword
    );
    app.post(
      '/api/auth/reset-password',
      authStyleLimiter(20),
      resetPasswordValidation,
      validate,
      AuthController.resetPassword
    );
    app.use(errorHandler);

    const { email } = await createUser({ role: 'teacher', emailPrefix: 'prt-http' });
    const { baseUrl, close } = await listen(app);

    try {
      const { captured } = await withCapturedResetEmail(async () => {
        const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const body = await response.json();
        assert.equal(response.status, 200);
        assert.equal(body.success, true);
        assert.equal(body.message, STAFF_SENT);
        assert.equal(body.data.eligible, true);
        assert.equal(body.data.reason, 'sent');
        return body;
      });

      const token = extractTokenFromUrl(captured.resetUrl);

      const badReset = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: 'NewPass456',
          confirmPassword: 'NopePass456',
        }),
      });
      const badBody = await badReset.json();
      assert.equal(badReset.status, 422);
      assert.equal(badBody.success, false);

      // 2nd and 3rd forgot-password succeed; 4th is rate-limited.
      await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@example.com' }),
      });
      await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'b@example.com' }),
      });
      const limited = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'c@example.com' }),
      });
      const limitedBody = await limited.json();
      assert.equal(limited.status, 429);
      assert.equal(limitedBody.success, false);
      assert.match(limitedBody.message, /authentication attempts/i);
    } finally {
      await close();
    }
  });

  it('existing JWT authentication still works after password reset feature', async () => {
    const AuthService = (await import('../services/AuthService.js')).default;
    const { email, password, username } = await createUser({
      role: 'student',
      emailPrefix: 'prt-jwt',
      password: 'JwtPass123',
    });

    const login = await AuthService.login({ login: username, password });
    assert.ok(login.token);

    const decoded = jwt.verify(login.token, env.jwt.secret, { algorithms: ['HS256'] });
    assert.equal(decoded.email, email);
    assert.equal(decoded.username, username);

    const me = await AuthService.getMe(login.user.id);
    assert.equal(me.user.email, email);
    assert.equal(me.user.username, username);

    // Password hash still bcrypt-compatible.
    const rows = await query(
      'SELECT password_hash FROM users WHERE id = :id LIMIT 1',
      { id: login.user.id }
    );
    assert.ok(await bcrypt.compare(password, rows[0].password_hash));
  });
});
