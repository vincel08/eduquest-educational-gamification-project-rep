/**
 * Philippine academic school years (June 1 – April 30).
 * Keep aligned with backend/utils/schoolYears.js.
 * Labels look like "2026-2027" (starts June, ends April).
 *
 * EduWow launched in SY 2026-2027. Until an administrator sets a school year,
 * the current year follows the June 1 rollover.
 */

/** First school-year start year shipped with EduWow. */
export const FIRST_SCHOOL_YEAR_START = 2026;

/** Label set by the server. Null uses the calendar rollover. */
let configuredLabel = null;

export function calendarSchoolYearStartYear(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based; June = 5
  // June–December → this calendar year's SY start; January–May → previous June's SY.
  return month >= 5 ? year : year - 1;
}

export function applyConfiguredSchoolYear(label) {
  configuredLabel = isValidSchoolYearLabel(label) ? String(label).trim() : null;
}

export function currentSchoolYearStartYear(now = new Date()) {
  const configured = parseSchoolYearLabel(configuredLabel);
  if (configured) return configured;
  return calendarSchoolYearStartYear(now);
}

export function formatSchoolYearLabel(startYear) {
  const start = Number(startYear);
  return `${start}-${start + 1}`;
}

export function isValidSchoolYearLabel(label) {
  return Boolean(parseSchoolYearLabel(label));
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
 * The current SY is the administrator setting when the app has loaded it.
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

export function defaultSchoolYearValue(now = new Date()) {
  return formatSchoolYearLabel(currentSchoolYearStartYear(now));
}
