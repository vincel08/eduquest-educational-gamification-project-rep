-- Secure password reset tokens: store hashed tokens only.
-- Safe to re-run: creates table if missing; renames legacy `token` → `token_hash` when needed.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_prt_user (user_id),
  INDEX idx_prt_token_hash (token_hash),
  INDEX idx_prt_expires (expires_at)
) ENGINE=InnoDB;

-- Legacy installs from migration 004 used column name `token`.
SET @has_token := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'password_reset_tokens'
    AND COLUMN_NAME = 'token'
);

SET @has_token_hash := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'password_reset_tokens'
    AND COLUMN_NAME = 'token_hash'
);

SET @rename_sql := IF(
  @has_token > 0 AND @has_token_hash = 0,
  'ALTER TABLE password_reset_tokens CHANGE COLUMN token token_hash VARCHAR(255) NOT NULL',
  'SELECT 1'
);
PREPARE stmt_rename_prt FROM @rename_sql;
EXECUTE stmt_rename_prt;
DEALLOCATE PREPARE stmt_rename_prt;

-- Ensure user_id index exists (ignore if already present).
SET @has_user_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'password_reset_tokens'
    AND INDEX_NAME = 'idx_prt_user'
);

SET @user_idx_sql := IF(
  @has_user_idx = 0,
  'ALTER TABLE password_reset_tokens ADD INDEX idx_prt_user (user_id)',
  'SELECT 1'
);
PREPARE stmt_user_idx FROM @user_idx_sql;
EXECUTE stmt_user_idx;
DEALLOCATE PREPARE stmt_user_idx;
