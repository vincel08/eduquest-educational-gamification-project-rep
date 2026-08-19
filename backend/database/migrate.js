/**
 * Apply numbered SQL migrations in order (007–010 by default).
 * Tracks applied files in schema_migrations so re-runs are safe.
 *
 * Usage (from backend/):
 *   npm run db:migrate
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

const MIGRATION_FILES = [
  "007_xp_reward_idempotency.sql",
  "008_certificate_eligibility.sql",
  "009_ai_usage_events.sql",
  "010_password_reset_tokens.sql",
  "011_lesson_competency.sql",
  "012_student_username_login.sql",
  "013_demo_student_usernames.sql",
  "014_quiz_answer_snapshots.sql",
  "015_quiz_due_and_attempts.sql",
  "016_quiz_student_overrides.sql",
  "017_drop_certificates.sql",
];

async function main() {
  const required = ["DB_HOST", "DB_NAME", "DB_USER"];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const [appliedRows] = await connection.query(
      "SELECT id FROM schema_migrations",
    );
    const applied = new Set(appliedRows.map((row) => row.id));

    let appliedCount = 0;
    let skippedCount = 0;

    for (const fileName of MIGRATION_FILES) {
      if (applied.has(fileName)) {
        console.log(`SKIP  ${fileName} (already applied)`);
        skippedCount += 1;
        continue;
      }

      const fullPath = path.join(migrationsDir, fileName);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Migration file not found: ${fullPath}`);
      }

      const sql = fs.readFileSync(fullPath, "utf8");
      console.log(`APPLY ${fileName}`);
      await connection.query(sql);
      await connection.execute(
        "INSERT INTO schema_migrations (id) VALUES (?)",
        [fileName],
      );
      appliedCount += 1;
    }

    console.log("");
    console.log(
      `Migrations complete. Applied: ${appliedCount}. Skipped: ${skippedCount}.`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
