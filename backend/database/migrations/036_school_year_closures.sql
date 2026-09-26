-- Snapshot of subjects, quizzes, and games closed when a school year advances,
-- so setting that year back can restore them.

CREATE TABLE IF NOT EXISTS school_year_closures (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_year VARCHAR(20) NOT NULL,
  entity_type ENUM('course', 'quiz', 'game') NOT NULL,
  entity_id INT UNSIGNED NOT NULL,
  was_published TINYINT(1) NOT NULL DEFAULT 0,
  ends_at DATETIME NULL,
  closed_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_school_year_closure (school_year, entity_type, entity_id),
  INDEX idx_school_year_closures_year (school_year)
) ENGINE=InnoDB;
