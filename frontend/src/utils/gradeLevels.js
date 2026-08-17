/**
 * Supported student grade levels (must stay aligned with backend/utils/gradeLevels.js).
 * Stored as display strings — do not hard-code grade-specific business logic elsewhere.
 */
export const GRADE_LEVELS = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];

export const GRADE_LEVEL_REQUIRED_MESSAGE = "Please select your grade level.";
export const GRADE_LEVEL_INVALID_MESSAGE = "Please select a valid grade level.";
export const GRADE_LEVEL_PLACEHOLDER = "Select your grade level";

export function isValidGradeLevel(value) {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim();
  return GRADE_LEVELS.includes(normalized);
}
