import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import env from "../config/env.js";
import pool, { query } from "../config/db.js";
import UserModel from "../models/UserModel.js";
import StudentProfileModel from "../models/StudentProfileModel.js";
import QuizService from "../services/QuizService.js";
import quizRoutes from "../routes/quizRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";

const createdUserIds = [];
const createdCourseIds = [];
const createdQuizIds = [];

function signUser(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { algorithm: "HS256", expiresIn: "1h" },
  );
}

async function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

async function createUser(role, prefix) {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const user = await UserModel.create({
    email,
    passwordHash,
    firstName: "Test",
    lastName: role,
    role,
  });
  createdUserIds.push(user.id);
  return user;
}

async function createCourse(teacherId, title = "Manual Quiz Course") {
  const result = await query(
    `INSERT INTO courses (title, description, subject, grade_level, teacher_id, is_published)
     VALUES (:title, 'desc', 'Science', 'Grade 10', :teacherId, 1)`,
    { title, teacherId },
  );
  createdCourseIds.push(result.insertId);
  return result.insertId;
}

const mcQuestion = {
  questionText: "What should you do during an earthquake?",
  questionType: "multiple_choice",
  points: 1,
  options: [
    { optionText: "Run outside", isCorrect: false },
    { optionText: "Drop, Cover, and Hold", isCorrect: true },
    { optionText: "Use an elevator", isCorrect: false },
    { optionText: "Stand near a window", isCorrect: false },
  ],
};

before(async () => {
  // Warm DB connection.
  await query("SELECT 1");
});

after(async () => {
  for (const quizId of createdQuizIds) {
    await query("DELETE FROM quizzes WHERE id = :id", { id: quizId }).catch(
      () => {},
    );
  }
  for (const courseId of createdCourseIds) {
    await query("DELETE FROM courses WHERE id = :id", { id: courseId }).catch(
      () => {},
    );
  }
  for (const userId of createdUserIds) {
    await query("DELETE FROM users WHERE id = :id", { id: userId }).catch(
      () => {},
    );
  }
  await pool.end();
});

