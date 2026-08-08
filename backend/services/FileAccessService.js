import fs from 'fs';
import path from 'path';
import { query } from '../config/db.js';
import CourseModel from '../models/CourseModel.js';
import UserModel from '../models/UserModel.js';
import AiContentGenerationModel from '../models/AiContentGenerationModel.js';
import AppError from '../utils/AppError.js';
import { resolveUploadPath, uploadExists } from '../utils/uploadPaths.js';

function deny() {
  // Hide existence of protected resources from unauthorized callers.
  throw new AppError('File not found', 404);
}

async function assertStudentCanAccessCourseContent(user, courseId, { coursePublished, contentPublished }) {
  if (!coursePublished || !contentPublished) {
    deny();
  }
  const enrolled = await CourseModel.isEnrolled(courseId, user.id);
  if (!enrolled) {
    deny();
  }
}

const FileAccessService = {
  async getAuthorizedMaterialFile(materialId, user) {
    const id = Number(materialId);
    if (!Number.isInteger(id) || id <= 0) {
      deny();
    }

    const rows = await query(
      `SELECT m.*,
              l.id AS lesson_id,
              l.is_published AS lesson_published,
              l.course_id,
              c.is_published AS course_published,
              c.teacher_id
       FROM lesson_materials m
       INNER JOIN lessons l ON l.id = m.lesson_id
       INNER JOIN courses c ON c.id = l.course_id
       WHERE m.id = :id
       LIMIT 1`,
      { id }
    );

    const material = rows[0];
    if (!material) {
      deny();
    }

    if (user.role === 'administrator') {
      // allowed
    } else if (user.role === 'teacher') {
      if (Number(material.teacher_id) !== Number(user.id)) {
        deny();
      }
    } else if (user.role === 'student') {
      await assertStudentCanAccessCourseContent(user, material.course_id, {
        coursePublished: Boolean(material.course_published),
        contentPublished: Boolean(material.lesson_published),
      });
    } else {
      deny();
    }

    const diskRef = material.file_name || material.file_path;
    if (!uploadExists(diskRef)) {
      deny();
    }

    return {
      absolutePath: resolveUploadPath(diskRef),
      mimeType: material.file_type || 'application/octet-stream',
      downloadName: material.original_name || material.file_name || 'material',
    };
  },

  async getAuthorizedQuestionImage(questionId, user) {
    const id = Number(questionId);
    if (!Number.isInteger(id) || id <= 0) {
      deny();
    }

    const rows = await query(
      `SELECT qq.id, qq.image_url, qq.quiz_id,
              q.is_published AS quiz_published,
              q.course_id,
              c.teacher_id
       FROM quiz_questions qq
       INNER JOIN quizzes q ON q.id = qq.quiz_id
       INNER JOIN courses c ON c.id = q.course_id
       WHERE qq.id = :id
       LIMIT 1`,
      { id }
    );

    const question = rows[0];
    if (!question?.image_url) {
      deny();
    }

    if (user.role === 'administrator') {
      // allowed
    } else if (user.role === 'teacher') {
      if (Number(question.teacher_id) !== Number(user.id)) {
        deny();
      }
    } else if (user.role === 'student') {
      const course = await CourseModel.findById(question.course_id);
      await assertStudentCanAccessCourseContent(user, question.course_id, {
        coursePublished: Boolean(course?.is_published),
        contentPublished: Boolean(question.quiz_published),
      });
    } else {
      deny();
    }

    if (!uploadExists(question.image_url)) {
      deny();
    }

    const absolutePath = resolveUploadPath(question.image_url);
    const ext = path.extname(absolutePath).toLowerCase();
    const mimeByExt = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };

    return {
      absolutePath,
      mimeType: mimeByExt[ext] || 'application/octet-stream',
      downloadName: path.basename(question.image_url),
    };
  },

  async getAuthorizedAvatarFile(userId, user) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id <= 0) {
      deny();
    }

    // Avatars are visible to authenticated users only (not public).
    const target = await UserModel.findById(id);
    if (!target || !target.is_active || !target.avatar_url) {
      deny();
    }

    if (!uploadExists(target.avatar_url)) {
      deny();
    }

    const absolutePath = resolveUploadPath(target.avatar_url);
    const ext = path.extname(absolutePath).toLowerCase();
    const mimeByExt = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };

    return {
      absolutePath,
      mimeType: mimeByExt[ext] || 'application/octet-stream',
      downloadName: path.basename(absolutePath),
    };
  },

  async getAuthorizedAiSourceFile(generationId, user) {
    const id = Number(generationId);
    if (!Number.isInteger(id) || id <= 0) {
      deny();
    }

    // AI source documents are private to the owning teacher and administrators.
    if (user.role === 'student') {
      deny();
    }

    const generation = await AiContentGenerationModel.findById(id);
    if (!generation?.uploaded_file_path) {
      deny();
    }

    if (user.role === 'teacher' && Number(generation.teacher_id) !== Number(user.id)) {
      deny();
    }

    if (user.role !== 'teacher' && user.role !== 'administrator') {
      deny();
    }

    if (!uploadExists(generation.uploaded_file_path)) {
      deny();
    }

    return {
      absolutePath: resolveUploadPath(generation.uploaded_file_path),
      mimeType: 'application/octet-stream',
      downloadName: generation.original_file_name || path.basename(generation.uploaded_file_path),
    };
  },

  /**
   * Stream an authorized file to the response.
   * Never exposes absolute filesystem paths in the response body.
   */
  streamFile(res, fileInfo) {
    const { absolutePath, mimeType, downloadName } = fileInfo;

    if (!fs.existsSync(absolutePath)) {
      throw new AppError('File not found', 404);
    }

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${String(downloadName || 'file').replace(/"/g, '')}"`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(absolutePath);
      stream.on('error', (error) => reject(error));
      res.on('finish', resolve);
      res.on('close', resolve);
      stream.pipe(res);
    });
  },
};

export default FileAccessService;
