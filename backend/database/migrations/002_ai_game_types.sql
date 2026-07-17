-- Expand educational_games for AI Game Generator types
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
    'quiz_rush',
    'word_scramble',
    'true_false_blitz'
  ) NOT NULL;

ALTER TABLE educational_games
  ADD COLUMN lesson_id INT UNSIGNED NULL AFTER course_id;

ALTER TABLE educational_games
  ADD COLUMN difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium' AFTER game_type;

ALTER TABLE educational_games
  ADD COLUMN estimated_time INT UNSIGNED NOT NULL DEFAULT 10 AFTER difficulty;

ALTER TABLE educational_games
  ADD CONSTRAINT fk_games_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;
