import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  resolveUploadPath,
  sanitizeOriginalName,
  safeUnlinkUpload,
  UPLOADS_DIR,
  materialFileApiPath,
} from '../utils/uploadPaths.js';
import env from '../config/env.js';
import pool from '../config/db.js';
import { query } from '../config/db.js';
import FileAccessService from '../services/FileAccessService.js';
import { authenticateFileAccess } from '../middleware/authMiddleware.js';
import fileRoutes from '../routes/fileRoutes.js';
import FileController from '../controllers/FileController.js';
import UserModel from '../models/UserModel.js';
import bcrypt from 'bcryptjs';

const createdUserIds = [];
const createdCourseIds = [];
const createdLessonIds = [];
const createdMaterialIds = [];
const tempFiles = [];

function signUser(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

async function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
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
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await UserModel.create({
    email,
    passwordHash,
    firstName: 'Test',
    lastName: role,
    role,
  });
  createdUserIds.push(user.id);
  return user;
}

before(async () => {
  // Ensure uploads directory exists for integration fixtures.
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
});

after(async () => {
  for (const materialId of createdMaterialIds) {
    await query('DELETE FROM lesson_materials WHERE id = :id', { id: materialId }).catch(() => {});
  }
  for (const lessonId of createdLessonIds) {
    await query('DELETE FROM lessons WHERE id = :id', { id: lessonId }).catch(() => {});
  }
  for (const courseId of createdCourseIds) {
    await query('DELETE FROM courses WHERE id = :id', { id: courseId }).catch(() => {});
  }
  for (const userId of createdUserIds) {
    await query('DELETE FROM users WHERE id = :id', { id: userId }).catch(() => {});
  }
  for (const file of tempFiles) {
    safeUnlinkUpload(file);
  }
  await pool.end();
});

describe('upload path safety', () => {
  it('neutralizes path traversal to a basename under uploads only', () => {
    const escaped = resolveUploadPath('../etc/passwd');
    assert.ok(escaped.startsWith(UPLOADS_DIR));
    assert.equal(path.basename(escaped), 'passwd');

    const nested = resolveUploadPath('/uploads/../../etc/passwd');
    assert.ok(nested.startsWith(UPLOADS_DIR));
    assert.equal(path.basename(nested), 'passwd');

    assert.throws(() => resolveUploadPath('..'), /not found/i);
    assert.throws(() => resolveUploadPath(''), /not found/i);
    assert.throws(() => resolveUploadPath('\0evil.txt'), /not found/i);
  });

  it('resolves filenames only under uploads directory', () => {
    const fileName = `file-access-test-${Date.now()}.txt`;
    const absolute = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(absolute, 'secure');
    tempFiles.push(fileName);

    const resolved = resolveUploadPath(`/uploads/${fileName}`);
    assert.equal(resolved, absolute);
    assert.equal(resolveUploadPath(fileName), absolute);
  });

  it('sanitizes original filenames and strips directories', () => {
    assert.equal(sanitizeOriginalName('../../evil.pdf'), 'evil.pdf');
    assert.equal(sanitizeOriginalName('C:\\temp\\notes.docx'), 'notes.docx');
    assert.match(sanitizeOriginalName('weird name!!!.pdf'), /weird name/);
  });
});

