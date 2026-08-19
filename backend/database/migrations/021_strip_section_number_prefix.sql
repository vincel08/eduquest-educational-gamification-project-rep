-- Strip accidental leading "1 - " style prefixes from section labels.
-- Example: "1 - mahirap" → "mahirap", then align to catalog casing when possible.

UPDATE student_profiles
SET section = TRIM(REGEXP_REPLACE(section, '^[0-9]+[[:space:]]*[-][[:space:]]*', ''))
WHERE section IS NOT NULL
  AND section REGEXP '^[0-9]+[[:space:]]*[-][[:space:]]*.+';

UPDATE class_sections
SET name = TRIM(REGEXP_REPLACE(name, '^[0-9]+[[:space:]]*[-][[:space:]]*', ''))
WHERE name REGEXP '^[0-9]+[[:space:]]*[-][[:space:]]*.+';

-- Prefer official catalog casing for student section labels.
UPDATE student_profiles sp
INNER JOIN class_sections cs
  ON cs.school_year = sp.school_year
 AND cs.grade_level = sp.grade_level
 AND LOWER(cs.name) = LOWER(sp.section)
SET sp.section = cs.name
WHERE sp.section IS NOT NULL
  AND sp.section <> cs.name;
