-- Difficulty only applies to quiz/game-style badge criteria.
ALTER TABLE badges
  MODIFY COLUMN difficulty ENUM('easy', 'medium', 'hard') NULL DEFAULT NULL;

UPDATE badges
SET difficulty = NULL
WHERE criteria_type NOT IN ('quizzes_passed');

UPDATE badges
SET difficulty = 'medium'
WHERE criteria_type = 'quizzes_passed'
  AND difficulty IS NULL;
