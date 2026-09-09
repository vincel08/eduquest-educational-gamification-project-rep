import CourseModel from "../models/CourseModel.js";
import LessonModel from "../models/LessonModel.js";
import NotificationModel from "../models/NotificationModel.js";
import StudentProfileModel from "../models/StudentProfileModel.js";
import UserModel from "../models/UserModel.js";
import AppError from "../utils/AppError.js";
import {
  GRADE_LEVEL_MISMATCH_MESSAGE,
  GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE,
  gradesMatch,
  normalizeGradeLevel,
} from "../utils/gradeLevels.js";
import {
  COURSE_EXPIRED_MESSAGE,
  defaultCourseSchedule,
  isCourseExpired,
} from "../utils/courseSchedule.js";
import {
  getSchoolYearBounds,
  isValidSchoolYearLabel,
  schoolYearsMatch,
  SCHOOL_YEAR_MISMATCH_MESSAGE,
  SCHOOL_YEAR_REQUIRED_FOR_ACCESS_MESSAGE,
} from "../utils/schoolYears.js";
import ClassSectionService from "./ClassSectionService.js";
import ActivityLogService from "./ActivityLogService.js";

async function getStudentPlacement(studentId) {
  const profile = await StudentProfileModel.findByUserId(studentId);
  return {
    gradeLevel: normalizeGradeLevel(profile?.grade_level),
    schoolYear: String(profile?.school_year || "").trim() || null,
    section: profile?.section || null,
  };
}

function resolveScheduleFields(data = {}) {
  const defaults = defaultCourseSchedule();
  let schoolYear = data.schoolYear
    ? String(data.schoolYear).trim()
    : defaults.schoolYear;
  if (!isValidSchoolYearLabel(schoolYear)) {
    throw new AppError("Please select a valid school year for this subject.", 400);
  }

  let endsAt = data.endsAt || null;
  if (endsAt) {
    const parsed = new Date(endsAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("Invalid subject end date.", 400);
    }
    endsAt = parsed.toISOString().slice(0, 19).replace("T", " ");
  } else {
    endsAt = getSchoolYearBounds(schoolYear).endExclusive;
  }

  return { schoolYear, endsAt };
}

