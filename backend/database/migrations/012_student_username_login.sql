-- Student login identity: username (or LRN/school ID), optional email,
-- and hashed school-issued recovery codes. Staff keep email-required in app logic.

ALTER TABLE users
  ADD COLUMN username VARCHAR(100) NULL UNIQUE AFTER id,
  ADD COLUMN recovery_code_hash VARCHAR(255) NULL AFTER password_hash;

ALTER TABLE users
  MODIFY COLUMN email VARCHAR(255) NULL;

-- Backfill usernames for existing students from the email local-part.
UPDATE users
SET username = LOWER(SUBSTRING_INDEX(email, '@', 1))
WHERE role = 'student'
  AND username IS NULL
  AND email IS NOT NULL
  AND email <> '';

-- Resolve rare local-part collisions by appending user id.
UPDATE users u
INNER JOIN (
  SELECT username
  FROM users
  WHERE username IS NOT NULL
  GROUP BY username
  HAVING COUNT(*) > 1
) d ON d.username = u.username
SET u.username = CONCAT(u.username, '-', u.id)
WHERE u.role = 'student';
