-- Migration 008: Certificate eligibility audit fields
-- Idempotent. Does NOT modify migration 007 or existing XP integrity constraints.
-- Does NOT delete certificates or user accounts.

-- 1) Track administrative overrides on issued certificates.
SET @col_override := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'student_certificates'
    AND column_name = 'is_override'
);

SET @sql_override := IF(
  @col_override = 0,
  'ALTER TABLE student_certificates ADD COLUMN is_override TINYINT(1) NOT NULL DEFAULT 0 AFTER issued_by',
  'SELECT ''is_override already exists'' AS migration_008_status'
);
PREPARE stmt FROM @sql_override;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_reason := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'student_certificates'
    AND column_name = 'issue_reason'
);

SET @sql_reason := IF(
  @col_reason = 0,
  'ALTER TABLE student_certificates ADD COLUMN issue_reason VARCHAR(500) NULL AFTER is_override',
  'SELECT ''issue_reason already exists'' AS migration_008_status'
);
PREPARE stmt FROM @sql_reason;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Report (do not delete) duplicate course certificates if any exist.
--    Application logic prevents new duplicates per student+course.
SELECT
  c.course_id,
  sc.student_id,
  COUNT(*) AS certificate_count
FROM student_certificates sc
INNER JOIN certificates c ON c.id = sc.certificate_id
WHERE c.course_id IS NOT NULL
GROUP BY c.course_id, sc.student_id
HAVING COUNT(*) > 1;
