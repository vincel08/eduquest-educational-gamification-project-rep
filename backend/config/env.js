import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const jwtSecret = String(process.env.JWT_SECRET || '');
const weakSecrets = new Set([
  'change_this_to_a_long_random_secret',
  'secret',
  'jwt_secret',
  'password',
  'eduquest',
]);

if (isProduction) {
  if (!process.env.CLIENT_URL) {
    throw new Error('Missing required environment variable in production: CLIENT_URL');
  }
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  if (weakSecrets.has(jwtSecret.toLowerCase())) {
    throw new Error('JWT_SECRET is too weak for production. Use a long random secret.');
  }
} else if (jwtSecret.length < 16) {
  throw new Error('JWT_SECRET must be at least 16 characters');
}

const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv,
  isProduction,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || (isProduction ? '1d' : '7d'),
  },
  openai: {
    apiKey: (process.env.OPENAI_API_KEY || '').trim(),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  gemini: {
    apiKey: (process.env.GEMINI_API_KEY || '').trim(),
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mail: {
    // Set MAIL_HOST to enable SMTP (Mailhog/Ethereal/provider). Empty disables outbound mail.
    host: process.env.MAIL_HOST || '',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: String(process.env.MAIL_SECURE || '').toLowerCase() === 'true',
    user: process.env.MAIL_USER || '',
    password: process.env.MAIL_PASSWORD || '',
    from: process.env.MAIL_FROM || 'EduWow <noreply@eduquest.local>',
  },
  passwordReset: {
    // ~30 minutes
    ttlMs: Number(process.env.PASSWORD_RESET_TTL_MS) || 30 * 60 * 1000,
  },
  uploadMaxSizeMb: Number(process.env.UPLOAD_MAX_SIZE_MB) || 10,
  rateLimit: {
    authWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || (isProduction ? 20 : 100),
    aiWindowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    aiMax: Number(process.env.AI_RATE_LIMIT_MAX) || (isProduction ? 30 : 120),
  },
  aiLimits: {
    // Thesis-friendly defaults; tighten in production via env.
    dailyRequestLimit: Number(process.env.AI_DAILY_REQUEST_LIMIT) || (isProduction ? 60 : 200),
    hourlyRequestLimit: Number(process.env.AI_HOURLY_REQUEST_LIMIT) || (isProduction ? 25 : 100),
    minQuestions: 3,
    maxQuestions: Number(process.env.AI_MAX_QUESTIONS) || 15,
    maxGameItems: Number(process.env.AI_MAX_GAME_ITEMS) || 20,
    maxInputCharacters: Number(process.env.AI_MAX_INPUT_CHARACTERS) || 20000,
    maxFileSizeMb: Number(process.env.AI_MAX_FILE_SIZE_MB || process.env.UPLOAD_MAX_SIZE_MB) || 10,
    maxPromptCharacters: Number(process.env.AI_MAX_PROMPT_CHARACTERS) || 6000,
    maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS) || 4096,
    requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 60000,
    idempotencyWindowMs: Number(process.env.AI_IDEMPOTENCY_WINDOW_MS) || 15000,
  },
};

env.aiProvider = env.gemini.apiKey ? 'gemini' : env.openai.apiKey ? 'openai' : 'fallback';

export default env;
