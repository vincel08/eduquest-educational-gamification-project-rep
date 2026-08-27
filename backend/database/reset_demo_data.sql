-- =============================================================================
-- EduWow — Reset Demo / Test Data
-- =============================================================================
-- Purpose:
--   Clear ALL operational teaching/learning data for a clean testing slate,
--   while PRESERVING every user account and login credential.
--
-- PRESERVED (authentication / accounts — DO NOT CLEAR):
--   • users                  — all admin, teacher, and student accounts
--                              (email, password_hash, google_id, role, avatar, etc.)
--
-- RESET IN PLACE (account-linked, but progress wiped):
--   • student_profiles       — rows kept so students can still log in; XP, level,
--                              streaks, and activity date are reset to defaults
--
-- CLEARED (operational data — DELETE + AUTO_INCREMENT reset):
--   • courses
--   • course_enrollments
--   • lessons
--   • lesson_materials
--   • lesson_progress
--   • quizzes
--   • quiz_questions
--   • quiz_options
--   • quiz_attempts
--   • quiz_answers
--   • educational_games
--   • game_scores
--   • badges                 (badge catalog definitions)
--   • student_badges
--   • medals                 (medal catalog definitions)
--   • student_medals
--   • notifications
--   • xp_transactions        (leaderboard / XP history)
--   • password_reset_tokens  (temporary reset tokens only — not passwords)
--   • ai_content_generations
--   • ai_review_drafts
--
-- Notes:
--   1. There is no separate "permissions" or "system_settings" table in schema.sql.
--      Auth is entirely on `users` (role + password_hash / google_id).
--   2. MySQL DDL (ALTER TABLE ... AUTO_INCREMENT) causes an implicit commit.
--      Deletes run inside a transaction; AUTO_INCREMENT resets run after COMMIT.
--   3. Run against the eduwow_lms database, e.g.:
--        mysql -u root -p eduwow_lms < database/reset_demo_data.sql
--      Or via Node:
--        npm run db:reset-demo
-- =============================================================================

USE eduwow_lms;

START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

-- Child / dependent tables first (order is flexible with FK checks off)
DELETE FROM quiz_answers;
DELETE FROM quiz_attempts;
DELETE FROM quiz_options;
DELETE FROM quiz_questions;
DELETE FROM quizzes;

DELETE FROM game_scores;
DELETE FROM educational_games;

DELETE FROM student_badges;
DELETE FROM badges;

DELETE FROM student_medals;
DELETE FROM medals;

DELETE FROM lesson_progress;
DELETE FROM lesson_materials;
DELETE FROM lessons;

DELETE FROM course_enrollments;
DELETE FROM courses;

DELETE FROM notifications;
DELETE FROM xp_transactions;

DELETE FROM ai_review_drafts;
DELETE FROM ai_content_generations;

DELETE FROM password_reset_tokens;

-- Wipe learning progress on student profiles, but KEEP the profile rows
-- so student accounts continue to work after login.
UPDATE student_profiles
SET
  xp = 0,
  level = 1,
  current_streak = 0,
  longest_streak = 0,
  last_activity_date = NULL;

SET FOREIGN_KEY_CHECKS = 1;

COMMIT;

-- AUTO_INCREMENT resets (DDL — runs after successful commit)
ALTER TABLE quiz_answers AUTO_INCREMENT = 1;
ALTER TABLE quiz_attempts AUTO_INCREMENT = 1;
ALTER TABLE quiz_options AUTO_INCREMENT = 1;
ALTER TABLE quiz_questions AUTO_INCREMENT = 1;
ALTER TABLE quizzes AUTO_INCREMENT = 1;

ALTER TABLE game_scores AUTO_INCREMENT = 1;
ALTER TABLE educational_games AUTO_INCREMENT = 1;

ALTER TABLE student_badges AUTO_INCREMENT = 1;
ALTER TABLE badges AUTO_INCREMENT = 1;

ALTER TABLE student_medals AUTO_INCREMENT = 1;
ALTER TABLE medals AUTO_INCREMENT = 1;

ALTER TABLE lesson_progress AUTO_INCREMENT = 1;
ALTER TABLE lesson_materials AUTO_INCREMENT = 1;
ALTER TABLE lessons AUTO_INCREMENT = 1;

ALTER TABLE course_enrollments AUTO_INCREMENT = 1;
ALTER TABLE courses AUTO_INCREMENT = 1;

ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE xp_transactions AUTO_INCREMENT = 1;

ALTER TABLE ai_review_drafts AUTO_INCREMENT = 1;
ALTER TABLE ai_content_generations AUTO_INCREMENT = 1;

ALTER TABLE password_reset_tokens AUTO_INCREMENT = 1;

-- student_profiles rows are kept; leave their AUTO_INCREMENT alone
-- users table is NEVER touched

SELECT 'EduWow demo data reset complete. User accounts preserved.' AS status;
SELECT COUNT(*) AS users_remaining FROM users;
SELECT COUNT(*) AS courses_remaining FROM courses;
SELECT COUNT(*) AS quizzes_remaining FROM quizzes;
SELECT COUNT(*) AS games_remaining FROM educational_games;
