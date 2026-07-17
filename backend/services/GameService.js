import CourseModel from '../models/CourseModel.js';
import LessonModel from '../models/LessonModel.js';
import GameModel from '../models/GameModel.js';
import AiService from './AiService.js';
import GamificationService from './GamificationService.js';
import AppError from '../utils/AppError.js';
import { ALL_GAME_TYPES, GAME_TYPES, normalizeGameType } from '../utils/gameTypes.js';

function assertCourseAccess(course, user) {
  if (!course) throw new AppError('Course not found', 404);
  if (user.role === 'teacher' && course.teacher_id !== user.id) {
    throw new AppError('Access denied', 403);
  }
}

function validateGamePayload(data) {
  const gameType = normalizeGameType(data.gameType) || data.gameType;
  if (!ALL_GAME_TYPES.includes(gameType)) {
    throw new AppError('Invalid game type', 400);
  }
  if (!data.title?.trim()) {
    throw new AppError('Title is required', 400);
  }
  if (!data.gameData || typeof data.gameData !== 'object') {
    throw new AppError('gameData is required', 400);
  }
  return gameType;
}

const GameService = {
  async createGame(data, user) {
    const course = await CourseModel.findById(data.courseId);
    assertCourseAccess(course, user);

    const gameType = validateGamePayload(data);

    if (data.lessonId) {
      const lesson = await LessonModel.findById(data.lessonId);
      if (!lesson || Number(lesson.course_id) !== Number(data.courseId)) {
        throw new AppError('Lesson not found for this course', 404);
      }
    }

    return GameModel.create({
      courseId: data.courseId,
      lessonId: data.lessonId || null,
      title: data.title,
      description: data.description || null,
      gameType,
      difficulty: data.difficulty || 'medium',
      estimatedTime: data.estimatedTime || 10,
      gameData: data.gameData,
      xpReward: data.xpReward || 100,
      isAiGenerated: Boolean(data.isAiGenerated),
      isPublished: Boolean(data.isPublished),
      createdBy: user.id,
    });
  },

  async generateAiGame(payload, user) {
    const course = await CourseModel.findById(payload.courseId);
    assertCourseAccess(course, user);

    let lesson = null;
    let lessonContent = '';
    let topic = payload.topic || course.title;

    if (payload.lessonId) {
      lesson = await LessonModel.findById(payload.lessonId);
      if (!lesson || Number(lesson.course_id) !== Number(payload.courseId)) {
        throw new AppError('Lesson not found for this course', 404);
      }
      topic = lesson.title || topic;
      lessonContent = [
        lesson.title || '',
        lesson.content || '',
        lesson.summary || '',
      ].filter(Boolean).join('\n\n');
    }

    if (!lessonContent && payload.topic) {
      lessonContent = payload.topic;
    }

    if (!lessonContent.trim()) {
      throw new AppError('Select a lesson or provide topic content to generate a game', 400);
    }

    const requestedType = payload.gameType || 'auto';
    if (requestedType !== 'auto' && !normalizeGameType(requestedType) && !GAME_TYPES.includes(requestedType)) {
      throw new AppError('Unsupported game type', 400);
    }

    const generated = await AiService.generateGame({
      topic,
      gameType: requestedType,
      gradeLevel: payload.gradeLevel || course.grade_level || 'high school',
      lessonContent,
    });

    return {
      courseId: Number(payload.courseId),
      lessonId: payload.lessonId ? Number(payload.lessonId) : null,
      title: generated.title,
      description: generated.description,
      gameType: generated.gameType,
      difficulty: generated.difficulty,
      estimatedTime: generated.estimatedTime,
      xpReward: generated.xpReward,
      gameData: generated.gameData,
      isAiGenerated: true,
      isPublished: false,
      source: generated.source,
      warning: generated.warning || null,
    };
  },

  async saveGeneratedGame(payload, user) {
    return this.createGame({
      ...payload,
      isAiGenerated: true,
      isPublished: payload.isPublished !== false,
    }, user);
  },

  async getGameById(id, user) {
    const game = await GameModel.findById(id);
    if (!game) throw new AppError('Game not found', 404);

    if (user.role === 'student' && !game.is_published) {
      throw new AppError('Game is not available', 403);
    }

    return game;
  },

  async listByCourse(courseId, user) {
    const publishedOnly = user.role === 'student';
    return GameModel.findByCourse(courseId, { publishedOnly });
  },

  async updateGame(id, data, user) {
    const game = await GameModel.findById(id);
    if (!game) throw new AppError('Game not found', 404);

    if (user.role === 'teacher' && game.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    if (data.gameType) {
      data.gameType = validateGamePayload({ ...data, title: data.title || game.title, gameData: data.gameData || game.game_data });
    }

    return GameModel.update(id, data);
  },

  async deleteGame(id, user) {
    const game = await GameModel.findById(id);
    if (!game) throw new AppError('Game not found', 404);

    if (user.role === 'teacher' && game.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    await GameModel.delete(id);
    return true;
  },

  async submitScore({ gameId, studentId, score, durationSeconds }) {
    const game = await GameModel.findById(gameId);
    if (!game || !game.is_published) {
      throw new AppError('Game not available', 404);
    }

    const enrolled = await CourseModel.isEnrolled(game.course_id, studentId);
    if (!enrolled) throw new AppError('Enroll in the course first', 403);

    const normalizedScore = Math.max(0, Number(score) || 0);
    const xpEarned = normalizedScore >= 70
      ? game.xp_reward
      : Math.floor(game.xp_reward * (normalizedScore / 100));

    const saved = await GameModel.saveScore({
      gameId,
      studentId,
      score: normalizedScore,
      xpEarned,
      durationSeconds: durationSeconds || null,
    });

    let xpAward = null;
    if (xpEarned > 0) {
      xpAward = await GamificationService.awardXp({
        studentId,
        amount: xpEarned,
        sourceType: 'game',
        sourceId: gameId,
        description: `Played game: ${game.title}`,
      });
    }

    return { score: saved, xpAward };
  },

  async getStudentScores(studentId, gameId = null) {
    return GameModel.getStudentScores(studentId, gameId);
  },
};

export default GameService;
