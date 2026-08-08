import crypto from 'crypto';
import CourseModel from '../models/CourseModel.js';
import LessonModel from '../models/LessonModel.js';
import AiReviewDraftModel from '../models/AiReviewDraftModel.js';
import AiService from './AiService.js';
import QuizService from './QuizService.js';
import GameService from './GameService.js';
import AiUsageService from './AiUsageService.js';
import AppError from '../utils/AppError.js';
import { normalizeGameType } from '../utils/gameTypes.js';
import {
  assertInputTextSize,
  assertQuestionCount,
  buildIdempotencyKey,
} from '../utils/aiLimits.js';

function assertCourseAccess(course, user) {
  if (!course) throw new AppError('Course not found', 404);
  if (user.role === 'teacher' && course.teacher_id !== user.id) {
    throw new AppError('Access denied', 403);
  }
}

function assertDraftAccess(draft, user) {
  if (!draft) throw new AppError('Draft not found', 404);
  if (user.role === 'teacher' && draft.teacherId !== user.id) {
    throw new AppError('Access denied', 403);
  }
  if (draft.status === 'discarded') {
    throw new AppError('This draft was discarded', 410);
  }
}

function tempId(prefix = 'q') {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

function normalizeQuizQuestion(raw, index = 0) {
  const questionType = ['multiple_choice', 'true_false', 'identification'].includes(raw.questionType)
    ? raw.questionType
    : (raw.question_type || 'multiple_choice');

  let options = Array.isArray(raw.options) ? raw.options.map((opt, i) => ({
    id: opt.id || tempId(`opt${i}`),
    optionText: opt.optionText || opt.option_text || opt.text || String(opt),
    isCorrect: Boolean(opt.isCorrect ?? opt.is_correct),
  })) : [];

  if (!options.length && Array.isArray(raw.choices)) {
    const answer = String(raw.answer || '').trim().toLowerCase();
    options = raw.choices.map((choice, i) => ({
      id: tempId(`opt${i}`),
      optionText: String(choice),
      isCorrect: String(choice).trim().toLowerCase() === answer,
    }));
    if (!options.some((o) => o.isCorrect) && options.length) options[0].isCorrect = true;
  }

  if (questionType === 'true_false' && options.length < 2) {
    const answer = String(raw.answer || raw.textAnswer || 'True').toLowerCase().includes('false')
      ? 'False'
      : 'True';
    options = [
      { id: tempId('tf1'), optionText: 'True', isCorrect: answer === 'True' },
      { id: tempId('tf2'), optionText: 'False', isCorrect: answer === 'False' },
    ];
  }

  return {
    id: raw.id || tempId('q'),
    questionText: raw.questionText || raw.question_text || raw.question || `Question ${index + 1}`,
    questionType,
    points: Number(raw.points) || 1,
    difficulty: raw.difficulty || 'medium',
    explanation: raw.explanation || '',
    options,
    textAnswer: raw.textAnswer || raw.text_answer || raw.answer || '',
  };
}

function normalizeQuiz(raw) {
  if (!raw) return null;
  return {
    title: raw.title || 'Untitled Quiz',
    description: raw.description || '',
    difficulty: raw.difficulty || 'medium',
    timeLimitMinutes: Number(raw.timeLimitMinutes || raw.timeLimit || raw.time_limit || 15),
    passingScore: Number(raw.passingScore || raw.passing_score || 60),
    xpReward: Number(raw.xpReward || raw.xp_reward || 50),
    questions: (raw.questions || []).map((q, i) => normalizeQuizQuestion(q, i)),
  };
}

function normalizeGame(raw) {
  if (!raw) return null;
  const gameData = raw.gameData && typeof raw.gameData === 'object'
    ? raw.gameData
    : { items: raw.items || [] };
  if (!Array.isArray(gameData.items) && Array.isArray(raw.items)) {
    gameData.items = raw.items;
  }
  if (!Array.isArray(gameData.items)) gameData.items = [];

  gameData.items = gameData.items.map((item, i) => {
    const id = item.id || tempId('g');
    return {
      ...item,
      id,
      prompt: item.prompt || item.question || item.term || item.clue || item.word || `Item ${i + 1}`,
      answer: item.answer || item.definition || item.match || item.response || '',
      hint: item.hint || item.explanation || '',
    };
  });

  return {
    title: raw.title || 'Untitled Game',
    description: raw.description || '',
    instructions: raw.instructions || raw.description || 'Complete the activity to earn XP.',
    gameType: normalizeGameType(raw.gameType) || raw.gameType || 'flashcards',
    difficulty: raw.difficulty || 'medium',
    estimatedTime: Number(raw.estimatedTime || 10),
    xpReward: Number(raw.xpReward || 100),
    gameData,
  };
}

function normalizeObjectives(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.map((item, i) => ({
      id: typeof item === 'object' && item.id ? item.id : tempId('obj'),
      text: typeof item === 'string' ? item : (item.text || item.objective || `Objective ${i + 1}`),
    }));
  }
  if (Array.isArray(raw.objectives)) return normalizeObjectives(raw.objectives);
  return [];
}

