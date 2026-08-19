-- Migration 025: Quiz/game results stay private until student finalizes or uses all attempts

ALTER TABLE quiz_attempts
  ADD COLUMN released_to_gradebook TINYINT(1) NOT NULL DEFAULT 0 AFTER completed_at;

ALTER TABLE game_scores
  ADD COLUMN released_to_gradebook TINYINT(1) NOT NULL DEFAULT 0 AFTER answers_json;

-- Preserve existing teacher-visible grades from before this rule.
UPDATE quiz_attempts
SET released_to_gradebook = 1
WHERE completed_at IS NOT NULL;

UPDATE game_scores
SET released_to_gradebook = 1;
