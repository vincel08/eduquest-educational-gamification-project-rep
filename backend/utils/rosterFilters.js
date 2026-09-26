/**
 * Shared helpers for School Year / Level / Section roster filters.
 */

export function normalizeRosterFilterValue(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized === "all") return null;
  return normalized;
}

/**
 * Append student_profiles roster filters.
 * @param {string[]} filters - SQL AND clauses (mutated)
 * @param {object} params - Named query params (mutated)
 * @param {{ schoolYear?: string, gradeLevel?: string, section?: string }} options
 * @param {string} [alias='sp']
 */
export function appendStudentRosterFilters(
  filters,
  params,
  options = {},
  alias = "sp",
) {
  const schoolYear = normalizeRosterFilterValue(options.schoolYear);
  const gradeLevel = normalizeRosterFilterValue(options.gradeLevel);
  const section = normalizeRosterFilterValue(options.section);

  if (schoolYear) {
    filters.push(`(
      ${alias}.school_year = :rosterSchoolYear
      OR EXISTS (
        SELECT 1
        FROM course_enrollments ce_hist
        INNER JOIN courses c_hist ON c_hist.id = ce_hist.course_id
        WHERE ce_hist.student_id = ${alias}.user_id
          AND (
            ce_hist.school_year = :rosterSchoolYear
            OR (
              (ce_hist.school_year IS NULL OR TRIM(ce_hist.school_year) = '')
              AND c_hist.school_year = :rosterSchoolYear
            )
          )
      )
    )`);
    params.rosterSchoolYear = schoolYear;
  }
  if (gradeLevel) {
    filters.push(`${alias}.grade_level = :rosterGradeLevel`);
    params.rosterGradeLevel = gradeLevel;
  }
  if (section) {
    filters.push(`${alias}.section = :rosterSection`);
    params.rosterSection = section;
  }

  return { schoolYear, gradeLevel, section };
}

export function hasRosterFilters(options = {}) {
  return Boolean(
    normalizeRosterFilterValue(options.schoolYear) ||
      normalizeRosterFilterValue(options.gradeLevel) ||
      normalizeRosterFilterValue(options.section),
  );
}
