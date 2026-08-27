USE eduwow_lms;

-- Streak tracking
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS current_streak INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date DATE NULL;

-- Google auth
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL UNIQUE AFTER email;

-- Password reset
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reset_token (token),
  INDEX idx_reset_expires (expires_at)
) ENGINE=InnoDB;

-- Expand medal tiers
ALTER TABLE medals
  MODIFY COLUMN tier ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary') NOT NULL DEFAULT 'bronze';

-- Expand game types
ALTER TABLE educational_games
  MODIFY COLUMN game_type ENUM(
    'flashcards',
    'memory_match',
    'crossword',
    'word_search',
    'quiz_show',
    'jeopardy',
    'drag_drop',
    'spin_wheel',
    'millionaire',
    'escape_room',
    'mission_adventure',
    'puzzle_challenge',
    'quiz_rush',
    'word_scramble',
    'true_false_blitz'
  ) NOT NULL;
