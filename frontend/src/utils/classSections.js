/**
 * Student class section helpers. Keep messages aligned with backend/utils/classSections.js.
 */

export const SECTION_REQUIRED_MESSAGE = "Please select your class section.";
export const SECTION_INVALID_MESSAGE = "Section must be 1–50 characters.";
export const SECTION_LOCKED_MESSAGE =
  "Section is locked. Ask an administrator to change it.";
export const SECTION_PLACEHOLDER = "Select your section";
export const SCHOOL_YEAR_REQUIRED_MESSAGE = "Please select your school year.";
export const SCHOOL_YEAR_INVALID_MESSAGE = "Please select a valid school year.";
export const SCHOOL_YEAR_LOCKED_MESSAGE =
  "School year is locked. Ask an administrator to change it.";

function stripLeadingNumberPrefix(value) {
  return String(value).replace(/^\d+\s*[-–—]\s*/, "").trim();
}

export function normalizeSection(value) {
  if (value === undefined || value === null) return "";
  return stripLeadingNumberPrefix(String(value).trim()).slice(0, 50);
}

export function isValidSection(value) {
  const normalized = normalizeSection(value);
  return normalized.length >= 1 && normalized.length <= 50;
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

export function normalizeSectionOption(option, gradeLevel = "") {
  if (option && typeof option === "object") {
    const name = String(option.name || "").trim();
    const grade = option.gradeLevel || option.grade_level || gradeLevel || "";
    return {
      name,
      gradeLevel: grade,
      label: option.label || formatSectionWithGrade(name, grade),
    };
  }
  const name = String(option || "").trim();
  return {
    name,
    gradeLevel: gradeLevel || "",
    label: formatSectionWithGrade(name, gradeLevel),
  };
}

export function normalizeSectionOptions(options, gradeLevel = "") {
  return (Array.isArray(options) ? options : [])
    .map((option) => normalizeSectionOption(option, gradeLevel))
    .filter((option) => option.name);
}

export function sectionOptionValue(gradeLevel, name) {
  return `${gradeLevel}|||${name}`;
}

export function parseSectionOptionValue(value) {
  const raw = String(value ?? "");
  if (!raw || raw === "all") return null;
  const divider = raw.indexOf("|||");
  if (divider <= 0) return null;
  const gradeLevel = raw.slice(0, divider).trim();
  const name = raw.slice(divider + 3).trim();
  if (!gradeLevel || !name) return null;
  return { gradeLevel, name };
}

function sectionNamesEqual(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

export function findSectionByName(options, section) {
  if (!section) return null;
  return (
    (Array.isArray(options) ? options : []).find((item) =>
      sectionNamesEqual(item.name, section),
    ) || null
  );
}

/** The one catalog row that matches the current grade and section filters. */
export function findSectionOption(options, gradeLevel, section) {
  const list = Array.isArray(options) ? options : [];
  if (!section || section === "all") return null;
  const named = list.filter((item) => sectionNamesEqual(item.name, section));
  if (gradeLevel && gradeLevel !== "all") {
    return named.find((item) => item.gradeLevel === gradeLevel) || null;
  }
  return named.length === 1 ? named[0] : null;
}

/**
 * Keep the saved filters on a real catalog row.
 * A repeated section name with no grade is cleared so the menu and the query agree.
 * Returns null when nothing needs to change.
 */
export function reconcileSectionFilter(options, gradeLevel, section) {
  if (!section || section === "all") return null;
  const match = findSectionOption(options, gradeLevel, section);
  if (match) {
    if (match.gradeLevel === gradeLevel && match.name === section) return null;
    return { gradeLevel: match.gradeLevel, section: match.name };
  }
  return { gradeLevel: gradeLevel || "all", section: "all" };
}

export function sectionSelectValue(options, gradeLevel, section) {
  if (!section || section === "all") return "all";
  const match = findSectionOption(options, gradeLevel, section);
  if (match) return sectionOptionValue(match.gradeLevel, match.name);
  if ((!options || !options.length) && gradeLevel && gradeLevel !== "all") {
    return sectionOptionValue(gradeLevel, section);
  }
  return "all";
}
