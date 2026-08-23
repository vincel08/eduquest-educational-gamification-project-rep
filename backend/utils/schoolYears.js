/**
 * Philippine academic school years (June 1 – April 30).
 * Labels look like "2026-2027" (starts June 2026, ends April 2027).
 * May is the break between school years and still belongs to the SY that started the previous June.
 *
 * EduWow launched in SY 2026-2027. A new SY option is added only after the
 * current year ends (June 1 rollover) — never ahead of time.
 * Keep aligned with frontend/src/utils/schoolYears.js.
 */

/** First school-year start year shipped with EduWow. */
export const FIRST_SCHOOL_YEAR_START = 2026;

export function currentSchoolYearStartYear(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based; June = 5
  // June–December → this calendar year's SY start; January–May → previous June's SY.
  return month >= 5 ? year : year - 1;
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
 * List selectable school years from launch through the current SY only.
 * Future years are not listed until the current SY is done (June rollover).
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
