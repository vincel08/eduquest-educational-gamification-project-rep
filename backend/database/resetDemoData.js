/**
 * EduWow developer utility — reset operational data, keep user accounts.
 *
 * Usage (from backend/):
 *   npm run db:reset-demo
 *
 * What it does:
 *   1. Runs database/reset_demo_data.sql against the configured MySQL database
 *   2. Removes uploaded learning materials from uploads/ (keeps .gitkeep)
 *
 * Preserved: users (all accounts, passwords, roles)
 * Cleared: courses, lessons, quizzes, games, progress, XP history, badges,
 *          certificates, AI drafts/generations, enrollments, notifications, etc.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlPath = path.join(__dirname, "reset_demo_data.sql");
const uploadsDir = process.env.UPLOAD_DIR
  ? path.resolve(String(process.env.UPLOAD_DIR).trim())
  : path.join(__dirname, "..", "uploads");

async function clearUploads() {
  if (!fs.existsSync(uploadsDir)) return 0;

  let removed = 0;
  for (const name of fs.readdirSync(uploadsDir)) {
    if (name === ".gitkeep") continue;
    const fullPath = path.join(uploadsDir, name);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      fs.unlinkSync(fullPath);
      removed += 1;
    }
  }
  return removed;
}

async function main() {
  console.warn("");
  console.warn("============================================================");
  console.warn("WARNING: db:reset-demo is DESTRUCTIVE for learning data.");
  console.warn(
    "It clears courses, quizzes, games, progress, XP, uploads, etc.",
  );
  console.warn("User accounts are preserved. FOR DEMO/TEST DATABASES ONLY.");
  console.warn("============================================================");
  console.warn("");

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to reset demo data while NODE_ENV=production. " +
        "Set ALLOW_DEMO_SEED=true only if you intentionally want to wipe learning data.",
    );
  }

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`SQL script not found: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "eduquest",
    multipleStatements: true,
  });

  try {
    const [usersBefore] = await connection.query(
      "SELECT id, email, role FROM users ORDER BY id",
    );

    console.log(`\nPreserving ${usersBefore.length} user account(s):`);
    for (const user of usersBefore) {
      console.log(`  • ${user.email} (${user.role})`);
    }

    console.log("\nRunning reset_demo_data.sql ...");
    await connection.query(sql);

    const [usersAfter] = await connection.query(
      "SELECT COUNT(*) AS total FROM users",
    );
    const [courses] = await connection.query(
      "SELECT COUNT(*) AS total FROM courses",
    );
    const [quizzes] = await connection.query(
      "SELECT COUNT(*) AS total FROM quizzes",
    );
    const [games] = await connection.query(
      "SELECT COUNT(*) AS total FROM educational_games",
    );
    const [profiles] = await connection.query(
      "SELECT COUNT(*) AS total, COALESCE(SUM(xp), 0) AS xp_sum FROM student_profiles",
    );

    const removedUploads = await clearUploads();

    console.log("\nReset complete.");
    console.log(`  users               : ${usersAfter[0].total} (preserved)`);
    console.log(
      `  student_profiles    : ${profiles[0].total} (kept, XP sum=${profiles[0].xp_sum})`,
    );
    console.log(`  courses             : ${courses[0].total}`);
    console.log(`  quizzes             : ${quizzes[0].total}`);
    console.log(`  educational_games   : ${games[0].total}`);
    console.log(`  uploads removed     : ${removedUploads}`);
    console.log("\nExisting accounts can log in with the same credentials.\n");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("\nReset failed:", error.message);
  process.exit(1);
});
