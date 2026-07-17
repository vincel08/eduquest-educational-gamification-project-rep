import CourseModel from '../models/CourseModel.js';
import LessonModel from '../models/LessonModel.js';
import NotificationModel from '../models/NotificationModel.js';
import AppError from '../utils/AppError.js';

const CourseService = {
  async createCourse(data, teacherId) {
    return CourseModel.create({ ...data, teacherId });
  },

  async listCourses(filters) {
    return CourseModel.findAll(filters);
  },

  async getCourseById(id) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError('Course not found', 404);

    const lessons = await LessonModel.findByCourse(id);
    return { ...course, lessons };
  },

  async updateCourse(id, data, user) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError('Course not found', 404);

    if (user.role === 'teacher' && course.teacher_id !== user.id) {
      throw new AppError('You can only update your own courses', 403);
    }

    return CourseModel.update(id, data);
  },

  async deleteCourse(id, user) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError('Course not found', 404);

    if (user.role === 'teacher' && course.teacher_id !== user.id) {
      throw new AppError('You can only delete your own courses', 403);
    }

    await CourseModel.delete(id);
    return true;
  },

  async enrollStudent(courseId, studentId) {
    const course = await CourseModel.findById(courseId);
    if (!course || !course.is_published) {
      throw new AppError('Course not available for enrollment', 404);
    }

    await CourseModel.enroll(courseId, studentId);
    await NotificationModel.create({
      userId: studentId,
      title: 'Enrolled in Course',
      message: `You enrolled in "${course.title}".`,
      type: 'course',
      link: `/student/courses/${courseId}`,
    });

    return CourseModel.findById(courseId);
  },

  async getStudentCourses(studentId) {
    return CourseModel.getStudentCourses(studentId);
  },

  async getEnrollments(courseId, user) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);

    if (user.role === 'teacher' && course.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    return CourseModel.getEnrollments(courseId);
  },
};

export default CourseService;
