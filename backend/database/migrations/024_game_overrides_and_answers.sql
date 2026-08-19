-- Migration 024: Per-student game overrides (extra attempts) + store answers on scores

CREATE TABLE IF NOT EXISTS game_student_overrides (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  extra_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  reason VARCHAR(500) NULL,
  granted_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_game_student_override (game_id, student_id),
  CONSTRAINT fk_gso_game FOREIGN KEY (game_id) REFERENCES educational_games(id) ON DELETE CASCADE,
  CONSTRAINT fk_gso_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_gso_granter FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_gso_student (student_id)
) ENGINE=InnoDB;

ALTER TABLE game_scores
  ADD COLUMN answers_json JSON NULL AFTER duration_seconds;
