import env from '../config/env.js';
import AiUsageModel from '../models/AiUsageModel.js';
import AppError from '../utils/AppError.js';
import { buildIdempotencyKey, sanitizeAiError } from '../utils/aiLimits.js';

function sinceHoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function sinceDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function eventAgeMs(createdAt) {
  const parsed = new Date(createdAt).getTime();
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  // Clamp: future timestamps (timezone skew) must not keep a forever-lock.
  return Math.max(0, Date.now() - parsed);
}

const AiUsageService = {
  buildIdempotencyKey,

  async assertWithinQuota(userId) {
    const { hourlyRequestLimit, dailyRequestLimit } = env.aiLimits;

    const hourly = await AiUsageModel.countSince(userId, sinceHoursAgo(1));
    if (hourly >= hourlyRequestLimit) {
      throw new AppError(
        'Hourly AI usage limit reached. Please try again later.',
        429
      );
    }

    const daily = await AiUsageModel.countSince(userId, sinceDaysAgo(1));
    if (daily >= dailyRequestLimit) {
      throw new AppError(
        'Daily AI usage limit reached. Please try again tomorrow.',
        429
      );
    }

    return { hourly, daily };
  },

  async assertNotDuplicate(userId, idempotencyKey) {
    if (!idempotencyKey) return null;

    const existing = await AiUsageModel.findByIdempotencyKey(userId, idempotencyKey);
    if (!existing) return null;

    // Only in-flight requests block. Completed/failed never lock out a new generate.
    if (existing.status !== 'pending') {
      return null;
    }

    const ageMs = eventAgeMs(existing.created_at);
    if (ageMs > env.aiLimits.idempotencyWindowMs) {
      return null;
    }

    throw new AppError(
      'AI generation already in progress. Please wait for it to finish.',
      409
    );
  },

  async beginOperation({
    userId,
    operationType,
    inputChars = 0,
    requestedQuantity = null,
    idempotencyKey = null,
    provider = null,
    model = null,
  }) {
    await this.assertWithinQuota(userId);
    await this.assertNotDuplicate(userId, idempotencyKey);

    const event = await AiUsageModel.create({
      teacherId: userId,
      operationType,
      status: 'pending',
      inputChars,
      requestedQuantity,
      provider,
      model,
      idempotencyKey,
    });

    if (!event && idempotencyKey) {
      // Race: another request inserted first — re-check; may allow if that one finished.
      await this.assertNotDuplicate(userId, idempotencyKey);
      const existing = await AiUsageModel.findByIdempotencyKey(userId, idempotencyKey);
      if (existing?.status === 'pending') {
        throw new AppError(
          'AI generation already in progress. Please wait for it to finish.',
          409
        );
      }
      // Completed/failed race with unique constraint: start a fresh row without key collision
      // by appending a suffix (schema index is non-unique, but handle ER_DUP_ENTRY safely).
      return AiUsageModel.create({
        teacherId: userId,
        operationType,
        status: 'pending',
        inputChars,
        requestedQuantity,
        provider,
        model,
        idempotencyKey: `${idempotencyKey}:${Date.now()}`,
      });
    }

    return event;
  },

  async completeOperation(eventId, { provider = null, model = null } = {}) {
    if (!eventId) return null;
    return AiUsageModel.updateStatus(eventId, {
      status: 'completed',
      provider,
      model,
    });
  },

  async failOperation(eventId, error) {
    if (!eventId) return null;
    const safe = sanitizeAiError(error);
    return AiUsageModel.updateStatus(eventId, {
      status: 'failed',
      errorCode: safe.errorCode,
    });
  },

  async getUsageSummary(userId) {
    const today = await AiUsageModel.countByOperationSince(userId, sinceDaysAgo(1));
    const month = await AiUsageModel.countByOperationSince(userId, sinceDaysAgo(30));
    return {
      today,
      month,
      limits: {
        hourly: env.aiLimits.hourlyRequestLimit,
        daily: env.aiLimits.dailyRequestLimit,
        maxQuestions: env.aiLimits.maxQuestions,
        maxGameItems: env.aiLimits.maxGameItems,
        maxInputCharacters: env.aiLimits.maxInputCharacters,
      },
    };
  },
};

export default AiUsageService;
