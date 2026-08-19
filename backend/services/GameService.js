import CourseModel from "../models/CourseModel.js";
import LessonModel from "../models/LessonModel.js";
import GameModel from "../models/GameModel.js";
import AiService from "./AiService.js";
import CourseService from "./CourseService.js";
import GamificationService from "./GamificationService.js";
import AppError from "../utils/AppError.js";
import {
  ALL_GAME_TYPES,
  GAME_TYPES,
  isDeprecatedGameType,
  normalizeGameType,
} from "../utils/gameTypes.js";
import { assertGameDataMatchesType } from "../utils/gameDataValidation.js";
import { calculateGameScore, calculateGameXp } from "../utils/gameScoring.js";
import { ensureWordSearchData } from "../utils/wordSearchGrid.js";
import {
  assertContentUnlocked,
  withUnlockState,
} from "../utils/contentUnlock.js";
import { QUIZ_REWARD_SCORE_MIN } from "../utils/quizAttemptRules.js";

function assertCourseAccess(course, user) {
  if (!course) throw new AppError("Course not found", 404);
  if (user.role === "teacher" && course.teacher_id !== user.id) {
    throw new AppError("Access denied", 403);
  }
}

function validateGamePayload(data) {
  if (isDeprecatedGameType(data.gameType)) {
    throw new AppError(
      "This game type is deprecated and cannot be created or updated",
      400,
    );
  }
  const gameType = normalizeGameType(data.gameType) || data.gameType;
  if (!ALL_GAME_TYPES.includes(gameType)) {
    throw new AppError("Invalid game type", 400);
  }
  if (!data.title?.trim()) {
    throw new AppError("Title is required", 400);
  }
  if (!data.gameData || typeof data.gameData !== "object") {
    throw new AppError("gameData is required", 400);
  }
  let gameData = data.gameData;
  if (gameType === "word_search" || gameType === "word_scramble") {
    gameData = ensureWordSearchData(gameData);
    data.gameData = gameData;
  }
  assertGameDataMatchesType(gameType, gameData);
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
        throw new AppError("Lesson not found for this course", 404);
      }
    }

    return GameModel.create({
      courseId: data.courseId,
      lessonId: data.lessonId || null,
      title: data.title,
      description: data.description || null,
      gameType,
      difficulty: data.difficulty || "medium",
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
    let lessonContent = "";
    let topic = payload.topic || course.title;

    if (payload.lessonId) {
      lesson = await LessonModel.findById(payload.lessonId);
      if (!lesson || Number(lesson.course_id) !== Number(payload.courseId)) {
        throw new AppError("Lesson not found for this course", 404);
      }
      topic = lesson.title || topic;
      lessonContent = [
        lesson.title || "",
        lesson.content || "",
        lesson.summary || "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (!lessonContent && payload.lessonContent) {
      lessonContent = String(payload.lessonContent);
    }

    if (!lessonContent && payload.topic) {
      lessonContent = payload.topic;
    }

    if (!lessonContent.trim()) {
      throw new AppError(
        "Select a lesson or provide topic content to generate a game",
        400,
      );
    }

    const requestedType = payload.gameType || "auto";
    if (
      requestedType !== "auto" &&
      !normalizeGameType(requestedType) &&
      !GAME_TYPES.includes(requestedType)
    ) {
      throw new AppError("Unsupported game type", 400);
    }

    const generated = await AiService.generateGame({
      topic,
      gameType: requestedType,
      gradeLevel: payload.gradeLevel || course.grade_level || "junior high school",
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
    return this.createGame(
      {
        ...payload,
        isAiGenerated: true,
        isPublished: payload.isPublished !== false,
      },
      user,
    );
  },

  async getGameById(id, user) {
    const game = await GameModel.findById(id);
    if (!game) throw new AppError("Game not found", 404);

    if (user.role === "student" && !game.is_published) {
      throw new AppError("Game is not available", 403);
    }

    if (user.role === "student") {
      const enrolled = await CourseModel.isEnrolled(game.course_id, user.id);
      if (!enrolled) throw new AppError("Enroll in the course first", 403);
      await CourseService.assertStudentCourseAccess(game.course_id, user.id);
      await assertContentUnlocked({
        courseId: game.course_id,
        lessonId: game.lesson_id,
        studentId: user.id,
        contentLabel: "game",
      });
    }

    return game;
  },

  async listByCourse(courseId, user) {
    if (user.role === "student") {
      await CourseService.assertStudentCourseAccess(courseId, user.id);
    }
    const publishedOnly = user.role === "student";
    const games = await GameModel.findByCourse(courseId, { publishedOnly });
    if (user.role === "student") {
      return withUnlockState(games, user.id);
    }
    return games;
  },

  async updateGame(id, data, user) {
    const game = await GameModel.findById(id);
    if (!game) throw new AppError("Game not found", 404);

    if (user.role === "teacher" && game.teacher_id !== user.id) {
      throw new AppError("Access denied", 403);
    }

    if (data.gameType) {
      data.gameType = validateGamePayload({
        ...data,
        title: data.title || game.title,
        gameData: data.gameData || game.game_data,
      });
    }

    return GameModel.update(id, { ...data, updatedBy: user.id });
  },

  async deleteGame(id, user) {
    const game = await GameModel.findById(id);
    if (!game) throw new AppError("Game not found", 404);

    if (user.role === "teacher" && game.teacher_id !== user.id) {
      throw new AppError("Access denied", 403);
    }

    await GameModel.delete(id);
    return true;
  },

  async submitScore({ gameId, studentId, score, answers, durationSeconds }) {
    const game = await GameModel.findById(gameId);
    if (!game || !game.is_published) {
      throw new AppError("Game not available", 404);
    }

    const enrolled = await CourseModel.isEnrolled(game.course_id, studentId);
    if (!enrolled) throw new AppError("Enroll in the course first", 403);

    await CourseService.assertStudentCourseAccess(game.course_id, studentId);

    await assertContentUnlocked({
      courseId: game.course_id,
      lessonId: game.lesson_id,
      studentId,
      contentLabel: "game",
    });

    // Reject absurd client scores even before answer validation.
    if (score != null && Number(score) > 100) {
      throw new AppError("Invalid score", 400);
    }

    // Server recomputes score from answers + authoritative game_data.
    const normalizedScore = calculateGameScore(
      game.game_type,
      game.game_data,
      answers,
    );
    const computedXp = calculateGameXp(normalizedScore, game.xp_reward);

    let xpAward = null;
    let xpEarned = 0;
    let xpAlreadyAwarded = false;

    if (computedXp > 0) {
      const xpResult = await GamificationService.awardXpOnce({
        studentId,
        amount: computedXp,
        sourceType: "game",
        sourceId: gameId,
        description: `Played game: ${game.title}`,
        evaluateAchievements: false,
      });
      xpAlreadyAwarded = Boolean(xpResult.alreadyAwarded);
      if (!xpResult.alreadyAwarded) {
        xpAward = xpResult.xpAward;
        xpEarned = computedXp;
      }
    }

    if (normalizedScore >= QUIZ_REWARD_SCORE_MIN) {
      const newlyUnlocked =
        await GamificationService.evaluateAchievements(studentId);
      if (xpAward) {
        xpAward = { ...xpAward, newlyUnlocked };
      } else if (newlyUnlocked.badges.length || newlyUnlocked.medals.length) {
        xpAward = { newlyUnlocked };
      }
    }

    const saved = await GameModel.saveScore({
      gameId,
      studentId,
      score: normalizedScore,
      xpEarned,
      durationSeconds: durationSeconds || null,
    });

    return {
      score: saved,
      xpAward,
      xpAlreadyAwarded,
      computedXp,
      serverScore: normalizedScore,
    };
  },

  async getStudentScores(studentId, gameId = null) {
    return GameModel.getStudentScores(studentId, gameId);
  },
};

export default GameService;
