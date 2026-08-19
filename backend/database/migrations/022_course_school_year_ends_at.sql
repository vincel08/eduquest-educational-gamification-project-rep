-- Subject (course) school-year bound and hard end date for auto-deactivate.
ALTER TABLE courses
  ADD COLUMN school_year VARCHAR(20) NULL AFTER grade_level,
  ADD COLUMN ends_at DATETIME NULL AFTER school_year;

CREATE INDEX idx_courses_school_year ON courses (school_year);
CREATE INDEX idx_courses_ends_at ON courses (ends_at);

-- Backfill current school year and SY end (May 1 exclusive = end of April 30).
SET @start_year := IF(MONTH(CURDATE()) >= 6, YEAR(CURDATE()), YEAR(CURDATE()) - 1);
SET @sy_label := CONCAT(@start_year, '-', @start_year + 1);
SET @ends_at := CONCAT(@start_year + 1, '-05-01 00:00:00');

UPDATE courses
SET school_year = COALESCE(school_year, @sy_label),
    ends_at = COALESCE(ends_at, @ends_at)
WHERE school_year IS NULL OR ends_at IS NULL;
