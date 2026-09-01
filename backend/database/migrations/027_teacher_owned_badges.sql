-- Teacher-owned custom badges vs admin unlockable catalog.
-- Safe to re-run where possible.

ALTER TABLE badges
  ADD COLUMN created_by INT UNSIGNED NULL AFTER is_active;

ALTER TABLE badges
  ADD COLUMN owner_key INT UNSIGNED NOT NULL DEFAULT 0 AFTER created_by;

UPDATE badges
SET owner_key = IFNULL(created_by, 0)
WHERE owner_key = 0 AND created_by IS NOT NULL;

-- Drop global unique name so teachers can reuse names independently.
ALTER TABLE badges DROP INDEX name;

ALTER TABLE badges
  ADD UNIQUE KEY uq_badges_owner_name (owner_key, name);

ALTER TABLE badges
  ADD CONSTRAINT fk_badges_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE badges
  ADD INDEX idx_badges_created_by (created_by);
