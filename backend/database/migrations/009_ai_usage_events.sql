-- AI usage tracking for cost protection and quotas.
-- Safe to re-run: creates table only if missing.

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT UNSIGNED NOT NULL,
  operation_type VARCHAR(64) NOT NULL,
  status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  input_chars INT UNSIGNED NOT NULL DEFAULT 0,
  requested_quantity INT UNSIGNED NULL,
  provider VARCHAR(32) NULL,
  model VARCHAR(100) NULL,
  idempotency_key VARCHAR(128) NULL,
  error_code VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  CONSTRAINT fk_ai_usage_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ai_usage_teacher_created (teacher_id, created_at),
  INDEX idx_ai_usage_teacher_status (teacher_id, status),
  INDEX idx_ai_usage_idempotency (teacher_id, idempotency_key, created_at)
) ENGINE=InnoDB;
