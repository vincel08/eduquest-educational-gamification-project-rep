import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

const required = ["DB_HOST", "DB_NAME", "DB_USER", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const jwtSecret = String(process.env.JWT_SECRET || "");
const weakSecrets = new Set([
  "change_this_to_a_long_random_secret",
  "secret",
  "jwt_secret",
  "password",
  "eduquest",
]);

function assertValidClientUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    throw new Error("CLIENT_URL is required in production");
  }
  if (value === "*" || value.includes("*")) {
    throw new Error(
      "CLIENT_URL must be an exact origin in production (wildcards are not allowed)",
    );
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      "CLIENT_URL must be a valid absolute URL (e.g. https://app.example.com)",
    );
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("CLIENT_URL must use http or https");
  }

  return value.replace(/\/$/, "");
}

function resolveUploadDir() {
  if (process.env.UPLOAD_DIR && String(process.env.UPLOAD_DIR).trim()) {
    return path.resolve(String(process.env.UPLOAD_DIR).trim());
  }
  return path.resolve(path.join(__dirname, "../uploads"));
}

if (isProduction) {
  if (!process.env.CLIENT_URL) {
    throw new Error(
      "Missing required environment variable in production: CLIENT_URL",
    );
  }
  if (process.env.DB_PASSWORD === undefined) {
    throw new Error(
      "Missing required environment variable in production: DB_PASSWORD",
    );
  }
  if (!process.env.PORT) {
    throw new Error(
      "Missing required environment variable in production: PORT",
    );
  }
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
  if (weakSecrets.has(jwtSecret.toLowerCase())) {
    throw new Error(
      "JWT_SECRET is too weak for production. Use a long random secret.",
    );
  }
  assertValidClientUrl(process.env.CLIENT_URL);
} else if (jwtSecret.length < 16) {
  throw new Error("JWT_SECRET must be at least 16 characters");
}

const uploadDir = resolveUploadDir();

const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv,
  isProduction,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || (isProduction ? "1d" : "7d"),
  },
  openai: {
    apiKey: (process.env.OPENAI_API_KEY || "").trim(),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
  gemini: {
    apiKey: (process.env.GEMINI_API_KEY || "").trim(),
    // Prefer a stable Flash model; override with GEMINI_MODEL if needed.
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
  clientUrl: isProduction
    ? assertValidClientUrl(process.env.CLIENT_URL)
    : (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, ""),
  mail: {
    // Set MAIL_HOST to enable SMTP (Mailhog/Ethereal/provider). Empty disables outbound mail.
    host: process.env.MAIL_HOST || "",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: String(process.env.MAIL_SECURE || "").toLowerCase() === "true",
    user: process.env.MAIL_USER || "",
    password: process.env.MAIL_PASSWORD || "",
    from: process.env.MAIL_FROM || "EduWow <noreply@eduwow.local>",
  },
  passwordReset: {
    // ~30 minutes
    ttlMs: Number(process.env.PASSWORD_RESET_TTL_MS) || 30 * 60 * 1000,
  },
  uploadMaxSizeMb: Number(process.env.UPLOAD_MAX_SIZE_MB) || 10,
  uploadDir,
  rateLimit: {
    authWindowMs:
      Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    authMax:
      Number(process.env.AUTH_RATE_LIMIT_MAX) || (isProduction ? 20 : 100),
    aiWindowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    aiMax: Number(process.env.AI_RATE_LIMIT_MAX) || (isProduction ? 30 : 120),
  },
  aiLimits: {
    // Thesis-friendly defaults; tighten in production via env.
    dailyRequestLimit:
      Number(process.env.AI_DAILY_REQUEST_LIMIT) || (isProduction ? 60 : 200),
    hourlyRequestLimit:
      Number(process.env.AI_HOURLY_REQUEST_LIMIT) || (isProduction ? 25 : 100),
    minQuestions: 3,
    maxQuestions: Number(process.env.AI_MAX_QUESTIONS) || 15,
    maxGameItems: Number(process.env.AI_MAX_GAME_ITEMS) || 20,
    maxInputCharacters: Number(process.env.AI_MAX_INPUT_CHARACTERS) || 20000,
    maxFileSizeMb:
      Number(
        process.env.AI_MAX_FILE_SIZE_MB || process.env.UPLOAD_MAX_SIZE_MB,
      ) || 10,
    maxPromptCharacters: Number(process.env.AI_MAX_PROMPT_CHARACTERS) || 6000,
    // Thinking models count reasoning toward output tokens; keep headroom for JSON.
    maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS) || 8192,
    requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 90000,
    // Blocks concurrent / in-flight retries with the same key.
    idempotencyWindowMs: Number(process.env.AI_IDEMPOTENCY_WINDOW_MS) || 90000,
  },
};

env.aiProvider = env.gemini.apiKey
  ? "gemini"
  : env.openai.apiKey
    ? "openai"
    : "fallback";

/**
 * Ensure the upload directory exists and is writable.
 * Safe to call at startup; never exposes the path to API clients.
 */
export function ensureUploadDirWritable({ requireWritable = false } = {}) {
  if (!fs.existsSync(env.uploadDir)) {
    fs.mkdirSync(env.uploadDir, { recursive: true });
  }

  const stat = fs.statSync(env.uploadDir);
  if (!stat.isDirectory()) {
    throw new Error("UPLOAD_DIR must be a directory");
  }

  if (requireWritable || env.isProduction) {
    fs.accessSync(env.uploadDir, fs.constants.W_OK);
  }

  return env.uploadDir;
}

export default env;
