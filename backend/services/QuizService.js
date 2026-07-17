import CourseModel from '../models/CourseModel.js';
import QuizModel from '../models/QuizModel.js';
import GamificationService from './GamificationService.js';
import GamificationModel from '../models/GamificationModel.js';
import AiService from './AiService.js';
import AppError from '../utils/AppError.js';

const SELECT_OPTION_TYPES = new Set(['multiple_choice', 'true_false', 'image_question']);

async function assertTeacherOwnsQuiz(quizId, user) {
  const quiz = await QuizModel.findById(quizId);
  if (!quiz) throw new AppError('Quiz not found', 404);

  if (user.role === 'teacher' && quiz.teacher_id !== user.id) {
    throw new AppError('Access denied', 403);
  }

  return quiz;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function validateQuestionPayload(question) {
  const type = question.questionType || 'multiple_choice';
  const options = Array.isArray(question.options) ? question.options : [];

  if (SELECT_OPTION_TYPES.has(type)) {
    if (options.length < 2) {
      throw new AppError('A question must have at least two options', 400);
    }
    if (type === 'true_false' && options.length !== 2) {
      throw new AppError('True/False questions must have exactly two options', 400);
    }
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      throw new AppError('Exactly one option must be marked correct', 400);
    }
    return;
  }

  if (type === 'identification') {
    if (!options.length) {
      throw new AppError('Identification questions need at least one accepted answer', 400);
    }
    return;
  }

  if (type === 'matching') {
    if (options.length < 4 || options.length % 2 !== 0) {
      throw new AppError('Matching questions need an even number of options (at least 4)', 400);
    }
    const left = options.filter((option) => option.side === 'left');
    const right = options.filter((option) => option.side === 'right');
    if (left.length !== right.length || left.length === 0) {
      throw new AppError('Matching questions need equal left and right options', 400);
    }
    for (const leftOption of left) {
      if (!leftOption.matchKey) {
        throw new AppError('Matching options require matchKey values', 400);
      }
      const pair = right.find((option) => option.matchKey === leftOption.matchKey);
      if (!pair) {
        throw new AppError(`No matching right option for key ${leftOption.matchKey}`, 400);
      }
    }
  }
}

function scoreQuestion(question, answer) {
  const type = question.question_type;

  if (SELECT_OPTION_TYPES.has(type)) {
    const selectedOptionId = answer?.selectedOptionId || null;
    const selected = question.options.find(
      (option) => Number(option.id) === Number(selectedOptionId)
    );
    const isCorrect = Boolean(selected && selected.is_correct);
    return {
      isCorrect,
      selectedOptionId,
      textAnswer: null,
      answerPayload: null,
    };
  }

  if (type === 'identification') {
    const textAnswer = String(answer?.textAnswer || '').trim();
    const accepted = question.options
      .filter((option) => option.is_correct)
      .map((option) => normalizeText(option.option_text));
    const isCorrect = Boolean(textAnswer) && accepted.includes(normalizeText(textAnswer));
    return {
      isCorrect,
      selectedOptionId: null,
      textAnswer: textAnswer || null,
      answerPayload: null,
    };
  }

  if (type === 'matching') {
    const payload = answer?.answerPayload && typeof answer.answerPayload === 'object'
      ? answer.answerPayload
      : {};
    const leftOptions = question.options.filter((option) => option.side === 'left');
    const rightOptions = question.options.filter((option) => option.side === 'right');

    let isCorrect = leftOptions.length > 0;
    for (const left of leftOptions) {
      const rightId = payload[String(left.id)] ?? payload[left.id];
      const right = rightOptions.find((option) => Number(option.id) === Number(rightId));
      if (!right || right.match_key !== left.match_key) {
        isCorrect = false;
        break;
      }
    }

    return {
      isCorrect,
      selectedOptionId: null,
      textAnswer: null,
      answerPayload: payload,
    };
  }

  return {
    isCorrect: false,
    selectedOptionId: null,
    textAnswer: null,
    answerPayload: null,
  };
}

