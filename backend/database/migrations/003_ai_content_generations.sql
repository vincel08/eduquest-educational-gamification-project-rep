USE eduquest;

CREATE TABLE IF NOT EXISTS ai_content_generations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  lesson_id INT UNSIGNED NULL,
  original_file_name VARCHAR(255) NULL,
  uploaded_file_path VARCHAR(500) NULL,
  extracted_text LONGTEXT NULL,
  generated_type ENUM('Quiz', 'Game') NOT NULL,
  generated_json JSON NOT NULL,
  quiz_id INT UNSIGNED NULL,
  game_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ai_content_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_content_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_content_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
  CONSTRAINT fk_ai_content_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL,
  CONSTRAINT fk_ai_content_game FOREIGN KEY (game_id) REFERENCES educational_games(id) ON DELETE SET NULL,
  INDEX idx_ai_content_teacher (teacher_id),
  INDEX idx_ai_content_course (course_id),
  INDEX idx_ai_content_created (created_at DESC)
) ENGINE=InnoDB;
