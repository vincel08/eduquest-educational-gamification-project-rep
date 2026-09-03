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
import { assertGameDataMatchesType } from '../utils/gameDataValidation.js';
import {
  assertInputTextSize,
  assertQuestionCount,
  assertGameItemCount,
  assertGameItemRequestCount,
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
  const gameType = normalizeGameType(raw.gameType) || raw.gameType || 'flashcards';
  const gameData = raw.gameData && typeof raw.gameData === 'object'
    ? { ...raw.gameData }
    : {};

  const pickList = (...candidates) => {
    for (const list of candidates) {
      if (Array.isArray(list) && list.length) return list;
    }
    return Array.isArray(candidates[0]) ? candidates[0] : [];
  };

  // Teacher edits may live on pairs/clues/rounds while items is []. Prefer non-empty.
  let items = pickList(gameData.items, gameData.pairs, gameData.clues, raw.items);
  items = items.map((item, i) => {
    const id = item.id || tempId('g');
    return {
      ...item,
      id,
      term: item.term || item.front || item.left || undefined,
      definition: item.definition || item.back || item.right || undefined,
      prompt: item.prompt || item.question || item.term || item.clue || item.word || `Item ${i + 1}`,
      question: item.question || item.prompt || undefined,
      clue: item.clue || item.prompt || item.question || item.term || '',
      answer: item.answer || item.word || item.definition || item.match || item.response || '',
      hint: item.hint || item.explanation || '',
      choices: Array.isArray(item.choices) ? item.choices : item.choices,
      correctIndex: item.correctIndex,
      direction: item.direction || undefined,
      row: item.row,
      col: item.col,
    };
  });

  if (items.length) {
    gameData.items = items;
  } else if (!Array.isArray(gameData.items)) {
    gameData.items = [];
  }

  if (['flashcards', 'memory_match', 'drag_drop'].includes(gameType)) {
    const pairs = pickList(gameData.pairs, gameData.items);
    if (pairs.length) {
      gameData.items = pairs;
      gameData.pairs = pairs;
    }
  }

  if (gameType === 'crossword' || gameType === 'puzzle_challenge') {
    const clues = pickList(gameData.clues, gameData.items);
    if (clues.length) {
      gameData.items = clues;
      gameData.clues = clues;
    }
  }

  if (['quiz_show', 'quiz_rush', 'spin_wheel', 'millionaire'].includes(gameType)) {
    const rounds = pickList(gameData.rounds, gameData.items);
    if (rounds.length) {
      gameData.rounds = rounds.map((item) => ({
        ...item,
        prompt: item.prompt || item.question || item.label || '',
        question: item.question || item.prompt || item.label || '',
        choices: item.choices || [],
        correctIndex: item.correctIndex ?? 0,
        explanation: item.explanation || null,
        timeLimitSeconds: item.timeLimitSeconds || 20,
      }));
      gameData.items = gameData.rounds;
    }
  }

  if (['word_search', 'word_scramble'].includes(gameType)) {
    const words = pickList(
      gameData.words,
      (gameData.items || []).map((item) => item.term || item.answer || item.word).filter(Boolean),
    );
    if (words.length) {
      gameData.words = words.map((word) => (
        typeof word === 'string' ? word : (word?.word || word?.term || String(word || ''))
      )).filter(Boolean);
      gameData.items = gameData.words.map((word, index) => ({
        id: `w_${index}`,
        term: word,
        answer: word,
        word,
      }));
      // Force rebuild on next ensure — teacher may have changed the word list.
      delete gameData.grid;
      delete gameData.placements;
    }
  }

  // Keep structured collections (categories, stages, missions) from the teacher edit as-is.
  return {
    title: raw.title || 'Untitled Game',
    description: raw.description || '',
    instructions: raw.instructions || raw.description || 'Complete the activity to earn XP.',
    gameType,
    difficulty: raw.difficulty || 'medium',
    estimatedTime: Number(raw.estimatedTime || 10),
    xpReward: Number(raw.xpReward || 100),
    gameData,
  };
}

/** Resolve the editable item list for AI regenerate/transform. */
function getGameItemCollection(game) {
  const normalized = normalizeGame(game);
  const gameType = normalized.gameType;
  const data = normalized.gameData || {};

  if (gameType === 'escape_room') {
    return { game: normalized, collection: 'stages', items: data.stages || [] };
  }
  if (gameType === 'mission_adventure') {
    return { game: normalized, collection: 'missions', items: data.missions || [] };
  }
  if (gameType === 'jeopardy') {
    return { game: normalized, collection: 'jeopardy', items: [] };
  }
  return { game: normalized, collection: 'items', items: data.items || [] };
}

