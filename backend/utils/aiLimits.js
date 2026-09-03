import env from '../config/env.js';
import AppError from './AppError.js';
import crypto from 'crypto';
import {
  getMaxItemsForGameType,
  getMinItemsForGameType,
} from './gameItemLimits.js';

export function getAiLimits() {
  return env.aiLimits;
}

export function clampQuestionCount(value) {
  const { minQuestions, maxQuestions } = env.aiLimits;
  const n = Number(value);
  if (!Number.isFinite(n)) return Math.min(5, maxQuestions);
  return Math.min(Math.max(Math.trunc(n), minQuestions), maxQuestions);
}

export function assertQuestionCount(value) {
  const { minQuestions, maxQuestions } = env.aiLimits;
  if (value === undefined || value === null || value === '') {
    return clampQuestionCount(5);
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < minQuestions || n > maxQuestions) {
    throw new AppError(
      `Question count must be between ${minQuestions} and ${maxQuestions}.`,
      400
    );
  }
  return n;
}

/** Requested playable items for AI game generation (terms, questions, stages, etc.). */
export function clampGameItemRequestCount(value, gameType = 'auto') {
  const min = getMinItemsForGameType(gameType);
  const max = getMaxItemsForGameType(gameType);
  const n = Number(value);
  if (!Number.isFinite(n)) return Math.min(6, max);
  return Math.min(Math.max(Math.trunc(n), min), max);
}

export function assertGameItemRequestCount(value, gameType = 'auto') {
  const min = getMinItemsForGameType(gameType);
  const max = getMaxItemsForGameType(gameType);
  if (value === undefined || value === null || value === '') {
    return clampGameItemRequestCount(6, gameType);
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    const label = gameType && gameType !== 'auto' ? ` for ${gameType}` : '';
    throw new AppError(
      `Item count must be between ${min} and ${max}${label}.`,
      400,
    );
  }
  return n;
}

export function assertGameItemCount(count) {
  const max = env.aiLimits.maxGameItems;
  const n = Number(count) || 0;
  if (n > max) {
    throw new AppError(
      `Generated game content exceeded the maximum of ${max} items.`,
      400
    );
  }
  return n;
}

export function assertInputTextSize(text, { label = 'Document' } = {}) {
  const value = String(text || '');
  const max = env.aiLimits.maxInputCharacters;
  if (value.length > max) {
    throw new AppError(
      `${label} is too large. Please upload a shorter document.`,
      400
    );
  }
  return value.length;
}

export function assertExtractedTextSize(text) {
  const value = String(text || '');
  const max = env.aiLimits.maxInputCharacters;
  if (value.length > max) {
    throw new AppError(
      'Uploaded content is too large to process. Please upload a smaller document.',
      400
    );
  }
  return value;
}

export function assertUploadFileSize(file) {
  const maxBytes = env.aiLimits.maxFileSizeMb * 1024 * 1024;
  if (file?.size != null && Number(file.size) > maxBytes) {
    throw new AppError(
      'Uploaded content is too large to process. Please upload a smaller document.',
      400
    );
  }
}

export function buildIdempotencyKey(parts = []) {
  const raw = parts.map((part) => String(part ?? '')).join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

export function sanitizeAiError(error) {
  const message = String(error?.message || error || 'AI request failed');
  const lower = message.toLowerCase();

  if (lower.includes('timed out') || lower.includes('timeout') || error?.code === 'AI_TIMEOUT') {
    return {
      statusCode: 504,
      message:
        'AI generation timed out. Live generation can take a few minutes — please try again.',
      errorCode: 'AI_TIMEOUT',
    };
  }

  if (
    lower.includes('429')
    || lower.includes('rate limit')
    || lower.includes('quota')
    || lower.includes('resource_exhausted')
  ) {
    return {
      statusCode: 429,
      message: 'The AI provider is temporarily rate-limited. Please try again later.',
      errorCode: 'AI_PROVIDER_RATE_LIMIT',
    };
  }

  if (
    lower.includes('api key')
    || lower.includes('api_key')
    || lower.includes('unauthorized')
    || lower.includes('authentication')
    || lower.includes('permission_denied')
    || lower.includes('permission')
  ) {
    return {
      statusCode: 503,
      message: 'AI service is temporarily unavailable. Please try again later.',
      errorCode: 'AI_PROVIDER_AUTH',
    };
  }

  if (
    lower.includes('fetch failed')
    || lower.includes('network')
    || lower.includes('econnreset')
    || lower.includes('enotfound')
    || lower.includes('socket')
    || lower.includes('unavailable')
    || lower.includes('503')
    || lower.includes('502')
  ) {
    return {
      statusCode: 502,
      message: 'Could not reach the AI provider. Please try again in a moment.',
      errorCode: 'AI_NETWORK',
    };
  }

  if (
    lower.includes('invalid json')
    || lower.includes('unexpected token')
    || lower.includes('json')
    || lower.includes('empty response')
    || lower.includes('malformed')
    || lower.includes('no questions')
    || lower.includes('invalid content')
    || lower.includes('blocked')
    || lower.includes('safety')
  ) {
    return {
      statusCode: 502,
      message: 'AI returned invalid content. Please try generating again.',
      errorCode: 'AI_INVALID_RESPONSE',
    };
  }

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode || 500,
      message: error.message,
      errorCode: 'AI_APP_ERROR',
    };
  }

  return {
    statusCode: 502,
    message: 'AI generation failed. Please try again.',
    errorCode: 'AI_FAILED',
  };
}

export function withTimeout(promise, timeoutMs, message = 'AI generation timed out. Live generation can take a few minutes — please try again.') {
  const ms = Number(timeoutMs) || env.aiLimits.requestTimeoutMs;
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new AppError(message, 504);
      error.code = 'AI_TIMEOUT';
      reject(error);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}
