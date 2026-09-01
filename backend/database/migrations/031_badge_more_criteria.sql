-- Expand badge unlock criteria options for admin.
ALTER TABLE badges
  MODIFY COLUMN criteria_type ENUM(
    'xp',
    'quizzes_passed',
    'lessons_completed',
    'manual',
    'streak',
    'games_completed',
    'level',
    'leaderboard_rank',
    'perfect_quiz'
  ) NOT NULL;
