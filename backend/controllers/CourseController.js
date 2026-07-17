import CourseService from '../services/CourseService.js';
import { successResponse } from '../utils/apiResponse.js';

const CourseController = {
  async create(req, res, next) {
    try {
      const data = await CourseService.createCourse(req.body, req.user.id);
      return successResponse(res, 'Course created', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async list(req, res, next) {
    try {
      const filters = {
        ...req.query,
        teacherId: req.user.role === 'teacher' ? req.user.id : req.query.teacherId,
        publishedOnly: req.user.role === 'student' ? true : req.query.publishedOnly === 'true',
      };
      const data = await CourseService.listCourses(filters);
      return successResponse(res, 'Courses retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await CourseService.getCourseById(Number(req.params.id));
      return successResponse(res, 'Course retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await CourseService.updateCourse(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Course updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await CourseService.deleteCourse(Number(req.params.id), req.user);
      return successResponse(res, 'Course deleted', {});
    } catch (error) {
      return next(error);
    }
  },

  async enroll(req, res, next) {
    try {
      const data = await CourseService.enrollStudent(Number(req.params.id), req.user.id);
      return successResponse(res, 'Enrolled successfully', data);
    } catch (error) {
      return next(error);
    }
  },

  async myCourses(req, res, next) {
    try {
      const data = await CourseService.getStudentCourses(req.user.id);
      return successResponse(res, 'Enrolled courses retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async enrollments(req, res, next) {
    try {
      const data = await CourseService.getEnrollments(Number(req.params.id), req.user);
      return successResponse(res, 'Enrollments retrieved', data);
    } catch (error) {
      return next(error);
    }
  },
};

export default CourseController;
