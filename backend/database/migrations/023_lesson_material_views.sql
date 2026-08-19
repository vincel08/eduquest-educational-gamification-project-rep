-- Track which lesson materials a student has opened/downloaded (for complete gate).
CREATE TABLE IF NOT EXISTS lesson_material_views (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_material_student_view (material_id, student_id),
  CONSTRAINT fk_material_views_material
    FOREIGN KEY (material_id) REFERENCES lesson_materials(id) ON DELETE CASCADE,
  CONSTRAINT fk_material_views_student
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