const CourseService = {
  /**
   * If the subject is past ends_at / school-year end, unpublish it (auto-deactivate).
   */
  async deactivateIfExpired(course) {
    if (!course || !course.is_published) return course;
    if (!isCourseExpired(course)) return course;
    return CourseModel.update(course.id, {
      isPublished: false,
      updatedBy: course.updated_by || course.teacher_id,
    });
  },

  async createCourse(data, teacherId, actor = null) {
    const subject = String(data.subject || "").trim();
    const title = String(data.title || subject).trim() || subject;
    const schedule = resolveScheduleFields(data);
    const course = await CourseModel.create({
      ...data,
      ...schedule,
      subject,
      title,
      teacherId,
    });
    await ActivityLogService.log({
      actorId: actor?.id || teacherId || null,
      action: "course.created",
      entityType: "course",
      entityId: course.id,
      summary: `Created subject "${course.title || title}"`,
      metadata: { teacherId, schoolYear: course.school_year || schedule.schoolYear },
    });
    return course;
  },

  async listCourses(filters = {}, user = null) {
    const nextFilters = { ...filters };
    if (user?.role === "student") {
      const placement = await getStudentPlacement(user.id);
      // Incomplete placement → empty catalog.
      if (!placement.gradeLevel || !isValidSchoolYearLabel(placement.schoolYear)) {
        return { courses: [], total: 0 };
      }
      nextFilters.gradeLevel = placement.gradeLevel;
      nextFilters.schoolYear = placement.schoolYear;
      nextFilters.publishedOnly = true;
    }
    const result = await CourseModel.findAll(nextFilters);
    const courses = [];
    for (const course of result.courses) {
      const next = await this.deactivateIfExpired(course);
      if (user?.role === "student" && (!next.is_published || isCourseExpired(next))) {
        continue;
      }
      courses.push(next);
    }
    return { courses, total: courses.length };
  },

  async getCourseById(id, user = null) {
    let course = await CourseModel.findById(id);
    if (!course) throw new AppError("Course not found", 404);
    course = await this.deactivateIfExpired(course);

    if (user?.role === "student") {
      await this.assertStudentCourseAccess(id, user.id);
      course = await CourseModel.findById(id);
    }

    const lessons = await LessonModel.findByCourse(id);
    return { ...course, lessons };
  },

  async updateCourse(id, data, user) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && course.teacher_id !== user.id) {
      throw new AppError("You can only update your own courses", 403);
    }

    const patch = { ...data, updatedBy: user.id };

    if (data.teacherId !== undefined) {
      if (user.role !== "administrator") {
        throw new AppError("Only administrators can reassign subject teachers", 403);
      }
      const nextTeacherId = Number(data.teacherId);
      if (!Number.isInteger(nextTeacherId) || nextTeacherId < 1) {
        throw new AppError("Please select a valid teacher", 400);
      }
      const teacher = await UserModel.findById(nextTeacherId);
      if (!teacher || teacher.role !== "teacher" || !teacher.is_active) {
        throw new AppError("Selected user must be an active teacher", 400);
      }
      patch.teacherId = nextTeacherId;
    }

    if (data.schoolYear !== undefined || data.endsAt !== undefined) {
      const schedule = resolveScheduleFields({
        schoolYear:
          data.schoolYear !== undefined ? data.schoolYear : course.school_year,
        endsAt: data.endsAt !== undefined ? data.endsAt : course.ends_at,
      });
      patch.schoolYear = schedule.schoolYear;
      patch.endsAt = schedule.endsAt;
    }

    // Prevent re-publishing an already-expired subject without extending ends_at.
    if (patch.isPublished) {
      const preview = {
        ...course,
        school_year: patch.schoolYear ?? course.school_year,
        ends_at: patch.endsAt ?? course.ends_at,
      };
      if (isCourseExpired(preview)) {
        throw new AppError(
          "This subject’s end date has passed. Extend the end date or school year before publishing.",
          400,
        );
      }
    }

    const updated = await CourseModel.update(id, patch);
    await ActivityLogService.log({
      actorId: user?.id || null,
      action: "course.updated",
      entityType: "course",
      entityId: id,
      summary: `Updated subject "${updated.title || course.title}"`,
      metadata: {
        published:
          data.isPublished !== undefined
            ? Boolean(data.isPublished)
            : undefined,
      },
    });
    return updated;
  },

  async deleteCourse(id, user) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && course.teacher_id !== user.id) {
      throw new AppError("You can only delete your own courses", 403);
    }

    await CourseModel.delete(id);
    await ActivityLogService.log({
      actorId: user?.id || null,
      action: "course.deleted",
      entityType: "course",
      entityId: id,
      summary: `Deleted subject "${course.title}"`,
    });
    return true;
  },

  async enrollStudent(courseId, studentId) {
    let course = await CourseModel.findById(courseId);
    if (!course) {
      throw new AppError("Course not available for enrollment", 404);
    }
    course = await this.deactivateIfExpired(course);
    if (isCourseExpired(course)) {
      throw new AppError(COURSE_EXPIRED_MESSAGE, 404);
    }
    if (!course.is_published) {
      throw new AppError("Course not available for enrollment", 404);
    }

    const placement = await getStudentPlacement(studentId);
    if (!placement.gradeLevel) {
      throw new AppError(GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE, 400);
    }
    if (!isValidSchoolYearLabel(placement.schoolYear)) {
      throw new AppError(SCHOOL_YEAR_REQUIRED_FOR_ACCESS_MESSAGE, 400);
    }
    if (!gradesMatch(placement.gradeLevel, course.grade_level)) {
      throw new AppError(GRADE_LEVEL_MISMATCH_MESSAGE, 403);
    }
    if (!schoolYearsMatch(placement.schoolYear, course.school_year)) {
      throw new AppError(SCHOOL_YEAR_MISMATCH_MESSAGE, 403);
    }

    await CourseModel.enroll(courseId, studentId);
    await NotificationModel.create({
      userId: studentId,
      title: "Enrolled in Course",
      message: `You enrolled in "${course.title}".`,
      type: "course",
      link: `/student/courses/${courseId}`,
    });

    return CourseModel.findById(courseId);
  },

  /**
   * Teacher/admin removes a student from this subject only (keeps the account).
   * Quiz/game attempt history is retained for records; the student loses access.
   */
  async removeStudent(courseId, studentId, user) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && Number(course.teacher_id) !== Number(user.id)) {
      throw new AppError("Access denied", 403);
    }

    const enrolled = await CourseModel.isEnrolled(courseId, studentId);
    if (!enrolled) {
      throw new AppError("Student is not enrolled in this subject", 404);
    }

    const student = await UserModel.findById(studentId);
    if (!student || student.role !== "student") {
      throw new AppError("Student not found", 404);
    }

    await CourseModel.unenroll(courseId, studentId);

    await NotificationModel.create({
      userId: studentId,
      title: "Removed from subject",
      message: `You were removed from "${course.subject || course.title}".`,
      type: "course",
      link: "/student/courses",
    });

    await ActivityLogService.log({
      actorId: user?.id || null,
      action: "course.student_removed",
      entityType: "course",
      entityId: courseId,
      summary: `Removed ${student.first_name} ${student.last_name} from "${course.subject || course.title}"`,
      metadata: { studentId: Number(studentId) },
    });

    return {
      courseId: Number(courseId),
      studentId: Number(studentId),
    };
  },

  async getStudentCourses(studentId) {
    const placement = await getStudentPlacement(studentId);
    if (
      !placement.gradeLevel ||
      !isValidSchoolYearLabel(placement.schoolYear)
    ) {
      return [];
    }
    const courses = await CourseModel.getStudentCourses(studentId, {
      gradeLevel: placement.gradeLevel,
      schoolYear: placement.schoolYear,
    });
    const visible = [];
    for (const course of courses) {
      const next = await this.deactivateIfExpired(course);
      if (next.is_published && !isCourseExpired(next)) {
        visible.push(next);
      }
    }
    return visible;
  },

  /**
   * Student may use course content only when the subject matches their
   * grade level and school year. Enrollment alone is not enough.
   */
  async assertStudentCourseAccess(courseId, studentId, { requireEnrollment = false } = {}) {
    let course = await CourseModel.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404);
    }
    course = await this.deactivateIfExpired(course);
    if (isCourseExpired(course)) {
      throw new AppError(COURSE_EXPIRED_MESSAGE, 404);
    }
    if (!course.is_published) {
      throw new AppError("Course not found", 404);
    }

    const placement = await getStudentPlacement(studentId);
    if (!placement.gradeLevel) {
      throw new AppError(GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE, 400);
    }
    if (!isValidSchoolYearLabel(placement.schoolYear)) {
      throw new AppError(SCHOOL_YEAR_REQUIRED_FOR_ACCESS_MESSAGE, 400);
    }
    if (!gradesMatch(placement.gradeLevel, course.grade_level)) {
      throw new AppError(GRADE_LEVEL_MISMATCH_MESSAGE, 403);
    }
    if (!schoolYearsMatch(placement.schoolYear, course.school_year)) {
      throw new AppError(SCHOOL_YEAR_MISMATCH_MESSAGE, 403);
    }

    if (requireEnrollment) {
      const enrolled = await CourseModel.isEnrolled(courseId, studentId);
      if (!enrolled) {
        throw new AppError("Course not found", 404);
      }
    }

    return course;
  },

  /**
   * After grade / school year / section changes, drop enrollments that no longer
   * match the student's placement so teacher rosters and student access stay aligned.
   * Quiz/game history is retained; only course_enrollments rows are removed.
   */
  async alignStudentAccessAfterPlacementChange(studentId, actorId = null) {
    const placement = await getStudentPlacement(studentId);
    if (
      !placement.gradeLevel ||
      !isValidSchoolYearLabel(placement.schoolYear)
    ) {
      return { removed: [] };
    }

    const removed = await CourseModel.unenrollWherePlacementMismatch(
      studentId,
      {
        gradeLevel: placement.gradeLevel,
        schoolYear: placement.schoolYear,
      },
    );

    if (removed.length) {
      const subjectNames = removed
        .map((row) => row.subject || row.title)
        .filter(Boolean);
      const preview = subjectNames.slice(0, 3).join(", ");
      const extra =
        subjectNames.length > 3 ? ` and ${subjectNames.length - 3} more` : "";

      await NotificationModel.create({
        userId: studentId,
        title: "Subjects updated",
        message: `Your class placement changed. You were removed from ${preview}${extra}. Browse subjects for your current grade and school year to enroll again.`,
        type: "course",
        link: "/student/courses",
      });

      await ActivityLogService.log({
        actorId: actorId || null,
        action: "course.student_placement_aligned",
        entityType: "user",
        entityId: Number(studentId),
        summary: `Aligned subject access for student #${studentId} after class placement change`,
        metadata: {
          studentId: Number(studentId),
          gradeLevel: placement.gradeLevel,
          schoolYear: placement.schoolYear,
          section: placement.section,
          removedCourseIds: removed.map((row) => Number(row.id)),
        },
      });
    }

    return { removed };
  },

  async getEnrollments(courseId, user, rosterFilters = {}) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && course.teacher_id !== user.id) {
      throw new AppError("Access denied", 403);
    }

    return CourseModel.getEnrollments(courseId, rosterFilters);
  },

  async listTeacherSections(teacherId, filters = {}) {
    const catalog = await ClassSectionService.listOptions(filters);
    if (catalog.length) {
      // Always expose the admin catalog so newly added sections appear system-wide
      // before any students are assigned to them.
      return catalog;
    }
    return CourseModel.listTeacherSections(teacherId, filters);
  },
};

export default CourseService;