describe('authenticated file API', () => {
  let teacherA;
  let teacherB;
  let studentA;
  let studentB;
  let admin;
  let materialA;
  let fileNameA;
  let appHandle;

  before(async () => {
    teacherA = await createUser('teacher', 'teacher-a');
    teacherB = await createUser('teacher', 'teacher-b');
    studentA = await createUser('student', 'student-a');
    studentB = await createUser('student', 'student-b');
    admin = await createUser('administrator', 'admin-a');

    const courseResult = await query(
      `INSERT INTO courses (title, description, subject, grade_level, teacher_id, is_published)
       VALUES ('Secure Course', 'desc', 'Math', 'Grade 10', :teacherId, 1)`,
      { teacherId: teacherA.id }
    );
    const courseId = courseResult.insertId;
    createdCourseIds.push(courseId);

    const otherCourse = await query(
      `INSERT INTO courses (title, description, subject, grade_level, teacher_id, is_published)
       VALUES ('Other Course', 'desc', 'Science', 'Grade 10', :teacherId, 1)`,
      { teacherId: teacherB.id }
    );
    createdCourseIds.push(otherCourse.insertId);

    const lessonResult = await query(
      `INSERT INTO lessons
       (course_id, title, content, order_index, xp_reward, is_published, created_by)
       VALUES (:courseId, 'Secure Lesson', 'content', 1, 10, 1, :teacherId)`,
      { courseId, teacherId: teacherA.id }
    );
    const lessonId = lessonResult.insertId;
    createdLessonIds.push(lessonId);

    fileNameA = `material-a-${Date.now()}.txt`;
    const absolute = path.join(UPLOADS_DIR, fileNameA);
    fs.writeFileSync(absolute, 'lesson-material-content');
    tempFiles.push(fileNameA);

    const materialResult = await query(
      `INSERT INTO lesson_materials
       (lesson_id, file_name, original_name, file_type, file_size, file_path, uploaded_by)
       VALUES
       (:lessonId, :fileName, 'notes.txt', 'text/plain', 22, :filePath, :uploadedBy)`,
      {
        lessonId,
        fileName: fileNameA,
        filePath: absolute,
        uploadedBy: teacherA.id,
      }
    );
    materialA = { id: materialResult.insertId, courseId, lessonId };
    createdMaterialIds.push(materialA.id);

    const { default: CourseModel } = await import('../models/CourseModel.js');
    await CourseModel.enroll(courseId, studentA.id);

    const app = express();
    app.use('/uploads', FileController.legacyUploadsBlocked);
    app.use('/api/files', fileRoutes);
    appHandle = await listen(app);
  });

  after(async () => {
    if (appHandle) await appHandle.close();
  });

  it('TEST 1: unauthenticated request to uploaded file is rejected', async () => {
    const response = await fetch(
      `${appHandle.baseUrl}/api/files/materials/${materialA.id}`
    );
    assert.equal(response.status, 401);
  });

  it('legacy /uploads path is blocked', async () => {
    const response = await fetch(`${appHandle.baseUrl}/uploads/${fileNameA}`);
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.success, false);
  });

  it('TEST 2: enrolled student can access authorized course material', async () => {
    const token = signUser(studentA);
    const response = await fetch(
      `${appHandle.baseUrl}/api/files/materials/${materialA.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(text, 'lesson-material-content');
  });

  it('TEST 3: student cannot access another course material (IDOR)', async () => {
    const token = signUser(studentB);
    const response = await fetch(
      `${appHandle.baseUrl}/api/files/materials/${materialA.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(response.status, 404);
  });

  it('TEST 5: teacher can access own course material', async () => {
    const token = signUser(teacherA);
    const response = await fetch(
      `${appHandle.baseUrl}${materialFileApiPath(materialA.id)}?access_token=${encodeURIComponent(token)}`
    );
    assert.equal(response.status, 200);
  });

  it('TEST 6: teacher cannot access another teacher private file', async () => {
    const token = signUser(teacherB);
    const response = await fetch(
      `${appHandle.baseUrl}/api/files/materials/${materialA.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(response.status, 404);
  });

  it('TEST 7: administrator can access file', async () => {
    const token = signUser(admin);
    const response = await fetch(
      `${appHandle.baseUrl}/api/files/materials/${materialA.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(response.status, 200);
  });

  it('TEST 8/9: changing file id / invalid id is denied', async () => {
    const token = signUser(studentA);
    const response = await fetch(
      `${appHandle.baseUrl}/api/files/materials/99999999`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(response.status, 404);
  });

  it('TEST 10: path traversal style material id is rejected', async () => {
    await assert.rejects(
      () => FileAccessService.getAuthorizedMaterialFile('../etc/passwd', teacherA),
      /not found/i
    );
  });

  it('TEST 4: students cannot access AI source documents', async () => {
    await assert.rejects(
      () => FileAccessService.getAuthorizedAiSourceFile(1, studentA),
      /not found/i
    );
  });

  it('authenticateFileAccess accepts access_token query', async () => {
    let reached = false;
    const token = signUser(teacherA);
    await new Promise((resolve) => {
      authenticateFileAccess(
        { headers: {}, query: { access_token: token } },
        {
          status() { return this; },
          json() { resolve(); return this; },
        },
        () => {
          reached = true;
          resolve();
        }
      );
    });
    assert.equal(reached, true);
  });
});

describe('material deletion cleans disk file', () => {
  it('TEST 12: safeUnlink removes file and ignores missing refs', () => {
    const fileName = `delete-me-${Date.now()}.txt`;
    const absolute = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(absolute, 'bye');
    assert.equal(fs.existsSync(absolute), true);
    assert.equal(safeUnlinkUpload(fileName), true);
    assert.equal(fs.existsSync(absolute), false);
    assert.equal(safeUnlinkUpload('missing-file-xyz.txt'), true);
  });
});

describe('AI extract path disclosure', () => {
  it('TEST 11: extract response exposes basename only', async () => {
    const { default: DocumentExtractService } = await import('../services/DocumentExtractService.js');
    const fileName = `ai-extract-${Date.now()}.txt`;
    const absolute = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(
      absolute,
      'This is enough extracted text for AI processing validation in EduQuest tests.'
    );
    tempFiles.push(fileName);

    const result = await DocumentExtractService.extractFromFile({
      path: absolute,
      filename: fileName,
      originalname: 'unit-notes.txt',
      mimetype: 'text/plain',
      size: 80,
    });

    assert.equal(result.uploadedFilePath, fileName);
    assert.equal(result.uploadedFileName, fileName);
    assert.equal(result.uploadedFilePath.includes(path.sep), false);
    assert.ok(result.extractedText.length > 0);
  });
});