const QuizService = {
  async createQuiz(data, user) {
    const course = await CourseModel.findById(data.courseId);
    if (!course) throw new AppError('Course not found', 404);

    if (user.role === 'teacher' && course.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    const quiz = await QuizModel.create({
      ...data,
      createdBy: user.id,
    });

    if (Array.isArray(data.questions)) {
      for (let i = 0; i < data.questions.length; i += 1) {
        const question = data.questions[i];
        validateQuestionPayload(question);
        await QuizModel.addQuestion(quiz.id, {
          ...question,
          orderIndex: question.orderIndex || i + 1,
        });
      }
    }

    const questions = await QuizModel.getQuestions(quiz.id, { includeCorrect: true });
    return { ...quiz, questions };
  },

  async generateAiQuiz(payload, user) {
    const course = await CourseModel.findById(payload.courseId);
    if (!course) throw new AppError('Course not found', 404);

    if (user.role === 'teacher' && course.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    const generated = await AiService.generateQuiz({
      topic: payload.topic,
      difficulty: payload.difficulty,
      questionCount: payload.questionCount,
      questionType: payload.questionType || 'multiple_choice',
      gradeLevel: payload.gradeLevel || course.grade_level || 'high school',
    });

    const quiz = await this.createQuiz(
      {
        courseId: payload.courseId,
        lessonId: payload.lessonId || null,
        title: payload.title || generated.title,
        description: payload.description || generated.description,
        timeLimitMinutes: payload.timeLimitMinutes || 15,
        passingScore: payload.passingScore || 60,
        xpReward: payload.xpReward || 50,
        isAiGenerated: true,
        isPublished: payload.isPublished || false,
        questions: generated.questions,
      },
      user
    );

    return {
      ...quiz,
      source: generated.source,
      warning: generated.warning || null,
    };
  },

  async getQuizById(id, user) {
    const quiz = await QuizModel.findById(id);
    if (!quiz) throw new AppError('Quiz not found', 404);

    const includeCorrect = user.role !== 'student';
    if (user.role === 'student' && !quiz.is_published) {
      throw new AppError('Quiz is not available', 403);
    }

    const questions = await QuizModel.getQuestions(id, { includeCorrect });
    return { ...quiz, questions };
  },

  async listByCourse(courseId, user) {
    const publishedOnly = user.role === 'student';
    return QuizModel.findByCourse(courseId, { publishedOnly });
  },

  async updateQuiz(id, data, user) {
    await assertTeacherOwnsQuiz(id, user);
    return QuizModel.update(id, data);
  },

  async deleteQuiz(id, user) {
    await assertTeacherOwnsQuiz(id, user);
    await QuizModel.delete(id);
    return true;
  },

  async addQuestion(quizId, question, user) {
    await assertTeacherOwnsQuiz(quizId, user);
    validateQuestionPayload(question);
    return QuizModel.addQuestion(quizId, question);
  },

  async attachQuestionImage(questionId, imageUrl, user) {
    const question = await QuizModel.getQuestionWithOptions(questionId);
    if (!question) throw new AppError('Question not found', 404);

    await assertTeacherOwnsQuiz(question.quiz_id, user);

    if (question.question_type !== 'image_question') {
      throw new AppError('Only image questions can receive an image upload', 400);
    }

    return QuizModel.updateQuestionImage(questionId, imageUrl);
  },

  async startAttempt(quizId, studentId) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz || !quiz.is_published) {
      throw new AppError('Quiz not available', 404);
    }

    const enrolled = await CourseModel.isEnrolled(quiz.course_id, studentId);
    if (!enrolled) throw new AppError('Enroll in the course first', 403);

    const questions = await QuizModel.getQuestions(quizId, { includeCorrect: false });
    const attempt = await QuizModel.createAttempt({ quizId, studentId });

    return { attempt, quiz, questions };
  },

  async submitAttempt(attemptId, answers, studentId) {
    const attempt = await QuizModel.findAttemptById(attemptId);
    if (!attempt || attempt.student_id !== studentId) {
      throw new AppError('Attempt not found', 404);
    }

    if (attempt.completed_at) {
      throw new AppError('Attempt already submitted', 400);
    }

    const quiz = await QuizModel.findById(attempt.quiz_id);
    const questions = await QuizModel.getQuestions(attempt.quiz_id, { includeCorrect: true });

    let earnedPoints = 0;
    let totalPoints = 0;
    let perfect = true;

    for (const question of questions) {
      totalPoints += question.points;
      const answer = answers.find((item) => Number(item.questionId) === Number(question.id));
      const scored = scoreQuestion(question, answer);
      const pointsEarned = scored.isCorrect ? question.points : 0;

      if (!scored.isCorrect) perfect = false;
      earnedPoints += pointsEarned;

      await QuizModel.saveAnswer({
        attemptId,
        questionId: question.id,
        selectedOptionId: scored.selectedOptionId,
        textAnswer: scored.textAnswer,
        answerPayload: scored.answerPayload,
        isCorrect: scored.isCorrect ? 1 : 0,
        pointsEarned,
      });
    }

    const score = totalPoints ? Number(((earnedPoints / totalPoints) * 100).toFixed(2)) : 0;
    const isPassed = score >= quiz.passing_score;
    const xpEarned = isPassed ? quiz.xp_reward : Math.floor(quiz.xp_reward * 0.25);

    const completed = await QuizModel.completeAttempt(attemptId, {
      score,
      totalPoints,
      earnedPoints,
      xpEarned,
      isPassed: isPassed ? 1 : 0,
    });

    let xpAward = null;
    if (xpEarned > 0) {
      xpAward = await GamificationService.awardXp({
        studentId,
        amount: xpEarned,
        sourceType: 'quiz',
        sourceId: quiz.id,
        description: `Quiz attempt: ${quiz.title}`,
      });
    }

    if (perfect && totalPoints > 0) {
      const medals = await GamificationModel.findAllMedals({ activeOnly: true });
      const perfectMedal = medals.find((medal) => medal.criteria_type === 'perfect_quiz');
      if (perfectMedal) {
        await GamificationService.awardMedalManually({
          studentId,
          medalId: perfectMedal.id,
          awardedBy: null,
        });
      }
    }

    return {
      attempt: completed,
      score,
      isPassed,
      xpAward,
      perfect,
    };
  },

  async getStudentAttempts(studentId, quizId = null) {
    return QuizModel.getStudentAttempts(studentId, quizId);
  },

  async getHint(questionText, topic) {
    return AiService.generateHint({ questionText, topic });
  },
};

export default QuizService;
