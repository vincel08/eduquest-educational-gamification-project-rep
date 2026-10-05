-- Learner self-registration waits for an administrator.
-- Existing accounts, and accounts an administrator creates, stay approved.

ALTER TABLE users
  ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved' AFTER is_active,
  ADD COLUMN approval_reviewed_at DATETIME NULL AFTER approval_status,
  ADD COLUMN approval_reviewed_by INT UNSIGNED NULL AFTER approval_reviewed_at,
  ADD INDEX idx_users_approval_status (approval_status),
  ADD CONSTRAINT fk_users_approval_reviewer
    FOREIGN KEY (approval_reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