describe("manual quiz creation", () => {
  let teacherA;
  let teacherB;
  let student;
  let courseA;
  let courseB;
  let appHandle;

  before(async () => {
    teacherA = await createUser("teacher", "manual-teacher-a");
    teacherB = await createUser("teacher", "manual-teacher-b");
    student = await createUser("student", "manual-student");
    await StudentProfileModel.create(student.id, {
      gradeLevel: "Grade 10",
      schoolName: "EduQuest Test High",
    });
    courseA = await createCourse(teacherA.id, "Teacher A Course");
    courseB = await createCourse(teacherB.id, "Teacher B Course");

    const { default: CourseModel } = await import("../models/CourseModel.js");
    await CourseModel.enroll(courseA, student.id);

    const app = express();
    app.use(express.json());
    app.use("/api/quizzes", quizRoutes);
    app.use(errorHandler);
    appHandle = await listen(app);
  });

  after(async () => {
    if (appHandle) await appHandle.close();
  });

  it("TEST 1: teacher creates manual multiple-choice quiz as draft", async () => {
    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "Earthquake Safety Quiz",
        description: "Manual draft",
        passingScore: 60,
        xpReward: 40,
        questions: [mcQuestion],
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);
    assert.equal(quiz.is_published, 0);
    assert.equal(quiz.is_ai_generated, 0);
    assert.equal(quiz.questions.length, 1);
  });

  it("TEST 2: teacher adds multiple questions", async () => {
    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "Multi Question Draft",
        questions: [mcQuestion],
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);

    await QuizService.addQuestion(
      quiz.id,
      {
        questionText: "Earthquakes are caused by plate movement.",
        questionType: "true_false",
        correctAnswer: true,
      },
      teacherA,
    );

    await QuizService.addQuestion(
      quiz.id,
      {
        questionText: "Define epicenter.",
        questionType: "identification",
        textAnswer: "Point on the surface above the focus",
      },
      teacherA,
    );

    const loaded = await QuizService.getQuizById(quiz.id, teacherA);
    assert.equal(loaded.questions.length, 3);
  });

  it("TEST 3: teacher edits a question", async () => {
    const quiz = await QuizService.createQuiz(
      { courseId: courseA, title: "Edit Q", questions: [mcQuestion] },
      teacherA,
    );
    createdQuizIds.push(quiz.id);
    const questionId = quiz.questions[0].id;

    const updated = await QuizService.updateQuestion(
      quiz.id,
      questionId,
      {
        questionText: "Updated earthquake question?",
        questionType: "multiple_choice",
        options: [
          { optionText: "A", isCorrect: false },
          { optionText: "B", isCorrect: true },
        ],
      },
      teacherA,
    );

    assert.equal(updated.question_text, "Updated earthquake question?");
    assert.equal(updated.options.length, 2);
  });

  it("TEST 4: teacher deletes a question", async () => {
    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "Delete Q",
        questions: [
          mcQuestion,
          {
            questionText: "True or false item",
            questionType: "true_false",
            correctAnswer: false,
          },
        ],
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);
    const removeId = quiz.questions[1].id;
    await QuizService.deleteQuestion(quiz.id, removeId, teacherA);
    const loaded = await QuizService.getQuizById(quiz.id, teacherA);
    assert.equal(loaded.questions.length, 1);
    assert.notEqual(loaded.questions[0].id, removeId);
  });

  it("TEST 5: teacher creates True/False question", async () => {
    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "TF Quiz",
        questions: [
          {
            questionText: "Drop, Cover, and Hold is recommended.",
            questionType: "true_false",
            correctAnswer: "True",
          },
        ],
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);
    assert.equal(quiz.questions[0].question_type, "true_false");
    assert.equal(quiz.questions[0].options.length, 2);
  });

  it("TEST 6: teacher creates Identification question", async () => {
    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "ID Quiz",
        questions: [
          {
            questionText: "What is a tsunami?",
            questionType: "identification",
            acceptedAnswers: ["Giant sea wave", "Seismic sea wave"],
          },
        ],
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);
    assert.equal(quiz.questions[0].question_type, "identification");
    assert.ok(quiz.questions[0].options.length >= 2);
  });

  it("TEST 7: teacher creates Matching question", async () => {
    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "Matching Quiz",
        questions: [
          {
            questionText: "Match the terms",
            questionType: "matching",
            pairs: [
              {
                left: "Earthquake",
                right: "Ground shaking caused by seismic activity",
              },
              { left: "Epicenter", right: "Surface point above the focus" },
            ],
          },
        ],
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);
    assert.equal(quiz.questions[0].question_type, "matching");
    assert.equal(quiz.questions[0].options.length, 4);
  });

  it("TEST 8: invalid question is rejected", async () => {
    await assert.rejects(
      () =>
        QuizService.createQuiz(
          {
            courseId: courseA,
            title: "Bad Quiz",
            questions: [
              {
                questionText: "Broken MC",
                questionType: "multiple_choice",
                options: [{ optionText: "Only one option", isCorrect: true }],
              },
            ],
          },
          teacherA,
        ),
      (error) => {
        assert.equal(error.statusCode, 400);
        return true;
      },
    );
  });

  it("TEST 9: draft quiz is hidden from students", async () => {
    const quiz = await QuizService.createQuiz(
      { courseId: courseA, title: "Hidden Draft", questions: [mcQuestion] },
      teacherA,
    );
    createdQuizIds.push(quiz.id);

    await assert.rejects(
      () => QuizService.getQuizById(quiz.id, student),
      (error) => {
        assert.equal(error.statusCode, 403);
        return true;
      },
    );

    await assert.rejects(
      () => QuizService.startAttempt(quiz.id, student.id),
      (error) => {
        assert.ok([403, 404].includes(error.statusCode));
        return true;
      },
    );

    const listed = await QuizService.listByCourse(courseA, student);
    assert.equal(
      listed.some((item) => item.id === quiz.id),
      false,
    );
  });

  it("TEST 10: preview does not create attempts or award XP", async () => {
    const quiz = await QuizService.createQuiz(
      { courseId: courseA, title: "Preview Quiz", questions: [mcQuestion] },
      teacherA,
    );
    createdQuizIds.push(quiz.id);

    const beforeAttempts = await query(
      "SELECT COUNT(*) AS total FROM quiz_attempts WHERE quiz_id = :quizId",
      { quizId: quiz.id },
    );
    const beforeXp = await query(
      `SELECT COUNT(*) AS total FROM xp_transactions
       WHERE source_type = 'quiz' AND source_id = :quizId`,
      { quizId: quiz.id },
    );

    const preview = await QuizService.previewQuiz(quiz.id, teacherA);
    assert.equal(preview.id, quiz.id);
    assert.ok(preview.questions.length >= 1);

    const afterAttempts = await query(
      "SELECT COUNT(*) AS total FROM quiz_attempts WHERE quiz_id = :quizId",
      { quizId: quiz.id },
    );
    const afterXp = await query(
      `SELECT COUNT(*) AS total FROM xp_transactions
       WHERE source_type = 'quiz' AND source_id = :quizId`,
      { quizId: quiz.id },
    );

    assert.equal(afterAttempts[0].total, beforeAttempts[0].total);
    assert.equal(afterXp[0].total, beforeXp[0].total);
  });

  it("TEST 11: teacher publishes valid quiz and student can see it", async () => {
    const quiz = await QuizService.createQuiz(
      { courseId: courseA, title: "Publish Me", questions: [mcQuestion] },
      teacherA,
    );
    createdQuizIds.push(quiz.id);

    const published = await QuizService.publishQuiz(quiz.id, teacherA);
    assert.equal(published.is_published, 1);

    const studentView = await QuizService.getQuizById(quiz.id, student);
    assert.equal(studentView.id, quiz.id);
    assert.equal(
      studentView.questions[0].options.some((o) => o.is_correct !== undefined),
      false,
    );
  });

  it("TEST 12: student attempt scoring works on manual quiz", async () => {
    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "Score Me",
        passingScore: 50,
        xpReward: 30,
        questions: [mcQuestion],
        isPublished: true,
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);

    const started = await QuizService.startAttempt(quiz.id, student.id);
    const correctOption = quiz.questions[0].options.find(
      (option) => option.is_correct,
    );
    const result = await QuizService.submitAttempt(
      started.attempt.id,
      [
        {
          questionId: quiz.questions[0].id,
          selectedOptionId: correctOption.id,
        },
      ],
      student.id,
    );

    assert.equal(result.isPassed, true);
    assert.equal(result.score, 100);
  });

  it("TEST 13 + 14: XP awarded once; retry does not farm XP", async () => {
    const xpStudent = await createUser("student", "manual-xp-student");
    await StudentProfileModel.create(xpStudent.id, {
      gradeLevel: "Grade 10",
      schoolName: "EduQuest Test High",
    });
    const { default: CourseModel } = await import("../models/CourseModel.js");
    await CourseModel.enroll(courseA, xpStudent.id);

    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "XP Once",
        passingScore: 50,
        xpReward: 25,
        questions: [mcQuestion],
        isPublished: true,
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);
    const correctOption = quiz.questions[0].options.find(
      (option) => option.is_correct,
    );

    const first = await QuizService.startAttempt(quiz.id, xpStudent.id);
    const firstResult = await QuizService.submitAttempt(
      first.attempt.id,
      [
        {
          questionId: quiz.questions[0].id,
          selectedOptionId: correctOption.id,
        },
      ],
      xpStudent.id,
    );
    assert.equal(firstResult.xpAlreadyAwarded, false);
    assert.equal(firstResult.computedXp, 25);
    assert.equal(Number(firstResult.attempt.xp_earned), 25);

    const second = await QuizService.startAttempt(quiz.id, xpStudent.id);
    const secondResult = await QuizService.submitAttempt(
      second.attempt.id,
      [
        {
          questionId: quiz.questions[0].id,
          selectedOptionId: correctOption.id,
        },
      ],
      xpStudent.id,
    );
    assert.equal(secondResult.xpAlreadyAwarded, true);
    assert.equal(Number(secondResult.attempt.xp_earned), 0);
  });

  it("TEST 15: teacher A cannot edit teacher B quiz", async () => {
    const quiz = await QuizService.createQuiz(
      { courseId: courseB, title: "B Owned", questions: [mcQuestion] },
      teacherB,
    );
    createdQuizIds.push(quiz.id);

    await assert.rejects(
      () => QuizService.updateQuiz(quiz.id, { title: "Hijacked" }, teacherA),
      (error) => {
        assert.equal(error.statusCode, 403);
        return true;
      },
    );

    await assert.rejects(
      () => QuizService.getQuizById(quiz.id, teacherA),
      (error) => {
        assert.equal(error.statusCode, 403);
        return true;
      },
    );
  });

  it("TEST 16: student cannot create quiz via API", async () => {
    const token = signUser(student);
    const response = await fetch(`${appHandle.baseUrl}/api/quizzes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseId: courseA,
        title: "Student Forged Quiz",
        questions: [mcQuestion],
      }),
    });
    assert.equal(response.status, 403);
  });

  it("TEST 17: manual published quiz counts for certificate eligibility set", async () => {
    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "Cert Quiz",
        questions: [mcQuestion],
        isPublished: true,
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);

    const required = await QuizService.listByCourse(courseA, student);
    assert.ok(
      required.some((item) => item.id === quiz.id && item.is_published),
    );
  });

  it("TEST 18: AI-compatible createQuiz path still accepts isAiGenerated published quizzes", async () => {
    const quiz = await QuizService.createQuiz(
      {
        courseId: courseA,
        title: "AI Style Quiz",
        isAiGenerated: true,
        isPublished: true,
        questions: [mcQuestion],
      },
      teacherA,
    );
    createdQuizIds.push(quiz.id);
    assert.equal(quiz.is_ai_generated, 1);
    assert.equal(quiz.is_published, 1);
  });

  it("rejects publish when quiz has no questions", async () => {
    const quiz = await QuizService.createQuiz(
      { courseId: courseA, title: "Empty Publish" },
      teacherA,
    );
    createdQuizIds.push(quiz.id);
    await assert.rejects(
      () => QuizService.publishQuiz(quiz.id, teacherA),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /at least one question/i);
        return true;
      },
    );
  });
});
