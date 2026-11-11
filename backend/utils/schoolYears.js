/**
 * Philippine academic school years (June 1 – April 30).
 * Labels look like "2026-2027" (starts June 2026, ends April 2027).
 * May is the break between school years and still belongs to the SY that started the previous June.
 *
 * EduWow launched in SY 2026-2027. Until an administrator sets a school year,
 * the current year follows the June 1 rollover. Keep aligned with
 * frontend/src/utils/schoolYears.js.
 */

/** First school-year start year shipped with EduWow. */
export const FIRST_SCHOOL_YEAR_START = 2026;

/** Earliest school year an administrator may add for older records. */
export const MANAGED_SCHOOL_YEAR_MIN = 2000;

/** How many school years past the system year an administrator may add. */
export const MANAGED_FUTURE_YEARS = 15;

/** Administrator-selected start year. Null uses the calendar rollover. */
let overrideStartYear = null;

export function calendarSchoolYearStartYear(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based; June = 5
  // June–December → this calendar year's SY start; January–May → previous June's SY.
  return month >= 5 ? year : year - 1;
}

export function setCurrentSchoolYearOverride(startYear) {
  if (startYear == null || startYear === "") {
    overrideStartYear = null;
    return;
  }
  const year = Number(startYear);
  overrideStartYear = Number.isInteger(year) && year >= FIRST_SCHOOL_YEAR_START
    ? year
    : null;
}

export function currentSchoolYearStartYear(now = new Date()) {
  if (overrideStartYear != null) return overrideStartYear;
  return calendarSchoolYearStartYear(now);
}

export function formatSchoolYearLabel(startYear) {
  const start = Number(startYear);
  return `${start}-${start + 1}`;
}

export function isValidSchoolYearLabel(label) {
  return Boolean(parseSchoolYearLabel(label));
}

export const SCHOOL_YEAR_MISMATCH_MESSAGE =
  "This subject is for a different school year.";
export const SCHOOL_YEAR_REQUIRED_FOR_ACCESS_MESSAGE =
  "Set your school year in your profile before accessing subjects.";

export function schoolYearsMatch(studentSchoolYear, courseSchoolYear) {
  const a = String(studentSchoolYear || "").trim();
  const b = String(courseSchoolYear || "").trim();
  if (!a || !b) return false;
  return a === b;
}

/**
 * Previous, current, or future compared with the system school year (June 1 rollover).
 * This does not look at the administrator's current-year setting.
 */
export function schoolYearTiming(label, now = new Date()) {
  const startYear = parseSchoolYearLabel(label);
  if (!startYear) return null;
  const calendarStart = calendarSchoolYearStartYear(now);
  if (startYear < calendarStart) return "previous";
  if (startYear > calendarStart) return "future";
  return "current";
}

/** Accept "2027-2028" or a start year "2027". */
export function normalizeManagedSchoolYear(value) {
  const raw = String(value || "").trim();
  if (isValidSchoolYearLabel(raw)) return raw;
  if (/^\d{4}$/.test(raw)) return formatSchoolYearLabel(Number(raw));
  return raw;
}

/** Empty string when the label can be added. Does not change the current setting. */
export function managedSchoolYearError(label, now = new Date()) {
  const startYear = parseSchoolYearLabel(label);
  if (!startYear) return "Use a school year like 2026-2027.";
  const latest = calendarSchoolYearStartYear(now) + MANAGED_FUTURE_YEARS;
  if (startYear < MANAGED_SCHOOL_YEAR_MIN || startYear > latest) {
    return `Enter a school year from SY ${formatSchoolYearLabel(MANAGED_SCHOOL_YEAR_MIN)} through SY ${formatSchoolYearLabel(latest)}.`;
  }
  return "";
}

export function parseSchoolYearLabel(label) {
  if (!label || label === "all") return null;
  const match = String(label).trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (!Number.isInteger(startYear) || endYear !== startYear + 1) return null;
  return startYear;
}

/** Inclusive start / exclusive end as MySQL DATETIME strings. */
export function getSchoolYearBounds(label, now = new Date()) {
  const startYear =
    parseSchoolYearLabel(label) ?? currentSchoolYearStartYear(now);
  const start = `${startYear}-06-01 00:00:00`;
  // Ends April 30 → exclusive end is May 1 of the following calendar year.
  const endExclusive = `${startYear + 1}-05-01 00:00:00`;
  return {
    label: formatSchoolYearLabel(startYear),
    startYear,
    start,
    endExclusive,
  };
}

/** School-year end (exclusive) containing the given date. */
export function getSchoolYearEndExclusiveForDate(date = new Date()) {
  const ref = date instanceof Date ? date : new Date(date);
  const safe = Number.isNaN(ref.getTime()) ? new Date() : ref;
  return getSchoolYearBounds(null, safe).endExclusive;
}

/**
 * School years an administrator may set: launch through the calendar school year.
 * A later year is not valid until that school year begins on June 1.
 */
export function listCalendarSchoolYearOptions(now = new Date()) {
  const calendarStart = calendarSchoolYearStartYear(now);
  const years = [];
  for (let startYear = FIRST_SCHOOL_YEAR_START; startYear <= calendarStart; startYear += 1) {
    const value = formatSchoolYearLabel(startYear);
    years.push({ value, label: `SY ${value}` });
  }
  return years;
}

/**
 * List selectable school years from launch through the current SY.
 * The current SY is the administrator setting when one exists, otherwise the June rollover.
 */
export function listSchoolYearOptions({
  includeAll = true,
  now = new Date(),
  firstStartYear = FIRST_SCHOOL_YEAR_START,
} = {}) {
  const currentStart = currentSchoolYearStartYear(now);
  const launch = Number.isInteger(Number(firstStartYear))
    ? Number(firstStartYear)
    : FIRST_SCHOOL_YEAR_START;
  const from = Math.min(launch, currentStart);
  const to = currentStart;

  const years = [];
  for (let startYear = from; startYear <= to; startYear += 1) {
    years.push({
      value: formatSchoolYearLabel(startYear),
      label: `SY ${formatSchoolYearLabel(startYear)}`,
    });
  }

  if (includeAll) {
    return [{ value: "all", label: "All school years" }, ...years];
  }
  return years;
}
