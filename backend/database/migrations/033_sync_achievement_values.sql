-- Align system badge and medal unlock values with the official catalog.
-- Teacher custom awards (owner_key <> 0 or criteria_type = manual) are left alone.

UPDATE badges
SET description = 'Complete 1 lesson',
    criteria_type = 'lessons_completed',
    criteria_value = 1,
    difficulty = NULL,
    xp_bonus = 10
WHERE owner_key = 0 AND created_by IS NULL AND name = 'First Steps';

UPDATE badges
SET description = 'Pass 3 quizzes',
    criteria_type = 'quizzes_passed',
    criteria_value = 3,
    difficulty = 'medium',
    xp_bonus = 20
WHERE owner_key = 0 AND created_by IS NULL AND name = 'Quiz Champion';

UPDATE badges
SET description = 'Earn 100 XP',
    criteria_type = 'xp',
    criteria_value = 100,
    difficulty = NULL,
    xp_bonus = 15
WHERE owner_key = 0 AND created_by IS NULL AND name = 'XP Collector';

UPDATE badges
SET description = 'Earn 500 XP',
    criteria_type = 'xp',
    criteria_value = 500,
    difficulty = NULL,
    xp_bonus = 50
WHERE owner_key = 0 AND created_by IS NULL AND name = 'Rising Star';

UPDATE badges
SET description = 'Learn 3 days in a row',
    criteria_type = 'streak',
    criteria_value = 3,
    difficulty = NULL,
    xp_bonus = 15
WHERE owner_key = 0 AND created_by IS NULL AND name = 'Streak Starter';

INSERT INTO badges
  (name, description, icon, color, criteria_type, criteria_value, difficulty, xp_bonus, is_active, created_by, owner_key)
SELECT 'Lesson Builder', 'Complete 5 lessons', 'school', '#1D4ED8', 'lessons_completed', 5, NULL, 25, 1, NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM badges WHERE owner_key = 0 AND name = 'Lesson Builder'
);

INSERT INTO badges
  (name, description, icon, color, criteria_type, criteria_value, difficulty, xp_bonus, is_active, created_by, owner_key)
SELECT 'Game Starter', 'Complete 3 games', 'sports_esports', '#8B5CF6', 'games_completed', 3, NULL, 20, 1, NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM badges WHERE owner_key = 0 AND name = 'Game Starter'
);

INSERT INTO badges
  (name, description, icon, color, criteria_type, criteria_value, difficulty, xp_bonus, is_active, created_by, owner_key)
SELECT 'Level Scout', 'Reach level 3', 'military_tech', '#0EA5E9', 'level', 3, NULL, 15, 1, NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM badges WHERE owner_key = 0 AND name = 'Level Scout'
);

INSERT INTO badges
  (name, description, icon, color, criteria_type, criteria_value, difficulty, xp_bonus, is_active, created_by, owner_key)
SELECT 'Perfect Start', 'Score 100% on 1 quiz', 'workspace_premium', '#F59E0B', 'perfect_quiz', 1, NULL, 25, 1, NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM badges WHERE owner_key = 0 AND name = 'Perfect Start'
);

UPDATE medals SET description = 'Reach level 5', criteria_type = 'level', criteria_value = 5 WHERE name = 'Bronze Climber' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Reach level 8', criteria_type = 'level', criteria_value = 8 WHERE name = 'Silver Scholar' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Reach level 10', criteria_type = 'level', criteria_value = 10 WHERE name = 'Diamond Achiever' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Reach level 20', criteria_type = 'level', criteria_value = 20 WHERE name = 'Legendary Learner' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Score 100% on 1 quiz', criteria_type = 'perfect_quiz', criteria_value = 1 WHERE name = 'Perfect Score' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Reach top 3 on the leaderboard', criteria_type = 'leaderboard_rank', criteria_value = 3 WHERE name = 'Top Contender' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Reach #1 on the leaderboard', criteria_type = 'leaderboard_rank', criteria_value = 1 WHERE name = 'Campus Champion' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Earn 1,000 XP', criteria_type = 'xp', criteria_value = 1000 WHERE name = 'XP Titan' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Learn 14 days in a row', criteria_type = 'streak', criteria_value = 14 WHERE name = 'Unstoppable Streak' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Pass 10 quizzes', criteria_type = 'quizzes_passed', criteria_value = 10 WHERE name = 'Quiz Master' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Complete 15 lessons', criteria_type = 'lessons_completed', criteria_value = 15 WHERE name = 'Lesson Legend' AND criteria_type <> 'manual';
UPDATE medals SET description = 'Complete 10 games', criteria_type = 'games_completed', criteria_value = 10 WHERE name = 'Game Veteran' AND criteria_type <> 'manual';
