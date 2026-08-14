/**
 * Supported student grade levels (stored as display strings on student_profiles.grade_level).
 * Keep as data — do not branch business logic on individual grade values.
 */
export const GRADE_LEVELS = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export const GRADE_LEVEL_REQUIRED_MESSAGE = 'Please select your grade level.';
export const GRADE_LEVEL_INVALID_MESSAGE = 'Please select a valid grade level.';

export function isValidGradeLevel(value) {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim();
  return GRADE_LEVELS.includes(normalized);
}

export function normalizeGradeLevel(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized;
}
