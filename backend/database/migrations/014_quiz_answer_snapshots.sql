-- Preserve quiz attempt answer rows when questions are replaced/deleted.
-- Also store denormalized text so teachers can still review after option cleanup.

ALTER TABLE quiz_answers
  DROP FOREIGN KEY fk_answers_question;

ALTER TABLE quiz_answers
  MODIFY question_id INT UNSIGNED NULL;

ALTER TABLE quiz_answers
  ADD COLUMN question_text TEXT NULL AFTER question_id,
  ADD COLUMN selected_option_text VARCHAR(500) NULL AFTER selected_option_id;

ALTER TABLE quiz_answers
  ADD CONSTRAINT fk_answers_question
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE SET NULL;
