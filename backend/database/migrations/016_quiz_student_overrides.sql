-- Migration 016: Per-student quiz overrides (extend due + extra attempts)

CREATE TABLE IF NOT EXISTS quiz_student_overrides (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  extended_due_at DATETIME NULL,
  extra_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  reason VARCHAR(500) NULL,
  granted_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quiz_student_override (quiz_id, student_id),
  CONSTRAINT fk_qso_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  CONSTRAINT fk_qso_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_qso_granter FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_qso_student (student_id)
) ENGINE=InnoDB;
