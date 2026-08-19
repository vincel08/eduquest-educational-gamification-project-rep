/**
 * Academic school years (June 1 – May 31). Keep aligned with backend/utils/schoolYears.js.
 */

export function currentSchoolYearStartYear(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
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

export function defaultSchoolYearValue(now = new Date()) {
  return formatSchoolYearLabel(currentSchoolYearStartYear(now));
}
