import LessonService from '../services/LessonService.js';
import { successResponse } from '../utils/apiResponse.js';

const LessonController = {
  async create(req, res, next) {
    try {
      const data = await LessonService.createLesson(
        Number(req.params.courseId),
        req.body,
        req.user
      );
      return successResponse(res, 'Lesson created', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async listByCourse(req, res, next) {
    try {
      const data = await LessonService.getLessonsByCourse(
        Number(req.params.courseId),
        req.user
      );
      return successResponse(res, 'Lessons retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await LessonService.getLessonById(Number(req.params.id), req.user);
      return successResponse(res, 'Lesson retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await LessonService.updateLesson(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Lesson updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await LessonService.deleteLesson(Number(req.params.id), req.user);
      return successResponse(res, 'Lesson deleted', {});
    } catch (error) {
      return next(error);
    }
  },

  async complete(req, res, next) {
    try {
      const data = await LessonService.completeLesson(Number(req.params.id), req.user.id);
      return successResponse(res, 'Lesson completed', data);
    } catch (error) {
      return next(error);
    }
  },

  async uploadMaterial(req, res, next) {
    try {
      const data = await LessonService.uploadMaterial(
        Number(req.params.id),
        req.file,
        req.user
      );
      return successResponse(res, 'Material uploaded', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async deleteMaterial(req, res, next) {
    try {
      await LessonService.deleteMaterial(Number(req.params.materialId), req.user);
      return successResponse(res, 'Material deleted', {});
    } catch (error) {
      return next(error);
    }
  },
};

export default LessonController;
