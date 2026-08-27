import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { validateNewPassword } from '../utils/passwordPolicy.js';
import env from '../config/env.js';
import pool from '../config/db.js';

after(async () => {
  await pool.end();
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');

function runEnvImport({ nodeEnv, jwtSecret, clientUrl = 'https://example.com' }) {
  const script = `
    import('./config/env.js')
      .then(() => { console.log('ENV_OK'); process.exit(0); })
      .catch((error) => { console.error(error.message); process.exit(1); });
  `;

  const childEnv = {
    ...process.env,
    NODE_ENV: nodeEnv,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_NAME: process.env.DB_NAME || 'eduwow_lms',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD ?? '',
    PORT: process.env.PORT || '4000',
    CLIENT_URL: clientUrl,
  };

  if (jwtSecret === undefined) {
    childEnv.JWT_SECRET = '';
  } else {
    childEnv.JWT_SECRET = jwtSecret;
  }

  return spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: backendRoot,
    env: childEnv,
    encoding: 'utf8',
  });
}

async function listen(app) {
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

describe('password policy for new accounts', () => {
  it('rejects short passwords', () => {
    assert.match(validateNewPassword('Ab1'), /at least 8/i);
  });

  it('requires mixed case and number', () => {
    assert.match(validateNewPassword('abcdefgh'), /uppercase/i);
    assert.match(validateNewPassword('ABCDEFGH'), /lowercase/i);
    assert.match(validateNewPassword('Abcdefgh'), /number/i);
  });

  it('accepts strong passwords', () => {
    assert.equal(validateNewPassword('Password123!'), null);
  });
});

describe('teacher public registration policy', () => {
  it('AuthService rejects teacher self-registration', async () => {
    const { default: AuthService } = await import('../services/AuthService.js');
    await assert.rejects(
      () => AuthService.register({
        email: `teacher-public-${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Teach',
        lastName: 'Er',
        role: 'teacher',
      }),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.match(error.message, /administrator/i);
        return true;
      }
    );
  });

  it('AuthService rejects administrator self-registration', async () => {
    const { default: AuthService } = await import('../services/AuthService.js');
    await assert.rejects(
      () => AuthService.register({
        email: `admin-public-${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Ad',
        lastName: 'Min',
        role: 'administrator',
      }),
      (error) => {
        assert.equal(error.statusCode, 400);
        return true;
      }
    );
  });
});

describe('JWT production configuration', () => {
  it('fails fast in production without JWT_SECRET', () => {
    const result = runEnvImport({ nodeEnv: 'production', jwtSecret: undefined });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}${result.stdout}`, /JWT_SECRET|Missing required/i);
  });

  it('fails fast in production with weak JWT_SECRET', () => {
    const result = runEnvImport({
      nodeEnv: 'production',
      jwtSecret: 'change_this_to_a_long_random_secret',
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}${result.stdout}`, /weak|32 characters/i);
  });

  it('fails fast in production without CLIENT_URL', () => {
    const result = runEnvImport({
      nodeEnv: 'production',
      jwtSecret: 'a'.repeat(40),
      clientUrl: '',
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}${result.stdout}`, /CLIENT_URL/i);
  });
});

describe('authorization middleware', () => {
  it('authorize denies student from admin route with 403', async () => {
    const { authorize } = await import('../middleware/authMiddleware.js');
    const middleware = authorize('administrator');
    let statusCode = null;
    let payload = null;

    await new Promise((resolve) => {
      middleware(
        { user: { id: 1, role: 'student' } },
        {
          status(code) {
            statusCode = code;
            return this;
          },
          json(body) {
            payload = body;
            resolve();
            return this;
          },
        },
        () => resolve()
      );
    });

    assert.equal(statusCode, 403);
    assert.equal(payload.success, false);
    assert.match(payload.message, /access denied/i);
  });

  it('authorize denies teacher from admin route with 403', async () => {
    const { authorize } = await import('../middleware/authMiddleware.js');
    const middleware = authorize('administrator');
    let statusCode = null;

    await new Promise((resolve) => {
      middleware(
        { user: { id: 2, role: 'teacher' } },
        {
          status(code) {
            statusCode = code;
            return this;
          },
          json() {
            resolve();
            return this;
          },
        },
        () => resolve()
      );
    });

    assert.equal(statusCode, 403);
  });

  it('authorize denies student from teacher AI route with 403', async () => {
    const { authorize } = await import('../middleware/authMiddleware.js');
    const middleware = authorize('teacher', 'administrator');
    let statusCode = null;

    await new Promise((resolve) => {
      middleware(
        { user: { id: 3, role: 'student' } },
        {
          status(code) {
            statusCode = code;
            return this;
          },
          json() {
            resolve();
            return this;
          },
        },
        () => resolve()
      );
    });

    assert.equal(statusCode, 403);
  });

  it('authenticate rejects missing JWT with 401', async () => {
    const { authenticate } = await import('../middleware/authMiddleware.js');
    let statusCode = null;
    let payload = null;

    await new Promise((resolve) => {
      authenticate(
        { headers: {} },
        {
          status(code) {
            statusCode = code;
            return this;
          },
          json(body) {
            payload = body;
            resolve();
            return this;
          },
        },
        () => resolve()
      );
    });

    assert.equal(statusCode, 401);
    assert.equal(payload.success, false);
  });

  it('authenticate rejects invalid JWT with 401', async () => {
    const { authenticate } = await import('../middleware/authMiddleware.js');
    let statusCode = null;

    await new Promise((resolve) => {
      authenticate(
        { headers: { authorization: 'Bearer not-a-valid-token' } },
        {
          status(code) {
            statusCode = code;
            return this;
          },
          json() {
            resolve();
            return this;
          },
        },
        () => resolve()
      );
    });

    assert.equal(statusCode, 401);
  });

  it('authenticate rejects expired JWT with 401', async () => {
    const { authenticate } = await import('../middleware/authMiddleware.js');
    const expiredToken = jwt.sign(
      { id: 1, role: 'student', email: 'expired@example.com' },
      env.jwt.secret,
      { algorithm: 'HS256', expiresIn: -10 }
    );

    let statusCode = null;
    let payload = null;

    await new Promise((resolve) => {
      authenticate(
        { headers: { authorization: `Bearer ${expiredToken}` } },
        {
          status(code) {
            statusCode = code;
            return this;
          },
          json(body) {
            payload = body;
            resolve();
            return this;
          },
        },
        () => resolve()
      );
    });

    assert.equal(statusCode, 401);
    assert.match(payload.message, /invalid or expired/i);
  });
});

describe('rate limiting', () => {
  it('auth-style limiter returns 429 after repeated attempts', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/login',
      rateLimit({
        windowMs: 60_000,
        max: 3,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          message: 'Too many authentication attempts. Please try again later.',
          errors: [],
        },
        validate: { xForwardedForHeader: false },
      }),
      (_req, res) => res.json({ success: true })
    );

    const { baseUrl, close } = await listen(app);
    try {
      let lastStatus = 200;
      let lastBody = null;
      for (let i = 0; i < 4; i += 1) {
        const response = await fetch(`${baseUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'a@b.com', password: 'x' }),
        });
        lastStatus = response.status;
        lastBody = await response.json();
      }

      assert.equal(lastStatus, 429);
      assert.equal(lastBody.success, false);
      assert.match(lastBody.message, /authentication attempts/i);
    } finally {
      await close();
    }
  });

  it('AI-style limiter returns 429 after repeated requests', async () => {
    const app = express();
    app.post(
      '/ai',
      rateLimit({
        windowMs: 60_000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          message: 'Too many AI requests. Please try again later.',
          errors: [],
        },
        validate: { xForwardedForHeader: false },
      }),
      (_req, res) => res.json({ success: true })
    );

    const { baseUrl, close } = await listen(app);
    try {
      await fetch(`${baseUrl}/ai`, { method: 'POST' });
      await fetch(`${baseUrl}/ai`, { method: 'POST' });
      const response = await fetch(`${baseUrl}/ai`, { method: 'POST' });
      const body = await response.json();

      assert.equal(response.status, 429);
      assert.equal(body.success, false);
      assert.match(body.message, /AI requests/i);
    } finally {
      await close();
    }
  });

  it('exports configured auth and AI limiters', async () => {
    const { authRateLimiter, aiRateLimiter } = await import('../middleware/rateLimitMiddleware.js');
    assert.equal(typeof authRateLimiter, 'function');
    assert.equal(typeof aiRateLimiter, 'function');
  });
});

describe('admin teacher creation policy', () => {
  it('UserService rejects invalid roles and allows teacher creation', async () => {
    const { default: UserService } = await import('../services/UserService.js');

    await assert.rejects(
      () => UserService.createUser({
        email: `bad-role-${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Bad',
        lastName: 'Role',
        role: 'superadmin',
      }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /invalid role/i);
        return true;
      }
    );

    const email = `teacher-admin-${Date.now()}@example.com`;
    const user = await UserService.createUser({
      email,
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'Created',
      role: 'teacher',
    });
    assert.equal(user.role, 'teacher');

    // Cleanup so repeated local runs do not leave orphan accounts.
    await UserService.deleteUser(user.id);
  });
});
