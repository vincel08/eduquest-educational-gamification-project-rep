import AiReviewService from '../services/AiReviewService.js';
import { successResponse } from '../utils/apiResponse.js';

const AiReviewController = {
  async list(req, res, next) {
    try {
      const data = await AiReviewService.listDrafts(req.user, req.query);
      return successResponse(res, 'AI review drafts retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await AiReviewService.getDraft(Number(req.params.id), req.user);
      return successResponse(res, 'AI review draft retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async createFromQuiz(req, res, next) {
    try {
      const data = await AiReviewService.createFromQuizGenerate(req.body, req.user);
      return successResponse(res, 'AI quiz ready for review', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async createFromGame(req, res, next) {
    try {
      const data = await AiReviewService.createFromGameGenerate(req.body, req.user);
      return successResponse(res, 'AI game ready for review', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async createFromContent(req, res, next) {
    try {
      const data = await AiReviewService.createFromAiContent(req.body, req.user);
      return successResponse(res, 'AI content ready for review', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await AiReviewService.updateDraft(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Draft updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async saveDraft(req, res, next) {
    try {
      const data = await AiReviewService.saveDraft(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Draft saved', data);
    } catch (error) {
      return next(error);
    }
  },

  async publish(req, res, next) {
    try {
      const data = await AiReviewService.publishDraft(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Content published', data);
    } catch (error) {
      return next(error);
    }
  },

  async discard(req, res, next) {
    try {
      const data = await AiReviewService.discardDraft(Number(req.params.id), req.user);
      return successResponse(res, 'Draft discarded', data);
    } catch (error) {
      return next(error);
    }
  },

  async regenerate(req, res, next) {
    try {
      const data = await AiReviewService.regenerate(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Content regenerated', data);
    } catch (error) {
      return next(error);
    }
  },

  async transform(req, res, next) {
    try {
      const data = await AiReviewService.transform(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Content transformed', data);
    } catch (error) {
      return next(error);
    }
  },
};

export default AiReviewController;
