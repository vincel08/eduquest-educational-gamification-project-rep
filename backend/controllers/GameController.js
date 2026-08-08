import GameService from '../services/GameService.js';
import { successResponse } from '../utils/apiResponse.js';

const GameController = {
  async create(req, res, next) {
    try {
      const data = await GameService.createGame(req.body, req.user);
      return successResponse(res, 'Game created', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async generate(req, res, next) {
    try {
      const data = await GameService.generateAiGame(req.body, req.user);
      return successResponse(res, 'AI game generated', data, 200);
    } catch (error) {
      return next(error);
    }
  },

  async saveGenerated(req, res, next) {
    try {
      const data = await GameService.saveGeneratedGame(req.body, req.user);
      return successResponse(res, 'Game saved', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async listByCourse(req, res, next) {
    try {
      const data = await GameService.listByCourse(Number(req.params.courseId), req.user);
      return successResponse(res, 'Games retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await GameService.getGameById(Number(req.params.id), req.user);
      return successResponse(res, 'Game retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await GameService.updateGame(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Game updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await GameService.deleteGame(Number(req.params.id), req.user);
      return successResponse(res, 'Game deleted', {});
    } catch (error) {
      return next(error);
    }
  },

  async submitScore(req, res, next) {
    try {
      const data = await GameService.submitScore({
        gameId: Number(req.params.id),
        studentId: req.user.id,
        score: req.body.score,
        answers: req.body.answers,
        durationSeconds: req.body.durationSeconds,
      });
      return successResponse(res, 'Score submitted', data);
    } catch (error) {
      return next(error);
    }
  },

  async myScores(req, res, next) {
    try {
      const gameId = req.query.gameId ? Number(req.query.gameId) : null;
      const data = await GameService.getStudentScores(req.user.id, gameId);
      return successResponse(res, 'Scores retrieved', data);
    } catch (error) {
      return next(error);
    }
  },
};

export default GameController;
