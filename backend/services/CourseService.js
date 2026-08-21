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
} from "../utils/schoolYears.js";
import ClassSectionService from "./ClassSectionService.js";

async function getStudentGradeLevel(studentId) {
  const profile = await StudentProfileModel.findByUserId(studentId);
  return normalizeGradeLevel(profile?.grade_level);
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

  async createCourse(data, teacherId) {
    const subject = String(data.subject || "").trim();
    const title = String(data.title || subject).trim() || subject;
    const schedule = resolveScheduleFields(data);
    return CourseModel.create({
      ...data,
      ...schedule,
      subject,
      title,
      teacherId,
    });
  },

  async listCourses(filters = {}, user = null) {
    const nextFilters = { ...filters };
    if (user?.role === "student") {
      const gradeLevel = await getStudentGradeLevel(user.id);
      // No grade → empty catalog (do not show all-level / other grades).
      if (!gradeLevel) {
        return { courses: [], total: 0 };
      }
      nextFilters.gradeLevel = gradeLevel;
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

    return CourseModel.update(id, patch);
  },

  async deleteCourse(id, user) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && course.teacher_id !== user.id) {
      throw new AppError("You can only delete your own courses", 403);
    }

    await CourseModel.delete(id);
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

    const gradeLevel = await getStudentGradeLevel(studentId);
    if (!gradeLevel) {
      throw new AppError(GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE, 400);
    }
    if (!gradesMatch(gradeLevel, course.grade_level)) {
      throw new AppError(GRADE_LEVEL_MISMATCH_MESSAGE, 403);
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

  async getStudentCourses(studentId) {
    const gradeLevel = await getStudentGradeLevel(studentId);
    if (!gradeLevel) {
      return [];
    }
    const courses = await CourseModel.getStudentCourses(studentId, {
      gradeLevel,
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
   * Student may use course content only when the subject matches their grade.
   * Enrollment alone is not enough (blocks legacy cross-grade enrollments).
   */
  async assertStudentCourseAccess(courseId, studentId) {
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

    const gradeLevel = await getStudentGradeLevel(studentId);
    if (!gradeLevel) {
      throw new AppError(GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE, 400);
    }
    if (!gradesMatch(gradeLevel, course.grade_level)) {
      throw new AppError(GRADE_LEVEL_MISMATCH_MESSAGE, 403);
    }

    return course;
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
      // Prefer catalog names that appear among this teacher's enrolled students when possible.
      const enrolled = await CourseModel.listTeacherSections(teacherId, filters);
      if (!enrolled.length) {
        return catalog;
      }
      const enrolledSet = new Set(enrolled);
      const intersection = catalog.filter((name) => enrolledSet.has(name));
      return intersection.length ? intersection : catalog;
    }
    return CourseModel.listTeacherSections(teacherId, filters);
  },
};

export default CourseService;
