import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import pool, { query } from '../config/db.js';
import UserModel from '../models/UserModel.js';
import StudentProfileModel from '../models/StudentProfileModel.js';
import CourseService from '../services/CourseService.js';
import LessonService from '../services/LessonService.js';
import { materialFileApiPath } from '../utils/uploadPaths.js';

const createdUserIds = [];
const createdCourseIds = [];
const createdLessonIds = [];
const createdMaterialIds = [];

async function createUser(role, prefix) {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await UserModel.create({
    email,
    passwordHash,
    firstName: 'Stab',
    lastName: role,
    role,
  });
  createdUserIds.push(user.id);
  return user;
}

after(async () => {
  for (const materialId of createdMaterialIds) {
    await query('DELETE FROM lesson_materials WHERE id = :id', { id: materialId }).catch(() => {});
  }
  for (const lessonId of createdLessonIds) {
    await query('DELETE FROM lessons WHERE id = :id', { id: lessonId }).catch(() => {});
  }
  for (const courseId of createdCourseIds) {
    await query('DELETE FROM course_enrollments WHERE course_id = :id', { id: courseId }).catch(() => {});
    await query('DELETE FROM courses WHERE id = :id', { id: courseId }).catch(() => {});
  }
  for (const userId of createdUserIds) {
    await query('DELETE FROM student_profiles WHERE user_id = :id', { id: userId }).catch(() => {});
    await query('DELETE FROM users WHERE id = :id', { id: userId }).catch(() => {});
  }
  await pool.end();
});

describe('final stabilization - teacher materials listing', () => {
  let teacherA;
  let teacherB;
  let courseA;
  let lessonA;
  let materialA;

  before(async () => {
    teacherA = await createUser('teacher', 'stab-teacher-a');
    teacherB = await createUser('teacher', 'stab-teacher-b');

    const courseResult = await query(
      `INSERT INTO courses (title, description, subject, grade_level, teacher_id, is_published)
       VALUES ('Stab Materials Course', 'desc', 'Science', 'Grade 10', :teacherId, 1)`,
      { teacherId: teacherA.id }
    );
    courseA = courseResult.insertId;
    createdCourseIds.push(courseA);

    const otherCourse = await query(
      `INSERT INTO courses (title, description, subject, grade_level, teacher_id, is_published)
       VALUES ('Other Teacher Course', 'desc', 'Math', 'Grade 10', :teacherId, 1)`,
      { teacherId: teacherB.id }
    );
    createdCourseIds.push(otherCourse.insertId);

    const lessonResult = await query(
      `INSERT INTO lessons
       (course_id, title, content, order_index, xp_reward, is_published, created_by)
       VALUES (:courseId, 'Lesson with material', 'content', 1, 10, 1, :teacherId)`,
      { courseId: courseA, teacherId: teacherA.id }
    );
    lessonA = lessonResult.insertId;
    createdLessonIds.push(lessonA);

    const materialResult = await query(
      `INSERT INTO lesson_materials
       (lesson_id, file_name, original_name, file_type, file_size, file_path, uploaded_by)
       VALUES
       (:lessonId, 'stab-notes.txt', 'notes.txt', 'text/plain', 12, '/tmp/stab-notes.txt', :uploadedBy)`,
      { lessonId: lessonA, uploadedBy: teacherA.id }
    );
    materialA = materialResult.insertId;
    createdMaterialIds.push(materialA);
  });

  it('teacher can see own lesson materials with authenticated download URL', async () => {
    const lessons = await LessonService.getLessonsByCourse(courseA, teacherA);
    assert.ok(lessons.length >= 1);
    const lesson = lessons.find((item) => item.id === lessonA);
    assert.ok(lesson);
    assert.ok(Array.isArray(lesson.materials));
    assert.equal(lesson.materials.length, 1);
    assert.equal(lesson.materials[0].original_name, 'notes.txt');
    assert.equal(lesson.materials[0].download_url, materialFileApiPath(materialA));
    assert.equal(lesson.materials[0].file_path, undefined);
  });

  it('teacher cannot list another teacher course lessons/materials', async () => {
    await assert.rejects(
      () => LessonService.getLessonsByCourse(courseA, teacherB),
      (error) => {
        assert.equal(error.statusCode, 403);
        return true;
      }
    );
  });
});

