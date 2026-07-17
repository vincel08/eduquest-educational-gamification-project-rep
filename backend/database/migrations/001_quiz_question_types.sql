-- Migration: expand quiz question types (run against existing eduquest DB)
-- mysql -u root -p eduquest < backend/database/migrations/001_quiz_question_types.sql

ALTER TABLE quiz_questions
  MODIFY COLUMN question_type ENUM(
    'multiple_choice',
    'true_false',
    'matching',
    'identification',
    'image_question'
  ) NOT NULL DEFAULT 'multiple_choice';

ALTER TABLE quiz_questions
  ADD COLUMN image_url VARCHAR(500) NULL AFTER explanation;

ALTER TABLE quiz_options
  ADD COLUMN match_key VARCHAR(50) NULL AFTER is_correct;

ALTER TABLE quiz_options
  ADD COLUMN side ENUM('left', 'right', 'none') NOT NULL DEFAULT 'none' AFTER match_key;

ALTER TABLE quiz_answers
  ADD COLUMN text_answer VARCHAR(500) NULL AFTER selected_option_id;

ALTER TABLE quiz_answers
  ADD COLUMN answer_payload JSON NULL AFTER text_answer;
