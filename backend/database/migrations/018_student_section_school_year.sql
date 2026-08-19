-- Migration 018: Student class section + school year
-- Designated when a student enrolls/registers at school.

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_profiles'
    AND COLUMN_NAME = 'section'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE student_profiles ADD COLUMN section VARCHAR(50) NULL AFTER school_name',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_profiles'
    AND COLUMN_NAME = 'school_year'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE student_profiles ADD COLUMN school_year VARCHAR(20) NULL AFTER section',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_profiles'
    AND INDEX_NAME = 'idx_student_profiles_class'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE student_profiles ADD INDEX idx_student_profiles_class (school_year, grade_level, section)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
