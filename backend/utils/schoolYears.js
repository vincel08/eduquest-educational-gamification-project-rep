/**
 * Academic school years (June 1 – May 31).
 * Labels look like "2025-2026".
 */

export function currentSchoolYearStartYear(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based; June = 5
  return month >= 5 ? year : year - 1;
}

export function formatSchoolYearLabel(startYear) {
  const start = Number(startYear);
  return `${start}-${start + 1}`;
}

export function parseSchoolYearLabel(label) {
  if (!label || label === 'all') return null;
  const match = String(label).trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (!Number.isInteger(startYear) || endYear !== startYear + 1) return null;
  return startYear;
}

/** Inclusive start / exclusive end as MySQL DATETIME strings. */
export function getSchoolYearBounds(label, now = new Date()) {
  const startYear = parseSchoolYearLabel(label) ?? currentSchoolYearStartYear(now);
  const start = `${startYear}-06-01 00:00:00`;
  const endExclusive = `${startYear + 1}-06-01 00:00:00`;
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

export function listSchoolYearOptions({ count = 4, includeAll = true, now = new Date() } = {}) {
  const currentStart = currentSchoolYearStartYear(now);
  const years = [];
  for (let i = 0; i < count; i += 1) {
    const startYear = currentStart - i;
    years.push({
      value: formatSchoolYearLabel(startYear),
      label: `SY ${formatSchoolYearLabel(startYear)}`,
    });
  }
  if (includeAll) {
    return [{ value: 'all', label: 'All school years' }, ...years];
  }
  return years;
}
