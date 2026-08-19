-- Migration 015: Quiz due dates
-- Optional due date: after due_at, students cannot start new quiz attempts (unless extended).

ALTER TABLE quizzes
  ADD COLUMN due_at DATETIME NULL AFTER time_limit_minutes;