function normalizeSummary(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return {
      title: 'Lesson Summary',
      sections: [{ id: tempId('sec'), heading: 'Overview', body: raw }],
    };
  }
  return {
    title: raw.title || 'Lesson Summary',
    sections: Array.isArray(raw.sections)
      ? raw.sections.map((sec, i) => ({
        id: sec.id || tempId('sec'),
        heading: sec.heading || sec.title || `Section ${i + 1}`,
        body: sec.body || sec.content || sec.text || '',
      }))
      : [{ id: tempId('sec'), heading: 'Overview', body: raw.summary || raw.text || '' }],
  };
}

function quizToPersistable(quiz) {
  return (quiz.questions || []).map((question, index) => {
    const questionType = question.questionType || 'multiple_choice';
    if (questionType === 'identification') {
      return {
        questionText: question.questionText,
        questionType: 'identification',
        points: Number(question.points) || 1,
        explanation: question.explanation || null,
        options: [{
          optionText: question.textAnswer || question.answer || 'Answer',
          isCorrect: true,
        }],
        orderIndex: index + 1,
      };
    }

    const options = (question.options || []).map((opt) => ({
      optionText: opt.optionText,
      isCorrect: Boolean(opt.isCorrect),
    }));

    if (!options.some((o) => o.isCorrect) && options.length) {
      options[0].isCorrect = true;
    }

    return {
      questionText: question.questionText,
      questionType,
      points: Number(question.points) || 1,
      explanation: question.explanation || null,
      options,
      orderIndex: index + 1,
    };
  });
}

function validateQuizForPublish(quiz) {
  if (!quiz?.title?.trim()) throw new AppError('Quiz title is required before publishing', 400);
  if (!Array.isArray(quiz.questions) || quiz.questions.length < 1) {
    throw new AppError('Quiz must contain at least one question', 400);
  }
  const hasCorrect = quiz.questions.some((q) => {
    if (q.questionType === 'identification') return Boolean(String(q.textAnswer || '').trim());
    return (q.options || []).some((o) => o.isCorrect);
  });
  if (!hasCorrect) throw new AppError('Quiz must include at least one correct answer', 400);
}

function validateGameForPublish(game) {
  if (!game?.title?.trim()) throw new AppError('Game title is required before publishing', 400);
  if (!String(game.instructions || game.description || '').trim()) {
    throw new AppError('Game instructions are required before publishing', 400);
  }
  const items = game.gameData?.items || [];
  if (!items.length) throw new AppError('Game must contain at least one game item', 400);
}

async function lessonSourceText(courseId, lessonId) {
  if (!lessonId) return '';
  const lesson = await LessonModel.findById(lessonId);
  if (!lesson || Number(lesson.course_id) !== Number(courseId)) return '';
  return [lesson.title, lesson.content, lesson.summary].filter(Boolean).join('\n\n');
}

