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

  async copy(req, res, next) {
    try {
      const data = await GameService.copyGame(
        Number(req.params.id),
        req.body,
        req.user,
      );
      return successResponse(res, 'Game copied into subject', data, 201);
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

  async listMine(req, res, next) {
    try {
      const data = await GameService.listForTeacher(req.user, {
        gradeLevel: req.query.gradeLevel,
        schoolYear: req.query.schoolYear || "all",
      });
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

  async releaseGrade(req, res, next) {
    try {
      const data = await GameService.releaseGradeToTeacher(
        Number(req.params.id),
        req.user.id,
      );
      return successResponse(res, 'Game grade submitted to teacher', data);
    } catch (error) {
      return next(error);
    }
  },

  async scoreReview(req, res, next) {
    try {
      const data = await GameService.getScoreReview(
        Number(req.params.id),
        Number(req.params.scoreId),
        req.user,
      );
      return successResponse(res, 'Game score review retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async listOverrides(req, res, next) {
    try {
      const data = await GameService.listStudentOverrides(
        Number(req.params.id),
        req.user,
      );
      return successResponse(res, 'Game overrides retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async grantOverride(req, res, next) {
    try {
      const data = await GameService.grantStudentOverride(
        Number(req.params.id),
        req.body,
        req.user,
      );
      return successResponse(res, 'Game access extended for student', data);
    } catch (error) {
      return next(error);
    }
  },

  async removeOverride(req, res, next) {
    try {
      await GameService.removeStudentOverride(
        Number(req.params.id),
        Number(req.params.studentId),
        req.user,
      );
      return successResponse(res, 'Game override removed', {});
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
