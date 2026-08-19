-- Migration 020: Admin-managed class sections with optional adviser

CREATE TABLE IF NOT EXISTS class_sections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_year VARCHAR(20) NOT NULL,
  grade_level VARCHAR(50) NOT NULL,
  name VARCHAR(50) NOT NULL,
  adviser_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_class_sections_sy_grade_name (school_year, grade_level, name),
  INDEX idx_class_sections_adviser (adviser_id),
  CONSTRAINT fk_class_sections_adviser
    FOREIGN KEY (adviser_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
