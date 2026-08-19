/**
 * Philippine academic school years (June 1 – April 30).
 * Labels look like "2025-2026" (starts June 2025, ends April 2026).
 * May is the break between school years and still belongs to the SY that started the previous June.
 */

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

export function listSchoolYearOptions({
  count = 1,
  includeAll = true,
  now = new Date(),
} = {}) {
  const currentStart = currentSchoolYearStartYear(now);
  const years = [];
  // Current SY and optional future years only — never past school years.
  const safeCount = Math.max(1, Number(count) || 1);
  for (let i = 0; i < safeCount; i += 1) {
    const startYear = currentStart + i;
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
