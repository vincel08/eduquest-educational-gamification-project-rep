-- Migration 019: Backfill student school_year for admin/teacher roster filters.
-- Existing profiles without a school year are tagged to the current SY.

SET @start_year := IF(MONTH(CURDATE()) >= 6, YEAR(CURDATE()), YEAR(CURDATE()) - 1);
SET @sy_label := CONCAT(@start_year, '-', @start_year + 1);

UPDATE student_profiles
SET school_year = @sy_label
WHERE school_year IS NULL OR TRIM(school_year) = '';