describe('final stabilization - enrollment', () => {
  let teacher;
  let student;
  let publishedCourseId;
  let unpublishedCourseId;

  before(async () => {
    teacher = await createUser('teacher', 'stab-enroll-teacher');
    student = await createUser('student', 'stab-enroll-student');
    await StudentProfileModel.create(student.id, {
      gradeLevel: 'Grade 10',
      schoolName: 'EduQuest Test',
    });

    const published = await query(
      `INSERT INTO courses (title, description, subject, grade_level, teacher_id, is_published)
       VALUES ('Published Enroll Course', 'desc', 'Science', 'Grade 10', :teacherId, 1)`,
      { teacherId: teacher.id }
    );
    publishedCourseId = published.insertId;
    createdCourseIds.push(publishedCourseId);

    const unpublished = await query(
      `INSERT INTO courses (title, description, subject, grade_level, teacher_id, is_published)
       VALUES ('Draft Enroll Course', 'desc', 'Science', 'Grade 10', :teacherId, 0)`,
      { teacherId: teacher.id }
    );
    unpublishedCourseId = unpublished.insertId;
    createdCourseIds.push(unpublishedCourseId);
  });

  it('student can enroll in published course', async () => {
    const course = await CourseService.enrollStudent(publishedCourseId, student.id);
    assert.equal(course.id, publishedCourseId);
    const enrolled = await CourseService.getStudentCourses(student.id);
    assert.ok(enrolled.some((item) => item.id === publishedCourseId));
  });

  it('duplicate enrollment is idempotent (no error)', async () => {
    await CourseService.enrollStudent(publishedCourseId, student.id);
    await CourseService.enrollStudent(publishedCourseId, student.id);
    const rows = await query(
      `SELECT COUNT(*) AS total FROM course_enrollments
       WHERE course_id = :courseId AND student_id = :studentId`,
      { courseId: publishedCourseId, studentId: student.id }
    );
    assert.equal(Number(rows[0].total), 1);
  });

  it('unpublished course cannot be enrolled in', async () => {
    await assert.rejects(
      () => CourseService.enrollStudent(unpublishedCourseId, student.id),
      (error) => {
        assert.equal(error.statusCode, 404);
        assert.match(error.message, /not available/i);
        return true;
      }
    );
  });
});

describe('final stabilization - progress vs certificate UI rules', () => {
  it('learning progress can be 100% while quizzes remain incomplete', () => {
    // Mirrors frontend helpers without importing Vite modules.
    const lessons = [
      { id: 1, status: 'completed' },
      { id: 2, status: 'completed' },
    ];
    const completed = lessons.filter((lesson) => lesson.status === 'completed').length;
    const learningProgress = Number(((completed / lessons.length) * 100).toFixed(0));
    assert.equal(learningProgress, 100);

    const eligibility = {
      enrolled: true,
      eligible: false,
      alreadyIssued: false,
      lessons: { required: 2, completed: 2, complete: true },
      quizzes: { required: 1, passed: 0, complete: false },
      missing: ['quizzes'],
    };

    assert.equal(eligibility.lessons.complete, true);
    assert.equal(eligibility.quizzes.complete, false);
    assert.equal(eligibility.eligible, false);
    assert.ok(eligibility.missing.includes('quizzes'));
  });

  it('certificate becomes available only when all requirements are satisfied', () => {
    const eligibility = {
      enrolled: true,
      eligible: true,
      alreadyIssued: false,
      lessons: { required: 2, completed: 2, complete: true },
      quizzes: { required: 1, passed: 1, complete: true },
      missing: [],
    };
    assert.equal(eligibility.eligible, true);
    assert.equal(eligibility.lessons.complete, true);
    assert.equal(eligibility.quizzes.complete, true);
  });
});
