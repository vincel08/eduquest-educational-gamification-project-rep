import CourseModel from "../models/CourseModel.js";
import QuizModel from "../models/QuizModel.js";
import QuizStudentOverrideModel from "../models/QuizStudentOverrideModel.js";
import NotificationModel from "../models/NotificationModel.js";
import GamificationService from "./GamificationService.js";
import GamificationModel from "../models/GamificationModel.js";
import CourseService from "./CourseService.js";
import AiService from "./AiService.js";
import AppError from "../utils/AppError.js";
import {
  questionImageApiPath,
  safeUnlinkUpload,
} from "../utils/uploadPaths.js";
import { assertQuestionCount } from "../utils/aiLimits.js";
import {
  assertContentUnlocked,
  getContentUnlockState,
  withUnlockState,
} from "../utils/contentUnlock.js";
import {
  assertQuizOpenForAttempt,
  buildAttemptMeta,
  buildFailPointers,
  isPastDue,
  MAX_EXTRA_ATTEMPTS_GRANT,
  QUIZ_REWARD_SCORE_MIN,
  resolveEffectiveDueAt,
  resolveMaxAttempts,
} from "../utils/quizAttemptRules.js";

function normalizeDueAt(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function resolveStudentQuizAccess(quiz, studentId) {
  const override = await QuizStudentOverrideModel.findByQuizAndStudent(
    quiz.id,
    studentId,
  );
  const attemptsUsed = await QuizModel.countCompletedAttempts(
    quiz.id,
    studentId,
  );
  const effectiveDueAt = resolveEffectiveDueAt(
    quiz.due_at,
    override?.extended_due_at,
    quiz,
  );
  const maxAttempts = resolveMaxAttempts(override?.extra_attempts);
  const meta = buildAttemptMeta({
    attemptsUsed,
    dueAt: effectiveDueAt,
    maxAttempts,
    classDueAt: quiz.due_at || null,
    extraAttempts: override?.extra_attempts || 0,
    hasOverride: Boolean(override),
  });
  return { override, attemptsUsed, effectiveDueAt, maxAttempts, meta };
}

async function withStudentQuizMeta(quizzes, studentId) {
  const enriched = [];
  for (const quiz of quizzes) {
    const { meta } = await resolveStudentQuizAccess(quiz, studentId);
    enriched.push({ ...quiz, ...meta });
  }
  return enriched;
}

function withSecureQuestionImage(question) {
  if (!question) return question;
  if (!question.image_url) return question;
  return {
    ...question,
    image_url: questionImageApiPath(question.id),
  };
}

function withSecureQuestionImages(questions) {
  return (questions || []).map(withSecureQuestionImage);
}

const SELECT_OPTION_TYPES = new Set([
  "multiple_choice",
  "true_false",
  "image_question",
]);
const SUPPORTED_QUESTION_TYPES = new Set([
  "multiple_choice",
  "true_false",
  "identification",
  "matching",
  "image_question",
]);

async function assertTeacherOwnsQuiz(quizId, user) {
  const quiz = await QuizModel.findById(quizId);
  if (!quiz) throw new AppError("Quiz not found", 404);

  if (user.role === "teacher" && Number(quiz.teacher_id) !== Number(user.id)) {
    throw new AppError("Access denied", 403);
  }

  return quiz;
}

function parseAnswerPayload(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asBoolFlag(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return value.length > 0 && Number(value[0]) === 1;
  }
  return Number(value) === 1;
}

function formatStudentAnswerDisplay(question, answer, optionsById) {
  if (!answer) {
    return {
      display: "—",
      selectedOptionId: null,
      textAnswer: null,
      answerPayload: null,
    };
  }

  if (answer.selected_option_id) {
    const option = optionsById.get(Number(answer.selected_option_id));
    return {
      display:
        option?.option_text ||
        answer.selected_option_text ||
        answer.joined_option_text ||
        answer.text_answer ||
        `Option #${answer.selected_option_id}`,
      selectedOptionId: Number(answer.selected_option_id),
      textAnswer: answer.text_answer || null,
      answerPayload: parseAnswerPayload(answer.answer_payload),
    };
  }

  const payload = parseAnswerPayload(answer.answer_payload);
  if (
    question?.question_type === "matching" &&
    payload &&
    typeof payload === "object"
  ) {
    const leftOptions = (question.options || []).filter(
      (option) => option.side === "left",
    );
    const rightById = new Map(
      (question.options || [])
        .filter((option) => option.side === "right")
        .map((option) => [Number(option.id), option.option_text]),
    );
    const pairs = leftOptions.map((left) => {
      const rightId = Number(payload[left.id] ?? payload[String(left.id)]);
      return `${left.option_text} → ${rightById.get(rightId) || "—"}`;
    });
    return {
      display: pairs.join("; ") || answer.text_answer || "—",
      selectedOptionId: null,
      textAnswer: answer.text_answer || null,
      answerPayload: payload,
    };
  }

  if (answer.selected_option_text || answer.joined_option_text) {
    return {
      display: answer.selected_option_text || answer.joined_option_text,
      selectedOptionId: null,
      textAnswer: answer.text_answer || null,
      answerPayload: payload,
    };
  }

  if (answer.text_answer) {
    return {
      display: answer.text_answer,
      selectedOptionId: null,
      textAnswer: answer.text_answer,
      answerPayload: payload,
    };
  }

  return {
    display: "—",
    selectedOptionId: null,
    textAnswer: null,
    answerPayload: payload,
  };
}

function formatCorrectAnswerDisplay(question) {
  const options = question.options || [];
  if (question.question_type === "matching") {
    const left = options.filter((option) => option.side === "left");
    const rightByKey = new Map(
      options
        .filter((option) => option.side === "right")
        .map((option) => [String(option.match_key), option.option_text]),
    );
    return (
      left
        .map(
          (item) =>
            `${item.option_text} → ${rightByKey.get(String(item.match_key)) || "—"}`,
        )
        .join("; ") || "—"
    );
  }

  if (question.question_type === "identification") {
    const accepted = options
      .filter(
        (option) =>
          Number(option.is_correct) === 1 || option.is_correct === true,
      )
      .map((option) => option.option_text)
      .filter(Boolean);
    return accepted.join(" / ") || "—";
  }

  const correct = options.find(
    (option) => Number(option.is_correct) === 1 || option.is_correct === true,
  );
  return correct?.option_text || "—";
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function optionText(option) {
  return String(
    option.optionText ?? option.option_text ?? option.text ?? "",
  ).trim();
}

function isOptionCorrect(option) {
  return Boolean(option.isCorrect || option.is_correct);
}

/**
 * Normalize teacher/AI question payloads into the persistable shape used by QuizModel.
 * Accepts convenience fields: textAnswer, acceptedAnswers, pairs, correctAnswer.
 */
function normalizeQuestionInput(question, orderIndex = 1) {
  const type =
    question.questionType || question.question_type || "multiple_choice";
  const rawImageUrl = question.imageUrl ?? question.image_url ?? null;
  const imageUrl =
    rawImageUrl && !String(rawImageUrl).startsWith("/api/")
      ? rawImageUrl
      : null;

  const normalized = {
    id: question.id || null,
    questionText: String(
      question.questionText ?? question.question_text ?? "",
    ).trim(),
    questionType: type,
    points: Number(question.points) > 0 ? Number(question.points) : 1,
    explanation: question.explanation ?? null,
    orderIndex: question.orderIndex || question.order_index || orderIndex,
    imageUrl,
    options: Array.isArray(question.options) ? [...question.options] : [],
  };

  if (type === "identification") {
    if (!normalized.options.length && question.textAnswer) {
      normalized.options = [
        { optionText: String(question.textAnswer).trim(), isCorrect: true },
      ];
    }
    if (
      Array.isArray(question.acceptedAnswers) &&
      question.acceptedAnswers.length
    ) {
      normalized.options = question.acceptedAnswers
        .map((answer) => String(answer || "").trim())
        .filter(Boolean)
        .map((answer) => ({ optionText: answer, isCorrect: true }));
    }
  }

  if (
    type === "matching" &&
    Array.isArray(question.pairs) &&
    question.pairs.length
  ) {
    normalized.options = [];
    question.pairs.forEach((pair, index) => {
      const key = String(pair.matchKey || pair.match_key || `p${index + 1}`);
      normalized.options.push({
        optionText: String(pair.left || "").trim(),
        side: "left",
        matchKey: key,
        isCorrect: false,
      });
      normalized.options.push({
        optionText: String(pair.right || "").trim(),
        side: "right",
        matchKey: key,
        isCorrect: false,
      });
    });
  }

  if (type === "true_false" && normalized.options.length !== 2) {
    const raw = question.correctAnswer ?? question.correct_answer;
    const correctIsTrue =
      raw === true ||
      String(raw).toLowerCase() === "true" ||
      String(raw).toLowerCase() === "t";
    normalized.options = [
      { optionText: "True", isCorrect: correctIsTrue },
      { optionText: "False", isCorrect: !correctIsTrue },
    ];
  }

  return normalized;
}

function validateQuestionPayload(question) {
  const type =
    question.questionType || question.question_type || "multiple_choice";
  const questionText = String(
    question.questionText ?? question.question_text ?? "",
  ).trim();
  const options = Array.isArray(question.options) ? question.options : [];

  if (!SUPPORTED_QUESTION_TYPES.has(type)) {
    throw new AppError(`Unsupported question type: ${type}`, 400);
  }

  if (!questionText) {
    throw new AppError("Question text is required", 400);
  }

  if (SELECT_OPTION_TYPES.has(type)) {
    if (options.length < 2) {
      throw new AppError("A question must have at least two options", 400);
    }
    if (type === "true_false" && options.length !== 2) {
      throw new AppError(
        "True/False questions must have exactly two options",
        400,
      );
    }
    if (options.some((option) => !optionText(option))) {
      throw new AppError("Options cannot be empty", 400);
    }
    const correctCount = options.filter((option) =>
      isOptionCorrect(option),
    ).length;
    if (correctCount !== 1) {
      throw new AppError("Exactly one option must be marked correct", 400);
    }
    return;
  }

  if (type === "identification") {
    if (!options.length) {
      throw new AppError(
        "Identification questions need at least one accepted answer",
        400,
      );
    }
    if (options.some((option) => !optionText(option))) {
      throw new AppError("Accepted answers cannot be empty", 400);
    }
    return;
  }

  if (type === "matching") {
    if (options.length < 4 || options.length % 2 !== 0) {
      throw new AppError(
        "Matching questions need an even number of options (at least 4)",
        400,
      );
    }
    if (options.some((option) => !optionText(option))) {
      throw new AppError("Matching pair text cannot be empty", 400);
    }
    const left = options.filter((option) => (option.side || "none") === "left");
    const right = options.filter(
      (option) => (option.side || "none") === "right",
    );
    if (left.length !== right.length || left.length === 0) {
      throw new AppError(
        "Matching questions need equal left and right options",
        400,
      );
    }
    for (const leftOption of left) {
      const key = leftOption.matchKey ?? leftOption.match_key;
      if (!key) {
        throw new AppError("Matching options require matchKey values", 400);
      }
      const pair = right.find(
        (option) => (option.matchKey ?? option.match_key) === key,
      );
      if (!pair) {
        throw new AppError(`No matching right option for key ${key}`, 400);
      }
    }
  }
}

function storedQuestionToPayload(question) {
  return {
    questionText: question.question_text,
    questionType: question.question_type,
    points: question.points,
    explanation: question.explanation,
    orderIndex: question.order_index,
    imageUrl: question.image_url,
    options: (question.options || []).map((option) => ({
      optionText: option.option_text,
      isCorrect: Boolean(option.is_correct),
      matchKey: option.match_key,
      side: option.side,
    })),
  };
}

async function assertQuizPublishReady(quizId) {
  const quiz = await QuizModel.findById(quizId);
  if (!quiz) throw new AppError("Quiz not found", 404);

  if (!String(quiz.title || "").trim()) {
    throw new AppError("Quiz title is required before publishing", 400);
  }
  if (!quiz.course_id) {
    throw new AppError(
      "Quiz must be linked to a course before publishing",
      400,
    );
  }

  const questions = await QuizModel.getQuestions(quizId, {
    includeCorrect: true,
  });
  if (!questions.length) {
    throw new AppError("Publish requires at least one question", 400);
  }

  for (const question of questions) {
    validateQuestionPayload(storedQuestionToPayload(question));
    if (question.question_type === "image_question" && !question.image_url) {
      throw new AppError(
        "Image questions require an uploaded image before publishing",
        400,
      );
    }
  }

  return { quiz, questions };
}

function scoreQuestion(question, answer) {
  const type = question.question_type;

  if (SELECT_OPTION_TYPES.has(type)) {
    const selectedOptionId = answer?.selectedOptionId || null;
    const selected = question.options.find(
      (option) => Number(option.id) === Number(selectedOptionId),
    );
    const isCorrect = Boolean(selected && selected.is_correct);
    return {
      isCorrect,
      selectedOptionId,
      selectedOptionText: selected ? optionText(selected) : null,
      textAnswer: selected ? optionText(selected) : null,
      answerPayload: null,
    };
  }

  if (type === "identification") {
    const textAnswer = String(answer?.textAnswer || "").trim();
    const accepted = question.options
      .filter((option) => option.is_correct)
      .map((option) => normalizeText(option.option_text));
    const isCorrect =
      Boolean(textAnswer) && accepted.includes(normalizeText(textAnswer));
    return {
      isCorrect,
      selectedOptionId: null,
      selectedOptionText: null,
      textAnswer: textAnswer || null,
      answerPayload: null,
    };
  }

  if (type === "matching") {
    const payload =
      answer?.answerPayload && typeof answer.answerPayload === "object"
        ? answer.answerPayload
        : {};
    const leftOptions = question.options.filter(
      (option) => option.side === "left",
    );
    const rightOptions = question.options.filter(
      (option) => option.side === "right",
    );

    let isCorrect = leftOptions.length > 0;
    const pairLabels = [];
    for (const left of leftOptions) {
      const rightId = payload[String(left.id)] ?? payload[left.id];
      const right = rightOptions.find(
        (option) => Number(option.id) === Number(rightId),
      );
      pairLabels.push(
        `${optionText(left)} → ${right ? optionText(right) : "—"}`,
      );
      if (!right || right.match_key !== left.match_key) {
        isCorrect = false;
      }
    }

    return {
      isCorrect,
      selectedOptionId: null,
      selectedOptionText: null,
      textAnswer: pairLabels.join("; ") || null,
      answerPayload: payload,
    };
  }

  return {
    isCorrect: false,
    selectedOptionId: null,
    selectedOptionText: null,
    textAnswer: null,
    answerPayload: null,
  };
}

const QuizService = {
  async createQuiz(data, user) {
    const course = await CourseModel.findById(data.courseId);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && course.teacher_id !== user.id) {
      throw new AppError("Access denied", 403);
    }

    // Always create as draft first; publish only after questions validate.
    let quiz = await QuizModel.create({
      ...data,
      dueAt: normalizeDueAt(data.dueAt) ?? null,
      passingScore: data.passingScore ?? 70,
      isPublished: false,
      isAiGenerated: Boolean(data.isAiGenerated),
      createdBy: user.id,
    });

    if (Array.isArray(data.questions)) {
      for (let i = 0; i < data.questions.length; i += 1) {
        const question = normalizeQuestionInput(data.questions[i], i + 1);
        validateQuestionPayload(question);
        await QuizModel.addQuestion(quiz.id, question);
      }
    }

    if (data.isPublished) {
      await assertQuizPublishReady(quiz.id);
      quiz = await QuizModel.update(quiz.id, {
        isPublished: true,
        updatedBy: user.id,
      });
    }

    const questions = withSecureQuestionImages(
      await QuizModel.getQuestions(quiz.id, { includeCorrect: true }),
    );
    return { ...quiz, questions };
  },

  async generateAiQuiz(payload, user) {
    const course = await CourseModel.findById(payload.courseId);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && course.teacher_id !== user.id) {
      throw new AppError("Access denied", 403);
    }

    const questionCount = assertQuestionCount(payload.questionCount ?? 5);

    const generated = await AiService.generateQuiz({
      topic: payload.topic,
      difficulty: payload.difficulty,
      questionCount,
      questionType: payload.questionType || "multiple_choice",
      gradeLevel: payload.gradeLevel || course.grade_level || "junior high school",
    });

    const quiz = await this.createQuiz(
      {
        courseId: payload.courseId,
        lessonId: payload.lessonId || null,
        title: payload.title || generated.title,
        description: payload.description || generated.description,
        timeLimitMinutes: payload.timeLimitMinutes || 15,
        passingScore: payload.passingScore ?? 70,
        xpReward: payload.xpReward || 50,
        dueAt: payload.dueAt ?? null,
        isAiGenerated: true,
        isPublished: payload.isPublished || false,
        questions: generated.questions,
      },
      user,
    );

    return {
      ...quiz,
      source: generated.source,
      warning: generated.warning || null,
    };
  },

  async getQuizById(id, user) {
    const quiz = await QuizModel.findById(id);
    if (!quiz) throw new AppError("Quiz not found", 404);

    if (user.role === "student" && !quiz.is_published) {
      throw new AppError("Quiz is not available", 403);
    }

    if (user.role === "student") {
      await CourseService.assertStudentCourseAccess(quiz.course_id, user.id);
      const unlock = await getContentUnlockState({
        courseId: quiz.course_id,
        lessonId: quiz.lesson_id,
        studentId: user.id,
      });
      const includeCorrect = false;
      const questions = withSecureQuestionImages(
        await QuizModel.getQuestions(id, { includeCorrect }),
      );
      return {
        ...quiz,
        questions: unlock.locked ? [] : questions,
        locked: unlock.locked,
        requiredLessonId: unlock.requiredLessonId,
        requiredLessonTitle: unlock.requiredLessonTitle,
        unlockMessage: unlock.unlockMessage,
      };
    }

    if (user.role === "teacher" && quiz.teacher_id !== user.id) {
      throw new AppError("Access denied", 403);
    }

    const includeCorrect = user.role !== "student";
    const questions = withSecureQuestionImages(
      await QuizModel.getQuestions(id, { includeCorrect }),
    );
    return { ...quiz, questions };
  },

  async listByCourse(courseId, user) {
    if (user.role === "student") {
      await CourseService.assertStudentCourseAccess(courseId, user.id);
    }
    const publishedOnly = user.role === "student";
    const quizzes = await QuizModel.findByCourse(courseId, { publishedOnly });
    if (user.role === "student") {
      const unlocked = await withUnlockState(quizzes, user.id);
      return withStudentQuizMeta(unlocked, user.id);
    }
    return quizzes;
  },

  async listForTeacher(user, filters = {}) {
    if (user.role !== "teacher" && user.role !== "administrator") {
      throw new AppError("Access denied", 403);
    }

    const courseFilters = {
      teacherId: user.role === "teacher" ? user.id : undefined,
      limit: 200,
      page: 1,
    };
    if (filters.gradeLevel && filters.gradeLevel !== "all") {
      courseFilters.gradeLevel = filters.gradeLevel;
    }

    const { courses: courseList } = await CourseModel.findAll(courseFilters);

    const quizzes = [];
    for (const course of courseList) {
      const courseQuizzes = await QuizModel.findByCourse(course.id, {
        publishedOnly: false,
      });
      for (const quiz of courseQuizzes) {
        quizzes.push({
          ...quiz,
          course_title: course.title,
          grade_level: course.grade_level,
        });
      }
    }

    quizzes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return quizzes;
  },

  async updateQuiz(id, data, user) {
    await assertTeacherOwnsQuiz(id, user);

    if (Array.isArray(data.questions)) {
      await this.replaceQuestions(id, data.questions, user);
    }

    const meta = { ...data };
    delete meta.questions;
    if (meta.dueAt !== undefined) {
      meta.dueAt = normalizeDueAt(meta.dueAt);
    }

    if (meta.isPublished === true) {
      await assertQuizPublishReady(id);
    }

    const quiz = await QuizModel.update(id, { ...meta, updatedBy: user.id });
    const questions = withSecureQuestionImages(
      await QuizModel.getQuestions(id, { includeCorrect: true }),
    );
    return { ...quiz, questions };
  },

  async publishQuiz(id, user) {
    await assertTeacherOwnsQuiz(id, user);
    await assertQuizPublishReady(id);
    const quiz = await QuizModel.update(id, {
      isPublished: true,
      updatedBy: user.id,
    });
    const questions = withSecureQuestionImages(
      await QuizModel.getQuestions(id, { includeCorrect: true }),
    );
    return { ...quiz, questions };
  },

  async unpublishQuiz(id, user) {
    await assertTeacherOwnsQuiz(id, user);
    const quiz = await QuizModel.update(id, {
      isPublished: false,
      updatedBy: user.id,
    });
    const questions = withSecureQuestionImages(
      await QuizModel.getQuestions(id, { includeCorrect: true }),
    );
    return { ...quiz, questions };
  },

  async deleteQuiz(id, user) {
    await assertTeacherOwnsQuiz(id, user);
    const questions = await QuizModel.getQuestions(id, {
      includeCorrect: true,
    });
    for (const question of questions) {
      if (question.image_url) {
        safeUnlinkUpload(question.image_url);
      }
    }
    await QuizModel.delete(id);
    return true;
  },

  async addQuestion(quizId, question, user) {
    await assertTeacherOwnsQuiz(quizId, user);
    const existing = await QuizModel.getQuestions(quizId, {
      includeCorrect: true,
    });
    const normalized = normalizeQuestionInput(question, existing.length + 1);
    validateQuestionPayload(normalized);
    return withSecureQuestionImage(
      await QuizModel.addQuestion(quizId, normalized),
    );
  },

  async updateQuestion(quizId, questionId, question, user) {
    await assertTeacherOwnsQuiz(quizId, user);
    const existing = await QuizModel.getQuestionWithOptions(questionId);
    if (!existing || Number(existing.quiz_id) !== Number(quizId)) {
      throw new AppError("Question not found", 404);
    }

    const normalized = normalizeQuestionInput(
      {
        ...question,
        imageUrl: question.imageUrl ?? question.image_url ?? existing.image_url,
        orderIndex:
          question.orderIndex || question.order_index || existing.order_index,
      },
      existing.order_index,
    );
    validateQuestionPayload(normalized);
    return withSecureQuestionImage(
      await QuizModel.updateQuestion(questionId, normalized),
    );
  },

  async deleteQuestion(quizId, questionId, user) {
    await assertTeacherOwnsQuiz(quizId, user);
    const existing = await QuizModel.getQuestionWithOptions(questionId);
    if (!existing || Number(existing.quiz_id) !== Number(quizId)) {
      throw new AppError("Question not found", 404);
    }
    if (existing.image_url) {
      safeUnlinkUpload(existing.image_url);
    }
    await QuizModel.deleteQuestion(questionId);
    return true;
  },

  async replaceQuestions(quizId, questions, user) {
    await assertTeacherOwnsQuiz(quizId, user);

    if (!Array.isArray(questions)) {
      throw new AppError("Questions must be an array", 400);
    }

    const existing = await QuizModel.getQuestions(quizId, {
      includeCorrect: true,
    });
    const existingById = new Map(
      existing.map((question) => [Number(question.id), question]),
    );

    const normalizedList = questions.map((question, index) => {
      const normalized = normalizeQuestionInput(question, index + 1);
      const prior = question.id ? existingById.get(Number(question.id)) : null;
      if (
        prior &&
        prior.question_type === "image_question" &&
        !normalized.imageUrl &&
        prior.image_url
      ) {
        normalized.imageUrl = prior.image_url;
      }
      validateQuestionPayload(normalized);
      return normalized;
    });

    for (const question of existing) {
      if (question.image_url) {
        const stillUsed = normalizedList.some(
          (item) => item.imageUrl && item.imageUrl === question.image_url,
        );
        if (!stillUsed) {
          safeUnlinkUpload(question.image_url);
        }
      }
    }

    await QuizModel.deleteQuestionsByQuizId(quizId);

    const created = [];
    for (const question of normalizedList) {
      created.push(await QuizModel.addQuestion(quizId, question));
    }

    return withSecureQuestionImages(created);
  },

  async reorderQuestions(quizId, orderedIds, user) {
    await assertTeacherOwnsQuiz(quizId, user);
    if (!Array.isArray(orderedIds) || !orderedIds.length) {
      throw new AppError("orderedIds must be a non-empty array", 400);
    }

    const existing = await QuizModel.getQuestions(quizId, {
      includeCorrect: true,
    });
    const existingIds = new Set(
      existing.map((question) => Number(question.id)),
    );
    const ids = orderedIds.map((id) => Number(id));

    if (
      ids.length !== existing.length ||
      ids.some((id) => !existingIds.has(id))
    ) {
      throw new AppError(
        "orderedIds must include every question exactly once",
        400,
      );
    }

    await QuizModel.reorderQuestions(quizId, ids);
    return withSecureQuestionImages(
      await QuizModel.getQuestions(quizId, { includeCorrect: true }),
    );
  },

  /** Teacher preview: full quiz with answers. Never starts attempts or awards XP. */
  async previewQuiz(id, user) {
    if (user.role === "student") {
      throw new AppError(
        "Students cannot preview unpublished teacher drafts this way",
        403,
      );
    }
    return this.getQuizById(id, user);
  },

  async attachQuestionImage(questionId, imageUrl, user) {
    const question = await QuizModel.getQuestionWithOptions(questionId);
    if (!question) throw new AppError("Question not found", 404);

    await assertTeacherOwnsQuiz(question.quiz_id, user);

    if (question.question_type !== "image_question") {
      throw new AppError(
        "Only image questions can receive an image upload",
        400,
      );
    }

    if (question.image_url && question.image_url !== imageUrl) {
      safeUnlinkUpload(question.image_url);
    }

    return withSecureQuestionImage(
      await QuizModel.updateQuestionImage(questionId, imageUrl),
    );
  },

  async startAttempt(quizId, studentId) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz || !quiz.is_published) {
      throw new AppError("Quiz not available", 404);
    }

    const enrolled = await CourseModel.isEnrolled(quiz.course_id, studentId);
    if (!enrolled) throw new AppError("Enroll in the course first", 403);

    await CourseService.assertStudentCourseAccess(quiz.course_id, studentId);

    await assertContentUnlocked({
      courseId: quiz.course_id,
      lessonId: quiz.lesson_id,
      studentId,
      contentLabel: "quiz",
    });

    const { attemptsUsed, effectiveDueAt, maxAttempts, meta } =
      await resolveStudentQuizAccess(quiz, studentId);

    assertQuizOpenForAttempt(attemptsUsed, {
      effectiveDueAt,
      maxAttempts,
    });

    const questions = withSecureQuestionImages(
      await QuizModel.getQuestions(quizId, { includeCorrect: false }),
    );

    let attempt = await QuizModel.findOpenAttempt(quizId, studentId);
    if (!attempt) {
      attempt = await QuizModel.createAttempt({ quizId, studentId });
    }

    return { attempt, quiz, questions, ...meta };
  },

  async submitAttempt(attemptId, answers, studentId) {
    const attempt = await QuizModel.findAttemptById(attemptId);
    if (!attempt || attempt.student_id !== studentId) {
      throw new AppError("Attempt not found", 404);
    }

    if (attempt.completed_at) {
      throw new AppError("Attempt already submitted", 400);
    }

    const quiz = await QuizModel.findById(attempt.quiz_id);
    await CourseService.assertStudentCourseAccess(quiz.course_id, studentId);
    await assertContentUnlocked({
      courseId: quiz.course_id,
      lessonId: quiz.lesson_id,
      studentId,
      contentLabel: "quiz",
    });
    const questions = await QuizModel.getQuestions(attempt.quiz_id, {
      includeCorrect: true,
    });

    let earnedPoints = 0;
    let totalPoints = 0;
    let perfect = true;
    const wrongQuestionIds = [];

    for (const question of questions) {
      totalPoints += question.points;
      const answer = answers.find(
        (item) => Number(item.questionId) === Number(question.id),
      );
      const scored = scoreQuestion(question, answer);
      const pointsEarned = scored.isCorrect ? question.points : 0;

      if (!scored.isCorrect) {
        perfect = false;
        wrongQuestionIds.push(question.id);
      }
      earnedPoints += pointsEarned;

      await QuizModel.saveAnswer({
        attemptId,
        questionId: question.id,
        questionText: question.question_text,
        selectedOptionId: scored.selectedOptionId,
        selectedOptionText: scored.selectedOptionText,
        textAnswer: scored.textAnswer,
        answerPayload: scored.answerPayload,
        isCorrect: scored.isCorrect ? 1 : 0,
        pointsEarned,
      });
    }

    const score = totalPoints
      ? Number(((earnedPoints / totalPoints) * 100).toFixed(2))
      : 0;
    const isPassed = score >= quiz.passing_score;
    const computedXp = isPassed
      ? quiz.xp_reward
      : Math.floor(quiz.xp_reward * 0.25);
    const qualifiesForRewards = score >= QUIZ_REWARD_SCORE_MIN;

    // Base quiz XP is one-time per student+quiz (retries allowed, no XP farming).
    let xpAward = null;
    let xpEarned = 0;
    let xpAlreadyAwarded = false;

    if (computedXp > 0) {
      const xpResult = await GamificationService.awardXpOnce({
        studentId,
        amount: computedXp,
        sourceType: "quiz",
        sourceId: quiz.id,
        description: `Quiz attempt: ${quiz.title}`,
        evaluateAchievements: false,
      });
      xpAlreadyAwarded = Boolean(xpResult.alreadyAwarded);
      if (!xpResult.alreadyAwarded) {
        xpAward = xpResult.xpAward;
        xpEarned = computedXp;
      }
    }

    const completed = await QuizModel.completeAttempt(attemptId, {
      score,
      totalPoints,
      earnedPoints,
      xpEarned,
      isPassed: isPassed ? 1 : 0,
    });

    if (qualifiesForRewards) {
      const newlyUnlocked =
        await GamificationService.evaluateAchievements(studentId);
      if (xpAward) {
        xpAward = { ...xpAward, newlyUnlocked };
      } else if (newlyUnlocked.badges.length || newlyUnlocked.medals.length) {
        xpAward = { newlyUnlocked };
      }
    }

    let perfectMedal = null;
    let perfectMedalAwarded = false;
    if (qualifiesForRewards && perfect && totalPoints > 0) {
      const medals = await GamificationModel.findAllMedals({
        activeOnly: true,
      });
      const medal = medals.find(
        (item) => item.criteria_type === "perfect_quiz",
      );
      if (medal) {
        const awarded = await GamificationService.awardMedalManually({
          studentId,
          medalId: medal.id,
          awardedBy: null,
        });
        perfectMedal = awarded;
        perfectMedalAwarded = Boolean(awarded?.isNew);
      }
    }

    const { meta } = await resolveStudentQuizAccess(quiz, studentId);
    const reviewItems = !isPassed
      ? buildFailPointers(questions, wrongQuestionIds)
      : [];

    return {
      attempt: completed,
      score,
      isPassed,
      xpAward,
      xpAlreadyAwarded,
      computedXp,
      perfect,
      perfectMedalAwarded,
      perfectMedal,
      reviewItems,
      ...meta,
    };
  },

  async getStudentAttempts(studentId, quizId = null) {
    return QuizModel.getStudentAttempts(studentId, quizId);
  },

  async getAttemptReview(quizId, attemptId, user) {
    const quiz = await assertTeacherOwnsQuiz(quizId, user);
    const attempt = await QuizModel.findAttemptWithStudent(attemptId);
    if (!attempt || Number(attempt.quiz_id) !== Number(quizId)) {
      throw new AppError("Attempt not found", 404);
    }
    if (!attempt.completed_at) {
      throw new AppError("Attempt is not completed yet", 400);
    }

    const [questions, answers] = await Promise.all([
      QuizModel.getQuestions(quizId, { includeCorrect: true }),
      QuizModel.getAnswersForAttempt(attemptId),
    ]);

    const answersByQuestionId = new Map(
      answers
        .filter((answer) => answer.question_id != null)
        .map((answer) => [Number(answer.question_id), answer]),
    );
    const optionsById = new Map();
    for (const question of questions) {
      for (const option of question.options || []) {
        optionsById.set(Number(option.id), option);
      }
    }

    const secureQuestions = withSecureQuestionImages(questions);
    const matchedQuestionIds = new Set();

    const itemsFromQuestions = secureQuestions.map((question) => {
      const answer = answersByQuestionId.get(Number(question.id)) || null;
      if (answer) matchedQuestionIds.add(Number(answer.id));
      const studentAnswer = formatStudentAnswerDisplay(
        question,
        answer,
        optionsById,
      );
      const isCorrect = answer ? asBoolFlag(answer.is_correct) : null;
      return {
        questionId: question.id,
        questionText: question.question_text,
        questionType: question.question_type,
        points: question.points,
        imageUrl: question.image_url || null,
        explanation: question.explanation || null,
        options: (question.options || []).map((option) => ({
          id: option.id,
          optionText: option.option_text,
          isCorrect: asBoolFlag(option.is_correct),
          side: option.side || null,
          matchKey: option.match_key || null,
        })),
        correctAnswer: formatCorrectAnswerDisplay(question),
        studentAnswer: studentAnswer.display,
        selectedOptionId: studentAnswer.selectedOptionId,
        textAnswer: studentAnswer.textAnswer,
        answerPayload: studentAnswer.answerPayload,
        isCorrect,
        pointsEarned: answer ? Number(answer.points_earned) || 0 : null,
        answerStored: Boolean(answer),
      };
    });

    // Keep historical answers even if the quiz questions were later replaced.
    const orphanItems = answers
      .filter((answer) => !matchedQuestionIds.has(Number(answer.id)))
      .map((answer, index) => {
        const studentAnswer = formatStudentAnswerDisplay(
          { question_type: null, options: [] },
          answer,
          optionsById,
        );
        return {
          questionId: answer.question_id,
          questionText:
            answer.question_text || `Question ${index + 1} (from this attempt)`,
          questionType: "recorded",
          points: Number(answer.points_earned) || 0,
          imageUrl: null,
          explanation: null,
          options: [],
          correctAnswer: "—",
          studentAnswer: studentAnswer.display,
          selectedOptionId: studentAnswer.selectedOptionId,
          textAnswer: studentAnswer.textAnswer,
          answerPayload: studentAnswer.answerPayload,
          isCorrect: asBoolFlag(answer.is_correct),
          pointsEarned: Number(answer.points_earned) || 0,
          answerStored: true,
        };
      });

    const hasMatchedAnswers = itemsFromQuestions.some(
      (item) => item.answerStored,
    );
    const items = hasMatchedAnswers
      ? itemsFromQuestions
      : orphanItems.length
        ? orphanItems
        : itemsFromQuestions;

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        courseId: quiz.course_id,
        passingScore: quiz.passing_score,
      },
      attempt: {
        id: attempt.id,
        studentId: attempt.student_id,
        studentFirstName: attempt.first_name,
        studentLastName: attempt.last_name,
        studentEmail: attempt.email || null,
        studentUsername: attempt.username || null,
        score: attempt.score,
        earnedPoints: attempt.earned_points,
        totalPoints: attempt.total_points,
        isPassed: asBoolFlag(attempt.is_passed),
        xpEarned: attempt.xp_earned || 0,
        completedAt: attempt.completed_at,
      },
      answersAvailable: answers.length > 0,
      answerCount: answers.length,
      items,
    };
  },

  async getHint(questionText, topic) {
    return AiService.generateHint({ questionText, topic });
  },

  async listStudentOverrides(quizId, user) {
    await assertTeacherOwnsQuiz(quizId, user);
    const rows = await QuizStudentOverrideModel.findByQuiz(quizId);
    return rows.map((row) => ({
      id: row.id,
      quizId: row.quiz_id,
      studentId: row.student_id,
      studentName: `${row.first_name} ${row.last_name}`.trim(),
      studentEmail: row.email || null,
      extendedDueAt: row.extended_due_at,
      extraAttempts: Number(row.extra_attempts || 0),
      reason: row.reason,
      grantedBy: row.granted_by,
      granterName: `${row.granter_first_name} ${row.granter_last_name}`.trim(),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async grantStudentOverride(quizId, payload, user) {
    const quiz = await assertTeacherOwnsQuiz(quizId, user);
    const studentId = Number(payload.studentId);
    if (!studentId) throw new AppError("studentId is required", 400);

    const enrolled = await CourseModel.isEnrolled(quiz.course_id, studentId);
    if (!enrolled) {
      throw new AppError("Student is not enrolled in this subject", 400);
    }

    const extraAttempts = Math.max(0, Number(payload.extraAttempts) || 0);
    if (extraAttempts > MAX_EXTRA_ATTEMPTS_GRANT) {
      throw new AppError(
        `extraAttempts cannot exceed ${MAX_EXTRA_ATTEMPTS_GRANT}`,
        400,
      );
    }

    const extendedDueAt = normalizeDueAt(
      payload.extendedDueAt === undefined ? null : payload.extendedDueAt,
    );

    if (!extendedDueAt && extraAttempts <= 0) {
      throw new AppError(
        "Provide an extended due date and/or extra attempts",
        400,
      );
    }

    if (isPastDue(quiz.due_at) && !extendedDueAt) {
      throw new AppError(
        "This quiz is past the class due date — set an extended due date to reopen access.",
        400,
      );
    }

    const reason = String(payload.reason || "")
      .trim()
      .slice(0, 500) || null;
    const override = await QuizStudentOverrideModel.upsert({
      quizId,
      studentId,
      extendedDueAt,
      extraAttempts,
      reason,
      grantedBy: user.id,
    });

    const dueLabel = extendedDueAt
      ? new Date(extendedDueAt).toLocaleString()
      : "class due date";
    await NotificationModel.create({
      userId: studentId,
      title: "Quiz access extended",
      message: `Your teacher extended access for "${quiz.title}" (${extraAttempts} extra attempt(s), due: ${dueLabel}).`,
      type: "quiz",
      link: `/student/quizzes/${quiz.id}`,
    });

    return {
      quizId: Number(quiz.id),
      studentId,
      extendedDueAt: override.extended_due_at,
      extraAttempts: Number(override.extra_attempts || 0),
      reason: override.reason,
      grantedBy: override.granted_by,
      updatedAt: override.updated_at,
    };
  },

  async removeStudentOverride(quizId, studentId, user) {
    await assertTeacherOwnsQuiz(quizId, user);
    await QuizStudentOverrideModel.remove(quizId, Number(studentId));
    return true;
  },
};

export default QuizService;
