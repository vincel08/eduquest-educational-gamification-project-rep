-- School years an administrator can add (previous, current, and future)
-- without changing the current school year setting.

CREATE TABLE IF NOT EXISTS school_years (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(20) NOT NULL,
  start_year SMALLINT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_school_years_label (label),
  UNIQUE KEY uq_school_years_start (start_year),
  CONSTRAINT fk_school_years_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
