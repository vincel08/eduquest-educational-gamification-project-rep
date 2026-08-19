import {
  formatSchoolYearLabel,
  getSchoolYearBounds,
  isValidSchoolYearLabel,
  currentSchoolYearStartYear,
} from "./schoolYears.js";

export const COURSE_EXPIRED_MESSAGE =
  "This subject has ended for the school year and is no longer available.";

/**
 * Resolve the exclusive end datetime for a course (auto-deactivate boundary).
 * Prefer explicit ends_at; otherwise derive from school_year (May 1 exclusive).
 */
export function resolveCourseEndsAt(course, now = new Date()) {
  if (!course) return null;
  if (course.ends_at) {
    const explicit = new Date(course.ends_at);
    if (!Number.isNaN(explicit.getTime())) return explicit;
  }
  const label =
    course.school_year && isValidSchoolYearLabel(course.school_year)
      ? course.school_year
      : formatSchoolYearLabel(currentSchoolYearStartYear(now));
  return new Date(getSchoolYearBounds(label, now).endExclusive);
}

export function isCourseExpired(course, now = new Date()) {
  const endsAt = resolveCourseEndsAt(course, now);
  if (!endsAt) return false;
  return now.getTime() >= endsAt.getTime();
}

/** Default school year + ends_at for new subjects. */
export function defaultCourseSchedule(now = new Date()) {
  const bounds = getSchoolYearBounds(null, now);
  return {
    schoolYear: bounds.label,
    endsAt: bounds.endExclusive,
  };
}
