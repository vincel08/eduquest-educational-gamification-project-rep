import CourseModel from "../models/CourseModel.js";
import LessonModel from "../models/LessonModel.js";
import GameModel from "../models/GameModel.js";
import GameStudentOverrideModel from "../models/GameStudentOverrideModel.js";
import NotificationModel from "../models/NotificationModel.js";
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
import { buildGameAnswerReviewItems } from "../utils/gameAnswerReview.js";
import { ensureWordSearchData } from "../utils/wordSearchGrid.js";
import {
  assertContentUnlocked,
  withUnlockState,
} from "../utils/contentUnlock.js";
import { QUIZ_REWARD_SCORE_MIN } from "../utils/quizAttemptRules.js";
import {
  assertGameAttemptsAvailable,
  buildGameAttemptMeta,
  MAX_GAME_ATTEMPTS,
  MAX_GAME_EXTRA_ATTEMPTS_GRANT,
} from "../utils/gameAttemptRules.js";

function assertCourseAccess(course, user) {
  if (!course) throw new AppError("Course not found", 404);
  if (user.role === "teacher" && course.teacher_id !== user.id) {
    throw new AppError("Access denied", 403);
  }
}

async function assertTeacherOwnsGame(gameId, user) {
  const game = await GameModel.findById(gameId);
  if (!game) throw new AppError("Game not found", 404);
  if (user.role === "teacher" && game.teacher_id !== user.id) {
    throw new AppError("Access denied", 403);
  }
  return game;
}