/**
 * Replace the editable item list and keep pairs/clues/rounds/words in sync
 * so normalizeGame does not discard updates by preferring a stale parallel array.
 */
function withGameItems(game, items, collection = 'items') {
  const current = normalizeGame(game);
  const gameType = current.gameType;
  const gameData = { ...(current.gameData || {}) };
  const nextItems = Array.isArray(items) ? items : [];

  if (collection === 'stages') {
    gameData.stages = nextItems;
  } else if (collection === 'missions') {
    gameData.missions = nextItems;
  } else if (['word_search', 'word_scramble'].includes(gameType)) {
    gameData.words = nextItems
      .map((item) => (
        typeof item === 'string'
          ? item
          : (item.word || item.term || item.answer || '')
      ))
      .map((word) => String(word || '').trim())
      .filter(Boolean);
    delete gameData.grid;
    delete gameData.placements;
    delete gameData.items;
  } else {
    gameData.items = nextItems;
    if (['flashcards', 'memory_match', 'drag_drop'].includes(gameType)) {
      gameData.pairs = nextItems;
    }
    if (['crossword', 'puzzle_challenge'].includes(gameType)) {
      gameData.clues = nextItems;
    }
    if (['quiz_show', 'quiz_rush', 'spin_wheel', 'millionaire'].includes(gameType)) {
      gameData.rounds = nextItems;
    }
  }

  return normalizeGame({ ...current, gameData });
}

function gameItemDisplayText(item) {
  if (!item || typeof item !== 'object') return String(item || '');
  return String(
    item.question
      || item.prompt
      || item.clue
      || item.term
      || item.label
      || item.name
      || item.word
      || item.answer
      || ''
  ).trim();
}

