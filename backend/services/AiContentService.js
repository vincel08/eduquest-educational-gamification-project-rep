import path from 'path';
import crypto from 'crypto';
import CourseModel from '../models/CourseModel.js';
import LessonModel from '../models/LessonModel.js';
import AiContentGenerationModel from '../models/AiContentGenerationModel.js';
import DocumentExtractService from './DocumentExtractService.js';
import AiService from './AiService.js';
import QuizService from './QuizService.js';
import GameService from './GameService.js';
import AiUsageService from './AiUsageService.js';
import AppError from '../utils/AppError.js';
import { GAME_TYPES, normalizeGameType } from '../utils/gameTypes.js';
import { resolveUploadPath, uploadExists } from '../utils/uploadPaths.js';
import {
  assertInputTextSize,
  assertQuestionCount,
  assertGameItemRequestCount,
  buildIdempotencyKey,
} from '../utils/aiLimits.js';

function assertCourseAccess(course, user) {
  if (!course) throw new AppError('Course not found', 404);
  if (user.role === 'teacher' && course.teacher_id !== user.id) {
    throw new AppError('Access denied', 403);
  }
}

function difficultyToSlug(value) {
  const raw = String(value || 'medium').trim().toLowerCase();
  if (raw === 'easy') return 'easy';
  if (raw === 'hard') return 'hard';
  return 'medium';
}

function contentQuizToPersistableQuestions(quizJson) {
  return (quizJson.questions || []).map((item, index) => {
    const choices = Array.isArray(item.choices) ? item.choices : [];
    const answer = String(item.answer || '').trim().toLowerCase();
    const options = choices.map((choice) => ({
      optionText: String(choice),
      isCorrect: String(choice).trim().toLowerCase() === answer,
    }));

    if (!options.some((option) => option.isCorrect) && options.length) {
      options[0].isCorrect = true;
    }

    return {
      questionText: item.question || item.questionText || `Question ${index + 1}`,
      questionType: 'multiple_choice',
      points: 1,
      explanation: item.explanation || null,
      options,
    };
  });
}

