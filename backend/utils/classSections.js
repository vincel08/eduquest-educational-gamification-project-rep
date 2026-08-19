/**
 * Student class section helpers (free-text labels like "A", "Newton").
 */

export const SECTION_REQUIRED_MESSAGE = "Please enter your class section.";
export const SECTION_INVALID_MESSAGE = "Section must be 1–50 characters.";
export const SCHOOL_YEAR_REQUIRED_MESSAGE = "Please select your school year.";
export const SCHOOL_YEAR_INVALID_MESSAGE = "Please select a valid school year.";

export function normalizeSection(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, 50);
}

export function isValidSection(value) {
  const normalized = normalizeSection(value);
  return Boolean(normalized) && normalized.length >= 1 && normalized.length <= 50;
}
