import CourseModel from "../models/CourseModel.js";
import LessonModel from "../models/LessonModel.js";
import NotificationModel from "../models/NotificationModel.js";
import StudentProfileModel from "../models/StudentProfileModel.js";
import AppError from "../utils/AppError.js";
import {
  GRADE_LEVEL_MISMATCH_MESSAGE,
  GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE,
  gradesMatch,
  normalizeGradeLevel,
} from "../utils/gradeLevels.js";

async function getStudentGradeLevel(studentId) {
  const profile = await StudentProfileModel.findByUserId(studentId);
  return normalizeGradeLevel(profile?.grade_level);
}

const CourseService = {
  async createCourse(data, teacherId) {
    const subject = String(data.subject || "").trim();
    const title = String(data.title || subject).trim() || subject;
    return CourseModel.create({
      ...data,
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
    return CourseModel.findAll(nextFilters);
  },

  async getCourseById(id, user = null) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError("Course not found", 404);

    if (user?.role === "student") {
      await this.assertStudentCourseAccess(id, user.id);
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

    return CourseModel.update(id, { ...data, updatedBy: user.id });
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
    const course = await CourseModel.findById(courseId);
    if (!course || !course.is_published) {
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
    return CourseModel.getStudentCourses(studentId, { gradeLevel });
  },

  /**
   * Student may use course content only when the subject matches their grade.
   * Enrollment alone is not enough (blocks legacy cross-grade enrollments).
   */
  async assertStudentCourseAccess(courseId, studentId) {
    const course = await CourseModel.findById(courseId);
    if (!course || !course.is_published) {
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

  async getEnrollments(courseId, user) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && course.teacher_id !== user.id) {
      throw new AppError("Access denied", 403);
    }

    return CourseModel.getEnrollments(courseId);
  },
};

export default CourseService;