function applyRewrittenGameItemText(item, text) {
  const value = String(text || '').trim();
  if (!item || typeof item !== 'object') return { word: value, term: value, answer: value };
  if (item.question != null || item.prompt != null) {
    return { ...item, question: value, prompt: value };
  }
  if (item.clue != null) {
    return { ...item, clue: value };
  }
  if (item.term != null || item.definition != null) {
    return { ...item, term: value, front: value };
  }
  if (item.label != null) {
    return { ...item, label: value };
  }
  if (item.name != null) {
    return { ...item, name: value };
  }
  if (item.word != null) {
    return { ...item, word: value, term: value, answer: value };
  }
  return { ...item, prompt: value, question: value };
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
  assertGameDataMatchesType(game.gameType, game.gameData);
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
        payload.requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      ]),
    });

    try {
      const generated = await AiService.generateQuiz({
        topic: payload.topic,
        difficulty: payload.difficulty,
        questionCount,
        questionType: payload.questionType || 'multiple_choice',
        gradeLevel: payload.gradeLevel || course.grade_level || "junior high school",
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
        try {
          const extras = await AiService.summarizeLesson(sourceText);
          lessonSummary = normalizeSummary(extras.summary);
          learningObjectives = normalizeObjectives(extras.learningObjectives);
        } catch (extraError) {
          // Quiz already succeeded — do not fail the whole generate for extras.
          console.error(
            'AI lesson summary skipped after quiz generate:',
            extraError?.message || extraError,
          );
        }
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

    const freeText = [payload.topic, payload.lessonContent]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join('\n\n')
      .trim();
    let sourceText = freeText;
    if (payload.lessonId) {
      const fromLesson = await lessonSourceText(payload.courseId, payload.lessonId);
      if (fromLesson) sourceText = fromLesson;
    }
    if (!sourceText || sourceText.length < 3) {
      throw new AppError(
        'Provide a topic, lesson text, or select a lesson to generate a game.',
        400,
      );
    }
    // Enrich short prompts so the model still has subject context.
    if (sourceText.length < 20) {
      const subject = course.subject || course.title || 'this subject';
      const grade = course.grade_level || 'junior high school';
      sourceText = `Topic: ${sourceText}\nSubject: ${subject}\nGrade level: ${grade}\nCreate an educational game about this topic for ${grade} students.`;
    }
    assertInputTextSize(sourceText, { label: 'Lesson content' });

    const itemCount = assertGameItemRequestCount(
      payload.itemCount ?? 6,
      payload.gameType || 'auto',
    );

    const usageEvent = await AiUsageService.beginOperation({
      userId: user.id,
      operationType: 'review_game',
      inputChars: String(sourceText || '').length,
      requestedQuantity: itemCount,
      idempotencyKey: buildIdempotencyKey([
        'from-game',
        user.id,
        payload.courseId,
        payload.lessonId || 'none',
        payload.gameType || 'auto',
        itemCount,
        crypto.createHash('sha256').update(String(sourceText || '')).digest('hex').slice(0, 16),
        // Unique per Generate click so intentional retries are never treated as duplicates.
        payload.requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      ]),
    });

    try {
      const generated = await GameService.generateAiGame(
        {
          ...payload,
          itemCount,
          topic: payload.topic || course.title,
          lessonContent: sourceText,
        },
        user,
      );
      if (!generated?.title) {
        throw new AppError('AI returned invalid content. Please try generating again.', 502);
      }

      const game = normalizeGame({
        ...generated,
        instructions: generated.description,
      });

      let lessonSummary = null;
      let learningObjectives = null;
      // Only attach lesson extras when linking to an existing lesson — keeps game drafts game-first.
      if (payload.lessonId && sourceText.length > 40) {
        try {
          const extras = await AiService.summarizeLesson(sourceText);
          lessonSummary = normalizeSummary(extras.summary);
          learningObjectives = normalizeObjectives(extras.learningObjectives);
        } catch (extraError) {
          console.error(
            'AI lesson summary skipped after game generate:',
            extraError?.message || extraError,
          );
        }
      }

      const draft = await this.createDraft({
        courseId: payload.courseId,
        lessonId: payload.lessonId || null,
        sourceType: 'ai_game',
        title: game.title,
        sourceText,
        quiz: null,
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

    const sourceType = String(payload.sourceType || 'lesson').toLowerCase();
    let sourceText = String(
      payload.extractedText || payload.lessonContent || '',
    ).trim();
    let lessonId = payload.lessonId || null;
    let topic = payload.topic || course.title;
    const questionCount = ['quiz', 'all'].includes(contentType)
      ? assertQuestionCount(payload.questionCount ?? 5)
      : null;
    const itemCount = ['game', 'all'].includes(contentType)
      ? assertGameItemRequestCount(payload.itemCount ?? 6, payload.gameType || 'auto')
      : null;

    if (sourceType === 'lesson' || sourceType === 'text') {
      // Prefer pasted lesson text; optional lessonId only links the published result.
      if (sourceText.length >= 40) {
        topic = payload.topic || sourceText.slice(0, 60).trim() || topic;
        if (payload.lessonId) {
          const lesson = await LessonModel.findById(payload.lessonId);
          if (!lesson || Number(lesson.course_id) !== Number(payload.courseId)) {
            throw new AppError('Lesson not found for this course', 404);
          }
          lessonId = lesson.id;
        }
      } else if (payload.lessonId) {
        const lesson = await LessonModel.findById(payload.lessonId);
        if (!lesson || Number(lesson.course_id) !== Number(payload.courseId)) {
          throw new AppError('Lesson not found for this course', 404);
        }
        lessonId = lesson.id;
        topic = lesson.title || topic;
        sourceText = [lesson.title, lesson.content, lesson.summary]
          .filter(Boolean)
          .join('\n\n')
          .trim();
      } else {
        throw new AppError(
          'Paste lesson text (at least 40 characters) to generate content.',
          400,
        );
      }
    } else if (payload.lessonId) {
      const lesson = await LessonModel.findById(payload.lessonId);
      if (!lesson || Number(lesson.course_id) !== Number(payload.courseId)) {
        throw new AppError('Lesson not found for this course', 404);
      }
      lessonId = lesson.id;
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
      requestedQuantity: questionCount ?? itemCount,
      idempotencyKey: buildIdempotencyKey([
        'from-content',
        user.id,
        payload.courseId,
        contentType,
        payload.sourceType,
        lessonId,
        questionCount,
        itemCount,
        payload.gameType || '',
        textFingerprint,
        payload.requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      ]),
    });

    try {
    if (needsQuiz) {
      const AiContentService = (await import('./AiContentService.js')).default;
      const generated = await AiContentService.generate({
        ...payload,
        contentType: 'quiz',
        questionCount,
        extractedText: sourceText,
        lessonId,
        topic,
      }, user, { skipUsageTracking: true });
      generationId = generated.generationId;
      source = generated.source;
      warning = generated.warning || null;
      quiz = normalizeQuiz(generated.generated);
    }

    if (needsGame) {
      const AiContentService = (await import('./AiContentService.js')).default;
      const gameGenerated = await AiContentService.generate({
        ...payload,
        contentType: 'game',
        itemCount,
        extractedText: sourceText,
        lessonId,
        topic,
      }, user, { skipUsageTracking: true });
      game = normalizeGame(gameGenerated.generated);
      generationId = generationId || gameGenerated.generationId;
      source = source || gameGenerated.source;
      warning = warning || gameGenerated.warning || null;
    }

    if (needsObjectives || needsSummary) {
      const extras = await AiService.summarizeLesson(sourceText);
      if (needsSummary) {
        lessonSummary = normalizeSummary(extras.summary);
      }
      if (needsObjectives) {
        learningObjectives = normalizeObjectives(extras.learningObjectives);
      }
      source = source || extras.source;
    } else if ((needsQuiz || needsGame) && lessonId) {
      // Optional lesson extras only when publishing will update a linked lesson.
      try {
        const extras = await AiService.summarizeLesson(sourceText);
        lessonSummary = normalizeSummary(extras.summary);
        learningObjectives = normalizeObjectives(extras.learningObjectives);
        source = source || extras.source;
      } catch (extraError) {
        console.error(
          'AI lesson summary skipped after content generate:',
          extraError?.message || extraError,
        );
      }
    }

    if (needsQuiz && !quiz) {
      throw new AppError('AI did not return a valid quiz. Please try again.', 502);
    }
    if (needsGame && !game) {
      throw new AppError('AI did not return a valid educational game. Please try again.', 502);
    }

    const draft = await this.createDraft({
      courseId: payload.courseId,
      lessonId,
      sourceType: 'ai_content',
      title: (quiz || game)?.title || topic || 'AI Content Review',
      sourceText,
      quiz: needsQuiz ? quiz : null,
      game: needsGame ? game : null,
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

    // AI Games drafts must publish a game — never a quiz.
    if (draft.sourceType === 'ai_game') {
      if (!draft.game) {
        throw new AppError('This game draft has no game to publish. Regenerate or edit the game first.', 400);
      }
      draft.quiz = null;
    }

    if (!draft.quiz && !draft.game && !draft.lessonSummary && !draft.learningObjectives) {
      throw new AppError('Nothing to publish in this draft', 400);
    }

    let quiz = null;
    let game = null;

    // Create game before quiz so a failed game publish cannot leave "quiz only" orphans
    // when the teacher intended a game (or both).
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
        payload.requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      ]),
    });

    try {
    if (draft.sourceType === 'ai_game' && (target === 'quiz' || target === 'selected_question')) {
      throw new AppError(
        'AI Games drafts can only regenerate game content, not quizzes.',
        400,
      );
    }

    if (target === 'all' || target === 'quiz') {
      if (draft.sourceType !== 'ai_game' && (draft.quiz || target === 'quiz')) {
        const questionCount = assertQuestionCount(
          payload.questionCount || draft.quiz?.questions?.length || 5
        );
        const generated = await AiService.generateContentQuiz({
          topic: draft.quiz?.title || course.title,
          lessonContent: sourceText || draft.quiz?.title || course.title,
          difficulty: draft.quiz?.difficulty || 'medium',
          questionCount,
          gradeLevel: course.grade_level || "junior high school",
        });
        updates.quiz = normalizeQuiz(generated);
      }
    }

    if (target === 'selected_question' && draft.quiz) {
      if (draft.sourceType === 'ai_game') {
        throw new AppError(
          'AI Games drafts can only regenerate game content, not quizzes.',
          400,
        );
      }
      const index = Number(payload.questionIndex);
      if (Number.isNaN(index) || index < 0 || index >= draft.quiz.questions.length) {
        throw new AppError('Invalid question index', 400);
      }
      const generated = await AiService.generateContentQuiz({
        topic: draft.quiz.title,
        lessonContent: sourceText || draft.quiz.title,
        difficulty: draft.quiz.difficulty || 'medium',
        questionCount: 1,
        gradeLevel: course.grade_level || "junior high school",
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
          gradeLevel: course.grade_level || "junior high school",
          lessonContent: sourceText || draft.game?.title || course.title,
        });
        updates.game = normalizeGame({
          ...generated,
          instructions: generated.description,
        });
      }
    }

    if (target === 'selected_game_item' && draft.game) {
      const { game: current, collection, items } = getGameItemCollection(draft.game);
      if (collection === 'jeopardy') {
        throw new AppError(
          'Regenerate Selected Game Item is not supported for Jeopardy. Use Regenerate All instead.',
          400,
        );
      }
      const index = Number(payload.itemIndex);
      if (Number.isNaN(index) || index < 0 || index >= items.length) {
        throw new AppError('Select a game item first, then try again.', 400);
      }
      const generated = await AiService.generateGame({
        topic: draft.game.title,
        gameType: current.gameType || 'flashcards',
        gradeLevel: course.grade_level || "junior high school",
        lessonContent: sourceText || draft.game.title,
      });
      const generatedList = getGameItemCollection(
        normalizeGame(generated),
      ).items;
      const replacement = generatedList[0];
      if (!replacement) {
        throw new AppError('AI did not return a replacement game item. Please try again.', 502);
      }
      const nextItems = [...items];
      nextItems[index] = {
        ...replacement,
        id: items[index]?.id || replacement.id || tempId('g'),
      };
      assertGameItemCount(nextItems.length);
      updates.game = withGameItems(current, nextItems, collection);
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
        gradeLevel: course.grade_level || "junior high school",
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
      const { game: current, collection, items } = getGameItemCollection(draft.game);
      if (collection === 'jeopardy') {
        throw new AppError(
          'Generate More Game Items is not supported for Jeopardy. Use Regenerate All instead.',
          400,
        );
      }
      const addCount = Math.min(Math.max(Number(payload.count) || 3, 1), 10);
      const generated = await AiService.generateGame({
        topic: draft.game.title,
        gameType: current.gameType || 'flashcards',
        gradeLevel: course.grade_level || "junior high school",
        lessonContent: sourceText || draft.game.title,
        itemCount: addCount,
      });
      const extra = getGameItemCollection(normalizeGame(generated)).items
        .slice(0, addCount)
        .map((item, i) => ({
          ...item,
          id: item.id || tempId(`g${i}`),
        }));
      if (!extra.length) {
        throw new AppError('AI did not return additional game items. Please try again.', 502);
      }
      const nextItems = [...items, ...extra];
      assertGameItemCount(nextItems.length);
      updates.game = withGameItems(current, nextItems, collection);
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
    let gameCollection = null;
    let gameItems = null;
    let gameItemIndex = null;
    const itemIndex = Number(payload.itemIndex);

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
    } else if (section === 'selected_game_item' && draft.game) {
      const resolved = getGameItemCollection(draft.game);
      gameCollection = resolved.collection;
      gameItems = resolved.items;
      gameItemIndex = itemIndex;
      if (resolved.collection === 'jeopardy') {
        source = draft.game?.instructions || draft.game?.description || '';
      } else if (
        Number.isInteger(itemIndex)
        && itemIndex >= 0
        && itemIndex < resolved.items.length
      ) {
        source = gameItemDisplayText(resolved.items[itemIndex]);
      }
      if (!source.trim()) {
        source = draft.game?.instructions || draft.game?.description || '';
      }
    } else {
      source = String(payload.text || '');
    }

    if (!source.trim()) throw new AppError('No text available to transform', 400);

    const instructionMap = {
      improve_writing: 'Improve clarity and academic quality while preserving meaning.',
      shorten: 'Make the text shorter and more concise.',
      expand: 'Expand the text with useful educational detail.',
      simplify: 'Simplify the language for junior high school students.',
      make_more_challenging: 'Rewrite to be more academically challenging.',
      make_easier: 'Rewrite to be easier for junior high school students.',
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
    } else if (section === 'selected_game_item' && draft.game) {
      if (
        gameCollection
        && gameCollection !== 'jeopardy'
        && Array.isArray(gameItems)
        && Number.isInteger(gameItemIndex)
        && gameItemIndex >= 0
        && gameItemIndex < gameItems.length
        && gameItemDisplayText(gameItems[gameItemIndex])
      ) {
        const nextItems = [...gameItems];
        nextItems[gameItemIndex] = applyRewrittenGameItemText(
          gameItems[gameItemIndex],
          text,
        );
        updates.game = withGameItems(draft.game, nextItems, gameCollection);
      } else {
        updates.game = {
          ...draft.game,
          instructions: text,
          description: text,
        };
      }
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
