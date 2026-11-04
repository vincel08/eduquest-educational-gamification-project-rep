/**
 * Student class section helpers (free-text labels like "A", "Newton").
 */

export const SECTION_REQUIRED_MESSAGE = "Please select your class section.";
export const SECTION_INVALID_MESSAGE = "Section must be 1–50 characters.";
export const SECTION_LOCKED_MESSAGE =
  "Section is locked. Ask an administrator to change it.";
export const SCHOOL_YEAR_REQUIRED_MESSAGE = "Please select your school year.";
export const SCHOOL_YEAR_INVALID_MESSAGE = "Please select a valid school year.";
export const SCHOOL_YEAR_LOCKED_MESSAGE =
  "School year is locked. Ask an administrator to change it.";

/** Strip accidental leading "1 - " / "12 – " style prefixes from typed section names. */
function stripLeadingNumberPrefix(value) {
  return String(value).replace(/^\d+\s*[-–—]\s*/, "").trim();
}

export function normalizeSection(value) {
  if (value === undefined || value === null) return null;
  const normalized = stripLeadingNumberPrefix(String(value).trim());
  if (!normalized) return null;
  return normalized.slice(0, 50);
}

export function isValidSection(value) {
  const normalized = normalizeSection(value);
  return Boolean(normalized) && normalized.length >= 1 && normalized.length <= 50;
}

const ROMAN_VALUES = [
  [10, "X"],
  [9, "IX"],
  [8, "VIII"],
  [7, "VII"],
  [6, "VI"],
  [5, "V"],
  [4, "IV"],
  [3, "III"],
  [2, "II"],
  [1, "I"],
];

function toRoman(number) {
  let remaining = number;
  let mark = "";
  for (const [value, glyph] of ROMAN_VALUES) {
    while (remaining >= value) {
      mark += glyph;
      remaining -= value;
    }
  }
  return mark;
}

/** Grade 4, "Grade 10", and "IV" all become a Roman numeral when one is present. */
export function gradeLevelMark(gradeLevel) {
  const raw = String(gradeLevel || "").trim();
  if (!raw) return "";
  const numberMatch = raw.match(/(\d{1,2})/);
  if (numberMatch) {
    const number = Number(numberMatch[1]);
    if (number >= 1 && number <= 12) return toRoman(number);
  }
  const romanMatch = raw.match(/\b([IVXLCDM]+)\b/i);
  if (romanMatch) return romanMatch[1].toUpperCase();
  return raw;
}

/** "Katarungan" + Grade 4 → "Katarungan - IV". The stored section name stays "Katarungan". */
export function formatSectionWithGrade(name, gradeLevel) {
  const section = String(name || "").trim();
  const mark = gradeLevelMark(gradeLevel);
  if (!section) return mark;
  if (!mark) return section;
  return `${section} - ${mark}`;
}