const AiContentService = {
  async extractDocument(file) {
    return DocumentExtractService.extractFromFile(file);
  },

  async generate(payload, user, options = {}) {
    const course = await CourseModel.findById(payload.courseId);
    assertCourseAccess(course, user);

    const contentType = String(payload.contentType || '').toLowerCase();
    if (contentType !== 'quiz' && contentType !== 'game') {
      throw new AppError('contentType must be quiz or game', 400);
    }

    const sourceType = String(payload.sourceType || 'lesson').toLowerCase();
    let lesson = null;
    let topic = payload.topic || course.title;
    let extractedText = String(payload.extractedText || '').trim();
    let originalFileName = payload.originalFileName || null;
    let uploadedFilePath = payload.uploadedFilePath || null;
    let lessonId = payload.lessonId || null;
    const questionCount = contentType === 'quiz'
      ? assertQuestionCount(payload.questionCount ?? 5)
      : null;
    const itemCount = contentType === 'game'
      ? assertGameItemRequestCount(payload.itemCount ?? 6, payload.gameType || 'auto')
      : null;

    if (sourceType === 'lesson') {
      if (!payload.lessonId) {
        throw new AppError('lessonId is required when generating from an existing lesson', 400);
      }
      lesson = await LessonModel.findById(payload.lessonId);
      if (!lesson || Number(lesson.course_id) !== Number(payload.courseId)) {
        throw new AppError('Lesson not found for this course', 404);
      }
      lessonId = lesson.id;
      topic = lesson.title || topic;
      extractedText = [
        lesson.title || '',
        lesson.content || '',
        lesson.summary || '',
      ].filter(Boolean).join('\n\n').trim();
      originalFileName = null;
      uploadedFilePath = null;
    } else if (sourceType === 'upload') {
      if (!extractedText) {
        throw new AppError('Extracted text is required for uploaded materials', 400);
      }

      // Never trust client-supplied absolute paths; store only a safe uploads basename.
      if (uploadedFilePath) {
        const safeName = path.basename(String(uploadedFilePath).replace(/\\/g, '/'));
        if (!uploadExists(safeName)) {
          uploadedFilePath = null;
        } else {
          uploadedFilePath = resolveUploadPath(safeName);
        }
      }

      if (payload.lessonId) {
        lesson = await LessonModel.findById(payload.lessonId);
        if (!lesson || Number(lesson.course_id) !== Number(payload.courseId)) {
          throw new AppError('Lesson not found for this course', 404);
        }
        lessonId = lesson.id;
      }
      if (!topic || topic === course.title) {
        topic = originalFileName
          ? path.parse(originalFileName).name.replace(/[_-]+/g, ' ')
          : course.title;
      }
    } else {
      throw new AppError('sourceType must be lesson or upload', 400);
    }

    if (!extractedText || extractedText.length < 40) {
      throw new AppError('Not enough content to generate from. Provide a richer lesson or document.', 400);
    }

    assertInputTextSize(extractedText, { label: 'Document' });

    const textFingerprint = crypto.createHash('sha256').update(extractedText).digest('hex').slice(0, 16);
    const idempotencyKey = options.skipUsageTracking
      ? null
      : buildIdempotencyKey([
        'ai-content-generate',
        user.id,
        payload.courseId,
        contentType,
        sourceType,
        lessonId,
        questionCount,
        itemCount,
        payload.gameType || '',
        textFingerprint,
        payload.requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      ]);

    let usageEvent = null;
    if (!options.skipUsageTracking) {
      usageEvent = await AiUsageService.beginOperation({
        userId: user.id,
        operationType: contentType === 'quiz' ? 'content_quiz' : 'content_game',
        inputChars: extractedText.length,
        requestedQuantity: questionCount ?? itemCount,
        idempotencyKey,
      });
    }

    try {
      let generatedJson;
      let warning = null;
      let source = null;

      if (contentType === 'quiz') {
        const generated = await AiService.generateContentQuiz({
          topic,
          lessonContent: extractedText,
          difficulty: payload.difficulty || 'medium',
          questionCount,
          gradeLevel: payload.gradeLevel || course.grade_level || "junior high school",
        });
        generatedJson = {
          title: generated.title,
          description: generated.description,
          difficulty: generated.difficulty,
          timeLimit: generated.timeLimit,
          passingScore: generated.passingScore,
          questions: generated.questions,
        };
        warning = generated.warning || null;
        source = generated.source;
      } else {
        const requestedType = payload.gameType || 'auto';
        if (requestedType !== 'auto' && !normalizeGameType(requestedType) && !GAME_TYPES.includes(requestedType)) {
          throw new AppError('Unsupported game type', 400);
        }

        const generated = await AiService.generateGame({
          topic,
          gameType: requestedType,
          gradeLevel: payload.gradeLevel || course.grade_level || "junior high school",
          lessonContent: extractedText,
          itemCount,
        });

        generatedJson = {
          gameType: generated.gameType,
          title: generated.title,
          description: generated.description,
          difficulty: generated.difficulty,
          estimatedTime: generated.estimatedTime,
          xpReward: generated.xpReward,
          items: generated.gameData?.items || generated.gameData?.pairs || [],
          gameData: generated.gameData,
        };
        warning = generated.warning || null;
        source = generated.source;
      }

      if (!generatedJson?.title) {
        throw new AppError('AI returned invalid content. Please try generating again.', 502);
      }

      const record = await AiContentGenerationModel.create({
        teacherId: user.id,
        courseId: Number(payload.courseId),
        lessonId,
        originalFileName,
        uploadedFilePath,
        extractedText,
        generatedType: contentType === 'quiz' ? 'Quiz' : 'Game',
        generatedJson,
      });

      await AiUsageService.completeOperation(usageEvent?.id, { provider: source });

      return {
        generationId: record.id,
        courseId: Number(payload.courseId),
        lessonId,
        sourceType,
        contentType: contentType === 'quiz' ? 'Quiz' : 'Game',
        originalFileName,
        uploadedFilePath: uploadedFilePath ? path.basename(uploadedFilePath) : null,
        extractedText,
        generated: generatedJson,
        source,
        warning,
        saved: false,
      };
    } catch (error) {
      await AiUsageService.failOperation(usageEvent?.id, error);
      throw error;
    }
  },

  async save(payload, user) {
    const generation = await AiContentGenerationModel.findById(payload.generationId);
    if (!generation) {
      throw new AppError('Generation not found', 404);
    }
    if (user.role === 'teacher' && generation.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    const course = await CourseModel.findById(generation.course_id);
    assertCourseAccess(course, user);

    const generated = payload.generated || generation.generated_json;
    if (!generated || typeof generated !== 'object') {
      throw new AppError('generated content is required', 400);
    }

    const isPublished = payload.isPublished !== false;

    if (generation.generated_type === 'Quiz') {
      const quiz = await QuizService.createQuiz(
        {
          courseId: generation.course_id,
          lessonId: generation.lesson_id,
          title: generated.title,
          description: generated.description || null,
          timeLimitMinutes: generated.timeLimit || generated.time_limit || 15,
          passingScore: generated.passingScore || generated.passing_score || 70,
          xpReward: payload.xpReward || 50,
          isAiGenerated: true,
          isPublished,
          questions: contentQuizToPersistableQuestions(generated),
        },
        user
      );

      await AiContentGenerationModel.updateLinks(generation.id, {
        quizId: quiz.id,
        generatedJson: generated,
      });

      return {
        contentType: 'Quiz',
        generationId: generation.id,
        quiz,
      };
    }

    const gameType = normalizeGameType(generated.gameType) || generated.gameType;
    const gameData = generated.gameData && typeof generated.gameData === 'object'
      ? generated.gameData
      : {
          items: generated.items || [],
        };

    const game = await GameService.createGame(
      {
        courseId: generation.course_id,
        lessonId: generation.lesson_id,
        title: generated.title,
        description: generated.description || null,
        gameType,
        difficulty: difficultyToSlug(generated.difficulty),
        estimatedTime: generated.estimatedTime || 10,
        xpReward: generated.xpReward || 100,
        gameData,
        isAiGenerated: true,
        isPublished,
      },
      user
    );

    await AiContentGenerationModel.updateLinks(generation.id, {
      gameId: game.id,
      generatedJson: generated,
    });

    return {
      contentType: 'Game',
      generationId: generation.id,
      game,
    };
  },
};

export default AiContentService;
