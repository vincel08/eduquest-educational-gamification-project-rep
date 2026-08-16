-- Align known demo student usernames after optional email login migration.
UPDATE users
SET username = 'sam.student'
WHERE email = 'student@eduwow.local'
  AND (username IS NULL OR username IN ('student', 'sam.student'));

UPDATE users
SET username = 'jamie.learner'
WHERE email = 'student2@eduwow.local'
  AND (username IS NULL OR username IN ('student2', 'jamie.learner'));
