-- Expand medal criteria for bigger achievements beyond level / rank / perfect quiz.
ALTER TABLE medals
  MODIFY COLUMN criteria_type ENUM(
    'level',
    'leaderboard_rank',
    'perfect_quiz',
    'manual',
    'xp',
    'streak',
    'quizzes_passed',
    'lessons_completed',
    'games_completed'
  ) NOT NULL;
