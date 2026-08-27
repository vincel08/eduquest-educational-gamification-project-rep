USE eduwow_lms;

-- Audit trail: track who last edited content
ALTER TABLE courses
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER teacher_id,
  ADD CONSTRAINT fk_courses_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lessons
  ADD COLUMN created_by INT UNSIGNED NULL AFTER is_published,
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER created_by,
  ADD CONSTRAINT fk_lessons_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_lessons_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE quizzes
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER created_by,
  ADD CONSTRAINT fk_quizzes_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE educational_games
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER created_by,
  ADD CONSTRAINT fk_games_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ai_review_drafts
  ADD COLUMN updated_by INT UNSIGNED NULL AFTER generated_by;