async function getStudentExtraAttempts(gameId, studentId) {
  const override = await GameStudentOverrideModel.findByGameAndStudent(
    gameId,
    studentId,
  );
  return Number(override?.extra_attempts || 0);
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

  /**
   * Deep-copy a game into a target course (bank reuse).
   * Creates an independent draft with cloned game_data JSON.
   */
  async copyGame(sourceId, payload, user) {
    const source = await assertTeacherOwnsGame(sourceId, user);
    const courseId = Number(payload.courseId);
    if (!courseId) throw new AppError("courseId is required", 400);

    const gameData =
      source.game_data && typeof source.game_data === "object"
        ? JSON.parse(JSON.stringify(source.game_data))
        : source.game_data;
    if (!gameData || typeof gameData !== "object") {
      throw new AppError("This game has no content to reuse.", 400);
    }

    const title = String(payload.title || "").trim()
      || `${source.title} (Copy)`;

    let lessonId = null;
    if (payload.lessonId != null && payload.lessonId !== "") {
      lessonId = Number(payload.lessonId);
    }

    return this.createGame(
      {
        courseId,
        lessonId,
        title,
        description: source.description || null,
        gameType: source.game_type,
        difficulty: source.difficulty || "medium",
        estimatedTime: source.estimated_time || 10,
        gameData,
        xpReward: source.xp_reward || 100,
        isAiGenerated: Boolean(source.is_ai_generated),
        isPublished: false,
      },
      user,
    );
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
      const attemptsUsed = await GameModel.countStudentPlays(id, user.id);
      const extraAttempts = await getStudentExtraAttempts(id, user.id);
      const attemptMeta = buildGameAttemptMeta({ attemptsUsed, extraAttempts });
      const best = await GameModel.findBestScore(id, user.id);
      const bestScore = best ? Number(best.score) : null;
      const gradeReleased = await GameModel.hasReleasedScore(id, user.id);
      const unavailable = attemptMeta.outOfAttempts || gradeReleased;
      return {
        ...game,
        ...attemptMeta,
        maxGameAttempts: MAX_GAME_ATTEMPTS,
        bestScore,
        hasPassed: bestScore != null && bestScore >= 70,
        hasAttempted: Boolean(best),
        gradeReleased,
        unavailable,
      };
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
      const unlocked = await withUnlockState(games, user.id);
      return Promise.all(
        unlocked.map(async (game) => {
          const attemptsUsed = await GameModel.countStudentPlays(
            game.id,
            user.id,
          );
          const extraAttempts = await getStudentExtraAttempts(game.id, user.id);
          const attemptMeta = buildGameAttemptMeta({
            attemptsUsed,
            extraAttempts,
          });
          const best = await GameModel.findBestScore(game.id, user.id);
          const bestScore = best ? Number(best.score) : null;
          const gradeReleased = await GameModel.hasReleasedScore(
            game.id,
            user.id,
          );
          const unavailable = attemptMeta.outOfAttempts || gradeReleased;
          return {
            ...game,
            ...attemptMeta,
            maxGameAttempts: MAX_GAME_ATTEMPTS,
            bestScore,
            hasPassed: bestScore != null && bestScore >= 70,
            hasAttempted: Boolean(best),
            gradeReleased,
            unavailable,
          };
        }),
      );
    }
    return games;
  },

  async listForTeacher(user, filters = {}) {
    if (user.role !== "teacher" && user.role !== "administrator") {
      throw new AppError("Access denied", 403);
    }

    // Bank includes all school years by default (schoolYear=all or omitted).
    return GameModel.findBankForTeacher({
      teacherId: user.role === "teacher" ? user.id : undefined,
      gradeLevel: filters.gradeLevel,
      schoolYear: filters.schoolYear,
    });
  },

  async updateGame(id, data, user) {
    const game = await GameModel.findById(id);
    if (!game) throw new AppError("Game not found", 404);

    if (user.role === "teacher" && game.teacher_id !== user.id) {
      throw new AppError("Access denied", 403);
    }

    if (data.gameType || data.gameData) {
      data.gameType = validateGamePayload({
        ...data,
        title: data.title || game.title,
        gameType: data.gameType || game.game_type,
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

    const attemptsUsed = await GameModel.countStudentPlays(gameId, studentId);
    const extraAttempts = await getStudentExtraAttempts(gameId, studentId);

    const gradeReleased = await GameModel.hasReleasedScore(gameId, studentId);
    if (gradeReleased) {
      throw new AppError(
        "You already submitted this game grade. It is no longer available.",
        403,
      );
    }

    const attemptMeta = assertGameAttemptsAvailable(attemptsUsed, extraAttempts);

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
      answers,
      releasedToGradebook: false,
    });

    const nextMeta = buildGameAttemptMeta({
      attemptsUsed: attemptMeta.attemptsUsed + 1,
      extraAttempts,
    });

    let releasedToGradebook = false;
    if (nextMeta.outOfAttempts || nextMeta.attemptsRemaining <= 0) {
      await GameModel.releaseStudentScores(gameId, studentId);
      releasedToGradebook = true;
    }

    return {
      score: saved,
      xpAward,
      xpAlreadyAwarded,
      computedXp,
      serverScore: normalizedScore,
      releasedToGradebook,
      ...nextMeta,
      maxGameAttempts: MAX_GAME_ATTEMPTS,
    };
  },

  async releaseGradeToTeacher(gameId, studentId) {
    const game = await GameModel.findById(gameId);
    if (!game || !game.is_published) {
      throw new AppError("Game not available", 404);
    }

    const enrolled = await CourseModel.isEnrolled(game.course_id, studentId);
    if (!enrolled) throw new AppError("Enroll in the course first", 403);
    await CourseService.assertStudentCourseAccess(game.course_id, studentId);

    const attemptsUsed = await GameModel.countStudentPlays(gameId, studentId);
    if (attemptsUsed <= 0) {
      throw new AppError("Play at least once before submitting your grade", 400);
    }

    await GameModel.releaseStudentScores(gameId, studentId);
    const best = await GameModel.findBestScore(gameId, studentId);
    const extraAttempts = await getStudentExtraAttempts(gameId, studentId);
    const attemptMeta = buildGameAttemptMeta({ attemptsUsed, extraAttempts });

    return {
      gameId: Number(gameId),
      releasedToGradebook: true,
      gradeReleased: true,
      unavailable: true,
      bestScore: best ? Number(best.score) : null,
      hasPassed: best ? Number(best.score) >= 70 : false,
      ...attemptMeta,
      maxGameAttempts: MAX_GAME_ATTEMPTS,
    };
  },

  async getStudentScores(studentId, gameId = null) {
    return GameModel.getStudentScores(studentId, gameId);
  },

  async getScoreReview(gameId, scoreId, user) {
    await assertTeacherOwnsGame(gameId, user);
    const score = await GameModel.findScoreById(scoreId);
    if (!score || Number(score.game_id) !== Number(gameId)) {
      throw new AppError("Game score not found", 404);
    }
    if (!Number(score.released_to_gradebook)) {
      throw new AppError(
        "This score is not released to the gradebook yet",
        403,
      );
    }

    const answers = score.answers_json;
    const items = buildGameAnswerReviewItems(
      score.game_type,
      score.game_data,
      answers,
    );
    const answerItems = items.filter((item) => item.answerStored);

    return {
      game: {
        id: Number(score.game_id),
        title: score.game_title,
        gameType: score.game_type,
        courseId: score.course_id,
      },
      score: {
        id: Number(score.id),
        studentId: Number(score.student_id),
        studentFirstName: score.first_name,
        studentLastName: score.last_name,
        studentEmail: score.email || null,
        studentUsername: score.username || null,
        score: Number(score.score) || 0,
        earnedPoints: Number(score.score) || 0,
        totalPoints: 100,
        xpEarned: Number(score.xp_earned) || 0,
        playedAt: score.played_at,
        durationSeconds: score.duration_seconds,
      },
      answersAvailable: Boolean(answers),
      answerCount: answerItems.length,
      items,
    };
  },

  async listStudentOverrides(gameId, user) {
    await assertTeacherOwnsGame(gameId, user);
    const rows = await GameStudentOverrideModel.findByGame(gameId);
    return rows.map((row) => ({
      id: row.id,
      gameId: row.game_id,
      studentId: row.student_id,
      studentName: `${row.first_name} ${row.last_name}`.trim(),
      studentEmail: row.email || null,
      extraAttempts: Number(row.extra_attempts || 0),
      reason: row.reason,
      grantedBy: row.granted_by,
      granterName: `${row.granter_first_name} ${row.granter_last_name}`.trim(),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async grantStudentOverride(gameId, payload, user) {
    const game = await assertTeacherOwnsGame(gameId, user);
    const studentId = Number(payload.studentId);
    if (!studentId) throw new AppError("studentId is required", 400);

    const enrolled = await CourseModel.isEnrolled(game.course_id, studentId);
    if (!enrolled) {
      throw new AppError("Student is not enrolled in this subject", 400);
    }

    const extraAttempts = Math.max(0, Number(payload.extraAttempts) || 0);
    if (extraAttempts > MAX_GAME_EXTRA_ATTEMPTS_GRANT) {
      throw new AppError(
        `extraAttempts cannot exceed ${MAX_GAME_EXTRA_ATTEMPTS_GRANT}`,
        400,
      );
    }
    if (extraAttempts <= 0) {
      throw new AppError("Provide at least one extra attempt", 400);
    }

    const reason = String(payload.reason || "")
      .trim()
      .slice(0, 500) || null;
    const override = await GameStudentOverrideModel.upsert({
      gameId,
      studentId,
      extraAttempts,
      reason,
      grantedBy: user.id,
    });

    await NotificationModel.create({
      userId: studentId,
      title: "Game access extended",
      message: `Your teacher granted ${extraAttempts} extra attempt(s) for "${game.title}".`,
      type: "info",
      link: `/student/games/${game.id}`,
    });

    return {
      gameId: Number(game.id),
      studentId,
      extraAttempts: Number(override.extra_attempts || 0),
      reason: override.reason,
      grantedBy: override.granted_by,
      updatedAt: override.updated_at,
    };
  },

  async removeStudentOverride(gameId, studentId, user) {
    await assertTeacherOwnsGame(gameId, user);
    await GameStudentOverrideModel.remove(gameId, Number(studentId));
    return true;
  },
};

export default GameService;
