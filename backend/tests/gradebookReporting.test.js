import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import pool, { query } from '../config/db.js';
import GradebookService from '../services/GradebookService.js';
import AppError from '../utils/AppError.js';

const createdUserIds = [];
const createdCourseIds = [];
const createdQuizIds = [];
const createdGameIds = [];

async function createUser({ role, email }) {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const result = await query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
     VALUES (:email, :passwordHash, :role, :firstName, :lastName, 1)`,
    {
      email,
      passwordHash,
      role,
      firstName: role === 'teacher' ? 'Grade' : 'Score',
      lastName: role === 'teacher' ? 'Teacher' : 'Student',
    }
  );
  createdUserIds.push(result.insertId);
  if (role === 'student') {
    await query(
      `INSERT INTO student_profiles (user_id, xp, level)
       VALUES (:userId, 0, 1)`,
      { userId: result.insertId }
    );
  }
  return { id: result.insertId, role, email };
}

describe('teacher gradebook reporting', () => {
  let teacher;
  let otherTeacher;
  let student;
  let courseId;
  let quizId;
  let gameId;

  before(async () => {
    const stamp = Date.now();
    teacher = await createUser({ role: 'teacher', email: `gb-teacher-${stamp}@eduwow.test` });
    otherTeacher = await createUser({ role: 'teacher', email: `gb-other-${stamp}@eduwow.test` });
    student = await createUser({ role: 'student', email: `gb-student-${stamp}@eduwow.test` });

    const course = await query(
      `INSERT INTO courses (title, description, subject, grade_level, teacher_id, is_published)
       VALUES ('Gradebook Subject', 'Overview', 'Science', 'Grade 10', :teacherId, 1)`,
      { teacherId: teacher.id }
    );
    courseId = course.insertId;
    createdCourseIds.push(courseId);

    await query(
      `INSERT INTO course_enrollments (course_id, student_id, progress_percent)
       VALUES (:courseId, :studentId, 40)`,
      { courseId, studentId: student.id }
    );

    const quiz = await query(
      `INSERT INTO quizzes
       (course_id, title, description, passing_score, xp_reward, is_published, created_by)
       VALUES (:courseId, 'Cells Quiz', 'Test', 60, 50, 1, :teacherId)`,
      { courseId, teacherId: teacher.id }
    );
    quizId = quiz.insertId;
    createdQuizIds.push(quizId);

    await query(
      `INSERT INTO quiz_attempts
       (quiz_id, student_id, score, total_points, earned_points, xp_earned, is_passed, completed_at)
       VALUES (:quizId, :studentId, 88.5, 10, 9, 50, 1, NOW())`,
      { quizId, studentId: student.id }
    );

    const game = await query(
      `INSERT INTO educational_games
       (course_id, title, description, game_type, difficulty, estimated_time, game_data, xp_reward, is_published, created_by)
       VALUES (:courseId, 'Cell Match', 'Practice', 'flashcards', 'medium', 10, :gameData, 40, 1, :teacherId)`,
      {
        courseId,
        teacherId: teacher.id,
        gameData: JSON.stringify({ items: [{ term: 'Cell', definition: 'Basic unit of life' }] }),
      }
    );
    gameId = game.insertId;
    createdGameIds.push(gameId);

    await query(
      `INSERT INTO game_scores (game_id, student_id, score, xp_earned)
       VALUES (:gameId, :studentId, 75, 20)`,
      { gameId, studentId: student.id }
    );
  });

  after(async () => {
    for (const id of createdGameIds) {
      await query('DELETE FROM game_scores WHERE game_id = :id', { id });
      await query('DELETE FROM educational_games WHERE id = :id', { id });
    }
    for (const id of createdQuizIds) {
      await query('DELETE FROM quiz_attempts WHERE quiz_id = :id', { id });
      await query('DELETE FROM quizzes WHERE id = :id', { id });
    }
    for (const id of createdCourseIds) {
      await query('DELETE FROM course_enrollments WHERE course_id = :id', { id });
      await query('DELETE FROM courses WHERE id = :id', { id });
    }
    for (const id of createdUserIds) {
      await query('DELETE FROM student_profiles WHERE user_id = :id', { id });
      await query('DELETE FROM users WHERE id = :id', { id });
    }
    await pool.end();
  });

  it('lists students who took each quiz/game with attained scores', async () => {
    const data = await GradebookService.getCourseGradebook(courseId, teacher);
    assert.equal(data.course.id, courseId);
    assert.equal(data.quizzes.length, 1);
    assert.equal(data.games.length, 1);
    assert.equal(data.quizzes[0].results.length, 1);
    assert.equal(data.quizzes[0].results[0].studentId, student.id);
    assert.equal(data.quizzes[0].results[0].score, 88.5);
    assert.equal(data.quizzes[0].results[0].earnedPoints, 9);
    assert.equal(data.quizzes[0].results[0].totalPoints, 10);
    assert.equal(data.games[0].results[0].earnedPoints, 75);
    assert.equal(data.games[0].results[0].totalPoints, 100);
  });

  it('lets the teacher update earned quiz points for a student who took it', async () => {
    const data = await GradebookService.updateQuizStudentScore(
      courseId,
      quizId,
      student.id,
      { earnedPoints: 8 },
      teacher
    );
    const result = data.quizzes[0].results.find((row) => row.studentId === student.id);
    assert.equal(result.earnedPoints, 8);
    assert.equal(result.totalPoints, 10);
    assert.equal(result.score, 80);
    assert.equal(result.passed, true);
  });

  it('denies gradebook access to another teacher', async () => {
    await assert.rejects(
      () => GradebookService.getCourseGradebook(courseId, otherTeacher),
      (error) => error instanceof AppError && error.statusCode === 403
    );
  });
});
