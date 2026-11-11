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

/** Earliest school year an administrator may add for older records. */
export const MANAGED_SCHOOL_YEAR_MIN = 2000;

/** How many school years past the system year an administrator may add. */
export const MANAGED_FUTURE_YEARS = 15;

/** Labels from the server catalog. Null keeps the generated launch-through-current list. */
let catalogLabels = null;

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

/** Store the managed school-year list from the server. Does not change the current setting. */
export function applySchoolYearCatalog(options) {
  const seen = new Set();
  const labels = [];
  for (const option of options || []) {
    const value = String(
      typeof option === "string" ? option : option?.value || "",
    ).trim();
    if (!isValidSchoolYearLabel(value) || seen.has(value)) continue;
    seen.add(value);
    labels.push(value);
  }
  labels.sort((left, right) => parseSchoolYearLabel(left) - parseSchoolYearLabel(right));
  catalogLabels = labels.length ? labels : null;
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

export function schoolYearTiming(label, now = new Date()) {
  const startYear = parseSchoolYearLabel(label);
  if (!startYear) return null;
  const calendarStart = calendarSchoolYearStartYear(now);
  if (startYear < calendarStart) return "previous";
  if (startYear > calendarStart) return "future";
  return "current";
}

export function normalizeManagedSchoolYear(value) {
  const raw = String(value || "").trim();
  if (isValidSchoolYearLabel(raw)) return raw;
  if (/^\d{4}$/.test(raw)) return formatSchoolYearLabel(Number(raw));
  return raw;
}

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
  const years = [];
  if (catalogLabels) {
    for (const value of catalogLabels) {
      years.push({ value, label: `SY ${value}` });
    }
  } else {
    const currentStart = currentSchoolYearStartYear(now);
    const launch = Number.isInteger(Number(firstStartYear))
      ? Number(firstStartYear)
      : FIRST_SCHOOL_YEAR_START;
    const from = Math.min(launch, currentStart);
    const to = currentStart;
    for (let startYear = from; startYear <= to; startYear += 1) {
      years.push({
        value: formatSchoolYearLabel(startYear),
        label: `SY ${formatSchoolYearLabel(startYear)}`,
      });
    }
  }

  if (includeAll) {
    return [{ value: "all", label: "All school years" }, ...years];
  }
  return years;
}

export function defaultSchoolYearValue(now = new Date()) {
  return formatSchoolYearLabel(currentSchoolYearStartYear(now));
}

/** True when a select value is not in the loaded school-year menu. */
export function schoolYearChoiceMissing(options, value) {
  const selected = String(value || "").trim();
  if (!selected) return false;
  return !(options || []).some((option) => option.value === selected);
}
