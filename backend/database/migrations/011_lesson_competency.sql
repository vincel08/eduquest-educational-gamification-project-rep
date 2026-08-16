-- Lesson competency (teacher-facing learning outcome / MELC-style statement)
ALTER TABLE lessons
  ADD COLUMN competency TEXT NULL AFTER learning_objectives;
