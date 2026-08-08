import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  assertExtractedTextSize,
  assertInputTextSize,
  assertQuestionCount,
  assertUploadFileSize,
  buildIdempotencyKey,
  clampQuestionCount,
  sanitizeAiError,
  withTimeout,
} from '../utils/aiLimits.js';
import env from '../config/env.js';
import AiUsageService from '../services/AiUsageService.js';
import pool, { query } from '../config/db.js';
import UserModel from '../models/UserModel.js';
import { authorize, authenticate } from '../middleware/authMiddleware.js';
import { UPLOADS_DIR } from '../utils/uploadPaths.js';

const createdUserIds = [];

after(async () => {
  for (const userId of createdUserIds) {
    await query('DELETE FROM ai_usage_events WHERE teacher_id = :id', { id: userId }).catch(() => {});
    await query('DELETE FROM users WHERE id = :id', { id: userId }).catch(() => {});
  }
  await pool.end();
});

async function createTeacher() {
  const email = `ai-cost-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await UserModel.create({
    email,
    passwordHash,
    firstName: 'AI',
    lastName: 'Tester',
    role: 'teacher',
  });
  createdUserIds.push(user.id);
  return user;
}

describe('AI input and quantity limits', () => {
  it('TEST 3: rejects excessive question counts', () => {
    assert.throws(() => assertQuestionCount(1000), /between 3 and/i);
    assert.throws(() => assertQuestionCount(0), /between 3 and/i);
    assert.equal(assertQuestionCount(5), 5);
    assert.equal(clampQuestionCount(1000), env.aiLimits.maxQuestions);
  });

  it('TEST 4: rejects oversized upload file metadata', () => {
    const tooBig = { size: (env.aiLimits.maxFileSizeMb + 1) * 1024 * 1024 };
    assert.throws(() => assertUploadFileSize(tooBig), /too large to process/i);
  });

  it('TEST 5: rejects extracted text over maximum before AI call', () => {
    const huge = 'x'.repeat(env.aiLimits.maxInputCharacters + 1);
    assert.throws(() => assertExtractedTextSize(huge), /too large to process/i);
    assert.throws(() => assertInputTextSize(huge, { label: 'Document' }), /too large/i);
  });

  it('accepts normal question counts and text sizes', () => {
    assert.equal(assertQuestionCount(env.aiLimits.maxQuestions), env.aiLimits.maxQuestions);
    assert.equal(assertInputTextSize('A'.repeat(100)), 100);
  });
});

describe('AI usage quotas and idempotency', () => {
  it('TEST 6/7: hourly and daily quota enforcement', async () => {
    const teacher = await createTeacher();
    const previousHourly = env.aiLimits.hourlyRequestLimit;
    const previousDaily = env.aiLimits.dailyRequestLimit;
    env.aiLimits.hourlyRequestLimit = 2;
    env.aiLimits.dailyRequestLimit = 2;

    const keyPrefix = `quota-test-${Date.now()}`;

    try {
      await AiUsageService.beginOperation({
        userId: teacher.id,
        operationType: 'test_quota',
        idempotencyKey: `${keyPrefix}-1`,
      });
      await AiUsageService.beginOperation({
        userId: teacher.id,
        operationType: 'test_quota',
        idempotencyKey: `${keyPrefix}-2`,
      });

      await assert.rejects(
        () => AiUsageService.beginOperation({
          userId: teacher.id,
          operationType: 'test_quota',
          idempotencyKey: `${keyPrefix}-3`,
        }),
        (error) => {
          assert.equal(error.statusCode, 429);
          assert.match(error.message, /limit reached/i);
          return true;
        }
      );
    } finally {
      env.aiLimits.hourlyRequestLimit = previousHourly;
      env.aiLimits.dailyRequestLimit = previousDaily;
    }
  });

  it('TEST 12: duplicate AI request blocked within window', async () => {
    const teacher = await createTeacher();
    const key = buildIdempotencyKey(['dup', Date.now(), Math.random()]);
    const event = await AiUsageService.beginOperation({
      userId: teacher.id,
      operationType: 'test_dup',
      idempotencyKey: key,
    });
    await AiUsageService.completeOperation(event.id);

    await assert.rejects(
      () => AiUsageService.beginOperation({
        userId: teacher.id,
        operationType: 'test_dup',
        idempotencyKey: key,
      }),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /duplicate/i);
        return true;
      }
    );
  });

  it('TEST 13: intentional regenerate uses distinct operation key', () => {
    const generateKey = buildIdempotencyKey(['from-content', 1, 10, 'quiz']);
    const regenerateKey = buildIdempotencyKey(['regenerate', 1, 99, 'quiz']);
    assert.notEqual(generateKey, regenerateKey);
  });
});

describe('AI timeout and failure handling', () => {
  it('TEST 10: timeout yields friendly error', async () => {
    await assert.rejects(
      () => withTimeout(new Promise(() => {}), 20),
      (error) => {
        assert.equal(error.statusCode, 504);
        assert.match(error.message, /timed out/i);
        return true;
      }
    );
  });

  it('TEST 11/14: malformed and provider rate-limit errors are sanitized', () => {
    const malformed = sanitizeAiError(new Error('Unexpected token in JSON'));
    assert.equal(malformed.statusCode, 502);
    assert.match(malformed.message, /invalid content/i);
    assert.doesNotMatch(malformed.message, /api[_-]?key/i);

    const rateLimited = sanitizeAiError(new Error('429 RESOURCE_EXHAUSTED quota exceeded'));
    assert.equal(rateLimited.statusCode, 429);
    assert.match(rateLimited.message, /rate-limited/i);
  });

  it('TEST 15: AI API keys are not exposed by sanitize helper', () => {
    const leaked = sanitizeAiError(new Error(`Invalid API key ${env.gemini.apiKey || 'sk-test'}`));
    assert.doesNotMatch(leaked.message, /sk-|AIza|api key [A-Za-z0-9_-]{8,}/i);
    assert.match(leaked.message, /unavailable|failed|rate-limited|invalid/i);
  });
});

describe('AI authorization conventions', () => {
  it('TEST 8: student cannot access teacher AI authorize middleware', async () => {
    const middleware = authorize('teacher', 'administrator');
    let statusCode = null;
    await new Promise((resolve) => {
      middleware(
        { user: { id: 9, role: 'student' } },
        {
          status(code) { statusCode = code; return this; },
          json() { resolve(); return this; },
        },
        () => resolve()
      );
    });
    assert.equal(statusCode, 403);
  });

  it('TEST 9: unauthenticated AI request rejected', async () => {
    let statusCode = null;
    await new Promise((resolve) => {
      authenticate(
        { headers: {} },
        {
          status(code) { statusCode = code; return this; },
          json() { resolve(); return this; },
        },
        () => resolve()
      );
    });
    assert.equal(statusCode, 401);
  });
});

describe('AI generation happy paths without provider keys', () => {
  it('TEST 1: normal quiz generation returns structured fallback content', async () => {
    const { default: AiService } = await import('../services/AiService.js');
    const previousGemini = env.gemini.apiKey;
    const previousOpenAI = env.openai.apiKey;
    env.gemini.apiKey = '';
    env.openai.apiKey = '';
    try {
      const result = await AiService.generateQuiz({
        topic: 'Photosynthesis',
        difficulty: 'medium',
        questionCount: 5,
        questionType: 'multiple_choice',
      });
      assert.ok(result.title);
      assert.ok(Array.isArray(result.questions));
      assert.ok(result.questions.length >= 3);
      assert.ok(result.questions.length <= env.aiLimits.maxQuestions);
      for (const question of result.questions) {
        assert.ok(question.questionText);
        assert.ok(Array.isArray(question.options));
      }
    } finally {
      env.gemini.apiKey = previousGemini;
      env.openai.apiKey = previousOpenAI;
    }
  });

  it('TEST 2: normal game generation returns structured content', async () => {
    const { default: AiService } = await import('../services/AiService.js');
    const previousGemini = env.gemini.apiKey;
    const previousOpenAI = env.openai.apiKey;
    env.gemini.apiKey = '';
    env.openai.apiKey = '';
    try {
      const result = await AiService.generateGame({
        topic: 'Photosynthesis',
        gameType: 'flashcards',
        lessonContent: 'Plants convert light energy into chemical energy through photosynthesis.',
      });
      assert.ok(result.title);
      assert.ok(result.gameType);
      assert.ok(result.gameData);
    } finally {
      env.gemini.apiKey = previousGemini;
      env.openai.apiKey = previousOpenAI;
    }
  });
});

describe('document extract size gate', () => {
  it('rejects oversized extracted text from document service', async () => {
    const { default: DocumentExtractService } = await import('../services/DocumentExtractService.js');
    const fileName = `ai-oversize-${Date.now()}.txt`;
    const absolute = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(absolute, 'Y'.repeat(env.aiLimits.maxInputCharacters + 50));

    try {
      await assert.rejects(
        () => DocumentExtractService.extractFromFile({
          path: absolute,
          filename: fileName,
          originalname: 'huge.txt',
          mimetype: 'text/plain',
          size: env.aiLimits.maxInputCharacters + 50,
        }),
        /too large to process/i
      );
    } finally {
      fs.unlinkSync(absolute);
    }
  });
});
