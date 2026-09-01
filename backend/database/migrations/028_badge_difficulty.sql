-- Badge criteria difficulty for admin unlockables.
ALTER TABLE badges
  ADD COLUMN difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium'
  AFTER criteria_value;
