-- Quiz and game difficulty: easy, average, difficult.
-- Existing medium/hard game rows are renamed. Quizzes default to average.

ALTER TABLE quizzes
  ADD COLUMN difficulty ENUM('easy', 'average', 'difficult') NOT NULL DEFAULT 'average' AFTER passing_score;

ALTER TABLE educational_games
  MODIFY COLUMN difficulty ENUM('easy', 'medium', 'hard', 'average', 'difficult') NOT NULL DEFAULT 'medium';

UPDATE educational_games
SET difficulty = 'average'
WHERE difficulty = 'medium';

UPDATE educational_games
SET difficulty = 'difficult'
WHERE difficulty = 'hard';

ALTER TABLE educational_games
  MODIFY COLUMN difficulty ENUM('easy', 'average', 'difficult') NOT NULL DEFAULT 'average';
