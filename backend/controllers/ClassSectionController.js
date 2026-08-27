import ClassSectionService from "../services/ClassSectionService.js";
import { successResponse } from "../utils/apiResponse.js";

const ClassSectionController = {
  async list(req, res, next) {
    try {
      const data = await ClassSectionService.list(req.query);
      return successResponse(res, "Class sections retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async options(req, res, next) {
    try {
      const data = await ClassSectionService.listOptions({
        schoolYear: req.query.schoolYear,
        gradeLevel: req.query.gradeLevel,
      });
      return successResponse(res, "Section options retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await ClassSectionService.getById(Number(req.params.id));
      return successResponse(res, "Class section retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const data = await ClassSectionService.create(req.body, req.user);
      return successResponse(res, "Class section created", data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await ClassSectionService.update(
        Number(req.params.id),
        req.body,
        req.user,
      );
      return successResponse(res, "Class section updated", data);
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await ClassSectionService.remove(Number(req.params.id), req.user);
      return successResponse(res, "Class section deleted", {});
    } catch (error) {
      return next(error);
    }
  },
};

export default ClassSectionController;
