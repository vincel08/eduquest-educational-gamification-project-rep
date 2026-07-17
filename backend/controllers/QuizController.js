import QuizService from '../services/QuizService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const QuizController = {
  async create(req, res, next) {
    try {
      const data = await QuizService.createQuiz(req.body, req.user);
      return successResponse(res, 'Quiz created', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async generate(req, res, next) {
    try {
      const data = await QuizService.generateAiQuiz(req.body, req.user);
      return successResponse(res, 'AI quiz generated', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async listByCourse(req, res, next) {
    try {
      const data = await QuizService.listByCourse(Number(req.params.courseId), req.user);
      return successResponse(res, 'Quizzes retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await QuizService.getQuizById(Number(req.params.id), req.user);
      return successResponse(res, 'Quiz retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await QuizService.updateQuiz(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Quiz updated', data);
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await QuizService.deleteQuiz(Number(req.params.id), req.user);
      return successResponse(res, 'Quiz deleted', {});
    } catch (error) {
      return next(error);
    }
  },

  async addQuestion(req, res, next) {
    try {
      const data = await QuizService.addQuestion(Number(req.params.id), req.body, req.user);
      return successResponse(res, 'Question added', data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async start(req, res, next) {
    try {
      const data = await QuizService.startAttempt(Number(req.params.id), req.user.id);
      return successResponse(res, 'Quiz attempt started', data);
    } catch (error) {
      return next(error);
    }
  },

  async submit(req, res, next) {
    try {
      const data = await QuizService.submitAttempt(
        Number(req.params.attemptId),
        req.body.answers,
        req.user.id
      );
      return successResponse(res, 'Quiz submitted', data);
    } catch (error) {
      return next(error);
    }
  },

  async myAttempts(req, res, next) {
    try {
      const quizId = req.query.quizId ? Number(req.query.quizId) : null;
      const data = await QuizService.getStudentAttempts(req.user.id, quizId);
      return successResponse(res, 'Attempts retrieved', data);
    } catch (error) {
      return next(error);
    }
  },

  async hint(req, res, next) {
    try {
      const data = await QuizService.getHint(req.body.questionText, req.body.topic);
      return successResponse(res, 'Hint generated', data);
    } catch (error) {
      return next(error);
    }
  },

  async attachImage(req, res, next) {
    try {
      if (!req.file) {
        return errorResponse(res, 'Image file is required', 400);
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      const data = await QuizService.attachQuestionImage(
        Number(req.params.questionId),
        imageUrl,
        req.user
      );
      return successResponse(res, 'Question image attached', data);
    } catch (error) {
      return next(error);
    }
  },
};

export default QuizController;
