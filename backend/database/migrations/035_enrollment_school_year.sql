-- Keep the school year on each enrollment so records stay available
-- after a student moves to a new school year.

ALTER TABLE course_enrollments
  ADD COLUMN school_year VARCHAR(20) NULL AFTER student_id;

UPDATE course_enrollments ce
INNER JOIN courses c ON c.id = ce.course_id
SET ce.school_year = c.school_year
WHERE (ce.school_year IS NULL OR TRIM(ce.school_year) = '')
  AND c.school_year IS NOT NULL
  AND TRIM(c.school_year) <> '';

CREATE INDEX idx_course_enrollments_school_year
  ON course_enrollments (school_year);