const AiReviewService = {
  normalizeQuiz,
  normalizeGame,
  normalizeObjectives,
  normalizeSummary,

  async getDraft(id, user) {
    const draft = await AiReviewDraftModel.findById(id);
    assertDraftAccess(draft, user);
    return draft;
  },

  async listDrafts(user, query = {}) {
    return AiReviewDraftModel.listByTeacher(user.id, {
      status: query.status || 'draft',
      limit: query.limit || 20,
    });
  },

  async createDraft(payload, user) {
    const course = await CourseModel.findById(payload.courseId);
    assertCourseAccess(course, user);

    return AiReviewDraftModel.create({
      teacherId: user.id,
      courseId: Number(payload.courseId),
      lessonId: payload.lessonId || null,
      sourceType: payload.sourceType || 'manual',
      status: 'draft',
      title: payload.title || 'AI Content Review',
      sourceText: payload.sourceText || null,
      quiz: payload.quiz ? normalizeQuiz(payload.quiz) : null,
      game: payload.game ? normalizeGame(payload.game) : null,
      learningObjectives: payload.learningObjectives
        ? normalizeObjectives(payload.learningObjectives)
        : null,
      lessonSummary: payload.lessonSummary
        ? normalizeSummary(payload.lessonSummary)
        : null,
      generationMeta: {
        event: 'AI Generated',
        source: payload.source || null,
        warning: payload.warning || null,
        createdAt: new Date().toISOString(),
      },
      aiGenerated: true,
      teacherEdited: false,
      generatedBy: user.id,
    });
  },

  async createFromQuizGenerate(payload, user) {
    const course = await CourseModel.findById(payload.courseId);
    assertCourseAccess(course, user);

    const questionCount = assertQuestionCount(payload.questionCount ?? 5);
    const sourceText = payload.lessonContent
      || await lessonSourceText(payload.courseId, payload.lessonId);
    if (sourceText) assertInputTextSize(sourceText, { label: 'Lesson content' });

    const textFingerprint = crypto.createHash('sha256')
      .update(String(sourceText || payload.topic || ''))
      .digest('hex')
      .slice(0, 16);
    const usageEvent = await AiUsageService.beginOperation({
      userId: user.id,
      operationType: 'review_quiz',
      inputChars: String(sourceText || '').length,
      requestedQuantity: questionCount,
      idempotencyKey: buildIdempotencyKey([
        'from-quiz',
        user.id,
        payload.courseId,
        payload.lessonId,
        payload.topic,
        questionCount,
        payload.questionType || 'multiple_choice',
        textFingerprint,
      ]),
    });

    try {
      const generated = await AiService.generateQuiz({
        topic: payload.topic,
        difficulty: payload.difficulty,
        questionCount,
        questionType: payload.questionType || 'multiple_choice',
        gradeLevel: payload.gradeLevel || course.grade_level || 'high school',
        lessonContent: sourceText || '',
      });

      if (!generated?.questions?.length) {
        throw new AppError('AI returned invalid content. Please try generating again.', 502);
      }

      const quiz = normalizeQuiz({
        title: payload.title || generated.title,
        description: payload.description || generated.description,
        difficulty: payload.difficulty || 'medium',
        timeLimitMinutes: payload.timeLimitMinutes || 15,
        passingScore: payload.passingScore || 60,
        xpReward: payload.xpReward || 50,
        questions: generated.questions,
      });

      let lessonSummary = null;
      let learningObjectives = null;

      if (sourceText && sourceText.length > 40) {
        const extras = await AiService.summarizeLesson(sourceText);
        lessonSummary = normalizeSummary(extras.summary);
        learningObjectives = normalizeObjectives(extras.learningObjectives);
      }

      const draft = await this.createDraft({
        courseId: payload.courseId,
        lessonId: payload.lessonId || null,
        sourceType: 'ai_quiz',
        title: quiz.title,
        sourceText,
        quiz,
        lessonSummary,
        learningObjectives,
        source: generated.source,
        warning: generated.warning,
      }, user);

      await AiUsageService.completeOperation(usageEvent?.id, { provider: generated.source });

      return {
        draftId: draft.id,
        draft,
        source: generated.source,
        warning: generated.warning || null,
      };
    } catch (error) {
      await AiUsageService.failOperation(usageEvent?.id, error);
      throw error;
    }
  },

  async createFromGameGenerate(payload, user) {
    const course = await CourseModel.findById(payload.courseId);
    assertCourseAccess(course, user);

    const sourceText = await lessonSourceText(payload.courseId, payload.lessonId);
    if (sourceText) assertInputTextSize(sourceText, { label: 'Lesson content' });

    const usageEvent = await AiUsageService.beginOperation({
      userId: user.id,
      operationType: 'review_game',
      inputChars: String(sourceText || '').length,
      requestedQuantity: null,
      idempotencyKey: buildIdempotencyKey([
        'from-game',
        user.id,
        payload.courseId,
        payload.lessonId,
        payload.gameType || 'auto',
        crypto.createHash('sha256').update(String(sourceText || '')).digest('hex').slice(0, 16),
      ]),
    });

    try {
      const generated = await GameService.generateAiGame(payload, user);
      if (!generated?.title) {
        throw new AppError('AI returned invalid content. Please try generating again.', 502);
      }

      const game = normalizeGame({
        ...generated,
        instructions: generated.description,
      });

      let lessonSummary = null;
      let learningObjectives = null;
      if (sourceText && sourceText.length > 40) {
        const extras = await AiService.summarizeLesson(sourceText);
        lessonSummary = normalizeSummary(extras.summary);
        learningObjectives = normalizeObjectives(extras.learningObjectives);
      }

      const draft = await this.createDraft({
        courseId: payload.courseId,
        lessonId: payload.lessonId || null,
        sourceType: 'ai_game',
        title: game.title,
        sourceText,
        game,
        lessonSummary,
        learningObjectives,
        source: generated.source,
        warning: generated.warning,
      }, user);

      await AiUsageService.completeOperation(usageEvent?.id, { provider: generated.source });

      return {
        draftId: draft.id,
        draft,
        source: generated.source,
        warning: generated.warning || null,
      };
    } catch (error) {
      await AiUsageService.failOperation(usageEvent?.id, error);
      throw error;
    }
  },

  async createFromAiContent(payload, user) {
    const contentType = String(payload.contentType || 'quiz').toLowerCase();
    const course = await CourseModel.findById(payload.courseId);
    assertCourseAccess(course, user);

    let sourceText = String(payload.extractedText || '').trim();
    let lessonId = payload.lessonId || null;
    let topic = payload.topic || course.title;
    const questionCount = ['quiz', 'all'].includes(contentType)
      ? assertQuestionCount(payload.questionCount ?? 5)
      : null;

    if (String(payload.sourceType || 'lesson').toLowerCase() === 'lesson') {
      if (!payload.lessonId) {
        throw new AppError('lessonId is required when generating from an existing lesson', 400);
      }
      const lesson = await LessonModel.findById(payload.lessonId);
      if (!lesson || Number(lesson.course_id) !== Number(payload.courseId)) {
        throw new AppError('Lesson not found for this course', 404);
      }
      lessonId = lesson.id;
      topic = lesson.title || topic;
      sourceText = [lesson.title, lesson.content, lesson.summary].filter(Boolean).join('\n\n').trim();
    }

    if (!sourceText || sourceText.length < 40) {
      throw new AppError('Not enough content to generate from. Provide a richer lesson or document.', 400);
    }

    assertInputTextSize(sourceText, { label: 'Document' });

    let quiz = null;
    let game = null;
    let lessonSummary = null;
    let learningObjectives = null;
    let generationId = null;
    let source = null;
    let warning = null;

    const needsQuiz = ['quiz', 'all'].includes(contentType);
    const needsGame = ['game', 'all'].includes(contentType);
    const needsObjectives = ['objectives', 'learning_objectives', 'all'].includes(contentType);
    const needsSummary = ['summary', 'lesson_summary', 'all'].includes(contentType);

    if (!needsQuiz && !needsGame && !needsObjectives && !needsSummary) {
      throw new AppError('contentType must be quiz, game, objectives, summary, or all', 400);
    }

    const textFingerprint = crypto.createHash('sha256').update(sourceText).digest('hex').slice(0, 16);
    const usageEvent = await AiUsageService.beginOperation({
      userId: user.id,
      operationType: 'review_content',
      inputChars: sourceText.length,
      requestedQuantity: questionCount,
      idempotencyKey: buildIdempotencyKey([
        'from-content',
        user.id,
        payload.courseId,
        contentType,
        payload.sourceType,
        lessonId,
        questionCount,
        payload.gameType || '',
        textFingerprint,
      ]),
    });

    try {
    if (needsQuiz || needsGame) {
      const AiContentService = (await import('./AiContentService.js')).default;
      const generated = await AiContentService.generate({
        ...payload,
        contentType: needsQuiz ? 'quiz' : 'game',
        questionCount,
        extractedText: sourceText,
        lessonId,
        topic,
      }, user, { skipUsageTracking: true });
      generationId = generated.generationId;
      source = generated.source;
      warning = generated.warning || null;
      if (generated.contentType === 'Quiz') quiz = normalizeQuiz(generated.generated);
      if (generated.contentType === 'Game') game = normalizeGame(generated.generated);
    }

    if (needsGame && needsQuiz) {
      const AiContentService = (await import('./AiContentService.js')).default;
      const gameGenerated = await AiContentService.generate({
        ...payload,
        contentType: 'game',
        extractedText: sourceText,
        lessonId,
        topic,
      }, user, { skipUsageTracking: true });
      game = normalizeGame(gameGenerated.generated);
      source = source || gameGenerated.source;
      warning = warning || gameGenerated.warning || null;
    }

    if (needsObjectives || needsSummary || needsQuiz || needsGame) {
      const extras = await AiService.summarizeLesson(sourceText);
      if (needsSummary || needsQuiz || needsGame) {
        lessonSummary = normalizeSummary(extras.summary);
      }
      if (needsObjectives || needsQuiz || needsGame) {
        learningObjectives = normalizeObjectives(extras.learningObjectives);
      }
      source = source || extras.source;
    }

    const draft = await this.createDraft({
      courseId: payload.courseId,
      lessonId,
      sourceType: 'ai_content',
      title: (quiz || game)?.title || topic || 'AI Content Review',
      sourceText,
      quiz,
      game,
      lessonSummary,
      learningObjectives,
      source,
      warning,
    }, user);

    await AiUsageService.completeOperation(usageEvent?.id, { provider: source });

    return {
      draftId: draft.id,
      draft,
      generationId,
      source,
      warning: warning || null,
    };
    } catch (error) {
      await AiUsageService.failOperation(usageEvent?.id, error);
      throw error;
    }
  },

  async updateDraft(id, payload, user) {
    const draft = await AiReviewDraftModel.findById(id);
    assertDraftAccess(draft, user);
    if (draft.status === 'published') {
      throw new AppError('Published drafts cannot be edited. Create a new generation instead.', 400);
    }

    const updates = { teacherEdited: true, updatedBy: user.id };
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.quiz !== undefined) updates.quiz = payload.quiz ? normalizeQuiz(payload.quiz) : null;
    if (payload.game !== undefined) updates.game = payload.game ? normalizeGame(payload.game) : null;
    if (payload.learningObjectives !== undefined) {
      updates.learningObjectives = payload.learningObjectives
        ? normalizeObjectives(payload.learningObjectives)
        : null;
    }
    if (payload.lessonSummary !== undefined) {
      updates.lessonSummary = payload.lessonSummary
        ? normalizeSummary(payload.lessonSummary)
        : null;
    }

    updates.generationMeta = {
      ...(draft.generationMeta || {}),
      event: 'Teacher Edited',
      editedAt: new Date().toISOString(),
    };

    return AiReviewDraftModel.update(id, updates);
  },

  async saveDraft(id, payload, user) {
    const updated = await this.updateDraft(id, payload || {}, user);
    return AiReviewDraftModel.update(updated.id, {
      status: 'draft',
      generationMeta: {
        ...(updated.generationMeta || {}),
        event: 'Teacher Saved Draft',
        savedAt: new Date().toISOString(),
      },
    });
  },

  async discardDraft(id, user) {
    const draft = await AiReviewDraftModel.findById(id);
    assertDraftAccess(draft, user);
    return AiReviewDraftModel.update(id, {
      status: 'discarded',
      generationMeta: {
        ...(draft.generationMeta || {}),
        event: 'Teacher Discarded',
        discardedAt: new Date().toISOString(),
      },
    });
  },

  async publishDraft(id, payload, user) {
    const draft = await this.updateDraft(id, payload || {}, user);

    if (!draft.quiz && !draft.game && !draft.lessonSummary && !draft.learningObjectives) {
      throw new AppError('Nothing to publish in this draft', 400);
    }

    let quiz = null;
    let game = null;

    if (draft.quiz) {
      validateQuizForPublish(draft.quiz);
      quiz = await QuizService.createQuiz({
        courseId: draft.courseId,
        lessonId: draft.lessonId,
        title: draft.quiz.title,
        description: draft.quiz.description,
        timeLimitMinutes: draft.quiz.timeLimitMinutes,
        passingScore: draft.quiz.passingScore,
        xpReward: draft.quiz.xpReward,
        isAiGenerated: true,
        isPublished: true,
        questions: quizToPersistable(draft.quiz),
      }, user);
    }

    if (draft.game) {
      validateGameForPublish(draft.game);
      game = await GameService.createGame({
        courseId: draft.courseId,
        lessonId: draft.lessonId,
        title: draft.game.title,
        description: draft.game.instructions || draft.game.description,
        gameType: draft.game.gameType,
        difficulty: draft.game.difficulty,
        estimatedTime: draft.game.estimatedTime,
        xpReward: draft.game.xpReward,
        gameData: draft.game.gameData,
        isAiGenerated: true,
        isPublished: true,
      }, user);
    }

    if (draft.lessonId && (draft.lessonSummary || draft.learningObjectives)) {
      const summaryText = draft.lessonSummary?.sections
        ?.map((s) => `${s.heading}\n${s.body}`)
        .join('\n\n') || null;
      const objectivesText = Array.isArray(draft.learningObjectives)
        ? draft.learningObjectives.map((o) => o.text).join('\n')
        : null;

      await LessonModel.update(draft.lessonId, {
        summary: summaryText,
        learningObjectives: objectivesText,
      });
    }

    const published = await AiReviewDraftModel.update(id, {
      status: 'published',
      quizId: quiz?.id || draft.quizId || null,
      gameId: game?.id || draft.gameId || null,
      publishedBy: user.id,
      publishedAt: new Date(),
      generationMeta: {
        ...(draft.generationMeta || {}),
        event: 'Teacher Published',
        publishedAt: new Date().toISOString(),
      },
    });

    return { draft: published, quiz, game };
  },

  async regenerate(id, payload, user) {
    const draft = await AiReviewDraftModel.findById(id);
    assertDraftAccess(draft, user);
    if (draft.status !== 'draft') throw new AppError('Only draft content can be regenerated', 400);

    const target = payload.target || 'all';
    const sourceText = draft.sourceText || await lessonSourceText(draft.courseId, draft.lessonId);
    if (sourceText) assertInputTextSize(sourceText, { label: 'Document' });
    const course = await CourseModel.findById(draft.courseId);
    const updates = { teacherEdited: true, updatedBy: user.id };

    // Intentional regenerate uses a distinct key so it is not blocked by the original generate.
    const usageEvent = await AiUsageService.beginOperation({
      userId: user.id,
      operationType: 'regenerate',
      inputChars: String(sourceText || '').length,
      requestedQuantity: payload.questionCount || null,
      // Distinct from initial generate keys; windowed so double-clicks are blocked
      // but intentional regenerates after the window still work.
      idempotencyKey: buildIdempotencyKey([
        'regenerate',
        user.id,
        id,
        target,
        payload.questionIndex,
        payload.itemIndex,
        payload.count,
      ]),
    });

    try {
    if (target === 'all' || target === 'quiz') {
      if (draft.quiz || target === 'quiz') {
        const questionCount = assertQuestionCount(
          payload.questionCount || draft.quiz?.questions?.length || 5
        );
        const generated = await AiService.generateContentQuiz({
          topic: draft.quiz?.title || course.title,
          lessonContent: sourceText || draft.quiz?.title || course.title,
          difficulty: draft.quiz?.difficulty || 'medium',
          questionCount,
          gradeLevel: course.grade_level || 'high school',
        });
        updates.quiz = normalizeQuiz(generated);
      }
    }

    if (target === 'selected_question' && draft.quiz) {
      const index = Number(payload.questionIndex);
      if (Number.isNaN(index) || index < 0 || index >= draft.quiz.questions.length) {
        throw new AppError('Invalid question index', 400);
      }
      const generated = await AiService.generateContentQuiz({
        topic: draft.quiz.title,
        lessonContent: sourceText || draft.quiz.title,
        difficulty: draft.quiz.difficulty || 'medium',
        questionCount: 1,
        gradeLevel: course.grade_level || 'high school',
      });
      const nextQuestions = [...draft.quiz.questions];
      nextQuestions[index] = normalizeQuizQuestion(generated.questions?.[0] || {}, index);
      updates.quiz = { ...draft.quiz, questions: nextQuestions };
    }

    if (target === 'all' || target === 'game') {
      if (draft.game || target === 'game') {
        const generated = await AiService.generateGame({
          topic: draft.game?.title || course.title,
          gameType: draft.game?.gameType || 'auto',
          gradeLevel: course.grade_level || 'high school',
          lessonContent: sourceText || draft.game?.title || course.title,
        });
        updates.game = normalizeGame({
          ...generated,
          instructions: generated.description,
        });
      }
    }

    if (target === 'selected_game_item' && draft.game) {
      const index = Number(payload.itemIndex);
      const items = draft.game.gameData?.items || [];
      if (Number.isNaN(index) || index < 0 || index >= items.length) {
        throw new AppError('Invalid game item index', 400);
      }
      const generated = await AiService.generateGame({
        topic: draft.game.title,
        gameType: draft.game.gameType || 'flashcards',
        gradeLevel: course.grade_level || 'high school',
        lessonContent: sourceText || draft.game.title,
      });
      const newItems = generated.gameData?.items || [];
      const replacement = normalizeGame(generated).gameData.items[0];
      const nextItems = [...items];
      nextItems[index] = replacement || nextItems[index];
      if (newItems.length) {
        updates.game = {
          ...draft.game,
          gameData: { ...draft.game.gameData, items: nextItems },
        };
      }
    }

    if (target === 'all' || target === 'summary' || target === 'objectives') {
      if (sourceText && sourceText.length > 40) {
        const extras = await AiService.summarizeLesson(sourceText);
        if (target === 'all' || target === 'summary') {
          updates.lessonSummary = normalizeSummary(extras.summary);
        }
        if (target === 'all' || target === 'objectives') {
          updates.learningObjectives = normalizeObjectives(extras.learningObjectives);
        }
      }
    }

    if (target === 'more_questions' && draft.quiz) {
      const generated = await AiService.generateContentQuiz({
        topic: draft.quiz.title,
        lessonContent: sourceText || draft.quiz.title,
        difficulty: draft.quiz.difficulty || 'medium',
        questionCount: Number(payload.count) || 3,
        gradeLevel: course.grade_level || 'high school',
      });
      updates.quiz = {
        ...draft.quiz,
        questions: [
          ...draft.quiz.questions,
          ...normalizeQuiz(generated).questions,
        ],
      };
    }

    if (target === 'more_game_items' && draft.game) {
      const generated = await AiService.generateGame({
        topic: draft.game.title,
        gameType: draft.game.gameType || 'flashcards',
        gradeLevel: course.grade_level || 'high school',
        lessonContent: sourceText || draft.game.title,
      });
      const extra = normalizeGame(generated).gameData.items || [];
      updates.game = {
        ...draft.game,
        gameData: {
          ...draft.game.gameData,
          items: [...(draft.game.gameData.items || []), ...extra],
        },
      };
    }

    updates.generationMeta = {
      ...(draft.generationMeta || {}),
      event: 'AI Regenerated',
      regenerateTarget: target,
      regeneratedAt: new Date().toISOString(),
    };

    const updated = await AiReviewDraftModel.update(id, updates);
    await AiUsageService.completeOperation(usageEvent?.id);
    return updated;
    } catch (error) {
      await AiUsageService.failOperation(usageEvent?.id, error);
      throw error;
    }
  },

  async transform(id, payload, user) {
    const draft = await AiReviewDraftModel.findById(id);
    assertDraftAccess(draft, user);
    if (draft.status !== 'draft') throw new AppError('Only draft content can be transformed', 400);

    const action = String(payload.action || '').toLowerCase();
    const section = payload.section || 'summary';
    const allowed = [
      'improve_writing', 'shorten', 'expand', 'simplify',
      'make_more_challenging', 'make_easier',
    ];
    if (!allowed.includes(action)) {
      throw new AppError('Unsupported transform action', 400);
    }

    let source = '';
    if (section === 'summary') {
      source = draft.lessonSummary?.sections?.map((s) => s.body).join('\n\n') || '';
    } else if (section === 'objectives') {
      source = (draft.learningObjectives || []).map((o) => o.text).join('\n');
    } else if (section === 'quiz_description') {
      source = draft.quiz?.description || '';
    } else if (section === 'game_instructions') {
      source = draft.game?.instructions || draft.game?.description || '';
    } else if (section === 'selected_question' && draft.quiz) {
      const q = draft.quiz.questions[Number(payload.questionIndex)];
      source = q ? `${q.questionText}\n${q.explanation || ''}` : '';
    } else {
      source = String(payload.text || '');
    }

    if (!source.trim()) throw new AppError('No text available to transform', 400);

    const instructionMap = {
      improve_writing: 'Improve clarity and academic quality while preserving meaning.',
      shorten: 'Make the text shorter and more concise.',
      expand: 'Expand the text with useful educational detail.',
      simplify: 'Simplify the language for high school students.',
      make_more_challenging: 'Rewrite to be more academically challenging.',
      make_easier: 'Rewrite to be easier for high school students.',
    };

    const rewritten = await AiService.rewriteText({
      text: source,
      instruction: instructionMap[action],
    });
    const text = rewritten.text || source;
    const updates = { teacherEdited: true, updatedBy: user.id };

    if (section === 'summary') {
      updates.lessonSummary = normalizeSummary(text);
    } else if (section === 'objectives') {
      updates.learningObjectives = normalizeObjectives(
        String(text)
          .split('\n')
          .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
          .filter(Boolean)
      );
    } else if (section === 'quiz_description' && draft.quiz) {
      updates.quiz = { ...draft.quiz, description: text };
    } else if (section === 'game_instructions' && draft.game) {
      updates.game = { ...draft.game, instructions: text, description: text };
    } else if (section === 'selected_question' && draft.quiz) {
      const index = Number(payload.questionIndex);
      const next = [...draft.quiz.questions];
      if (next[index]) {
        next[index] = { ...next[index], questionText: text.split('\n')[0], explanation: text };
      }
      updates.quiz = { ...draft.quiz, questions: next };
    }

    updates.generationMeta = {
      ...(draft.generationMeta || {}),
      event: 'AI Transformed',
      transformAction: action,
      transformedAt: new Date().toISOString(),
    };

    return AiReviewDraftModel.update(id, updates);
  },
};

export default AiReviewService;
