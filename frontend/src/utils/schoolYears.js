/**
 * Philippine academic school years (June 1 – April 30).
 * Keep aligned with backend/utils/schoolYears.js.
 * Labels look like "2025-2026" (starts June, ends April).
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

export function listSchoolYearOptions({
  count = 1,
  pastCount = 0,
  includeAll = true,
  now = new Date(),
} = {}) {
  const currentStart = currentSchoolYearStartYear(now);
  const years = [];
  // Current SY and optional future years; pastCount adds prior years (admin filters).
  const safeCount = Math.max(1, Number(count) || 1);
  const safePast = Math.max(0, Number(pastCount) || 0);
  for (let i = -safePast; i < safeCount; i += 1) {
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

export function defaultSchoolYearValue(now = new Date()) {
  return formatSchoolYearLabel(currentSchoolYearStartYear(now));
}
