-- Migration 007: XP reward idempotency for quiz/game/lesson sources
-- Safe for existing data: reports/deduplicates ledger rows only.
-- Does NOT recalculate or reduce student_profiles.xp (historical totals preserved).
-- Idempotent: safe to re-run.

-- 1) Deduplicate one-time source rewards, keeping the earliest transaction id.
--    Affects weekly/monthly leaderboard sums; overall profile XP is left unchanged.
DELETE t1
FROM xp_transactions t1
INNER JOIN xp_transactions t2
  ON t1.student_id = t2.student_id
 AND t1.source_type = t2.source_type
 AND t1.source_id = t2.source_id
 AND t1.id > t2.id
WHERE t1.source_id IS NOT NULL
  AND t1.source_type IN ('quiz', 'game', 'lesson');

-- 2) Prevent future duplicate one-time rewards for the same source.
--    Skip if the unique key already exists.
SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'xp_transactions'
    AND index_name = 'uq_xp_student_source'
);

SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE xp_transactions ADD UNIQUE KEY uq_xp_student_source (student_id, source_type, source_id)',
  'SELECT ''uq_xp_student_source already exists'' AS migration_007_status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
