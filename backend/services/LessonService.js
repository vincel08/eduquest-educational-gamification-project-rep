import CourseModel from '../models/CourseModel.js';
import LessonModel from '../models/LessonModel.js';
import GamificationService from './GamificationService.js';
import StreakService from './StreakService.js';
import AiService from './AiService.js';
import AppError from '../utils/AppError.js';
import {
  materialFileApiPath,
  safeUnlinkUpload,
  sanitizeOriginalName,
} from '../utils/uploadPaths.js';

async function assertCourseAccess(courseId, user) {
  const course = await CourseModel.findById(courseId);
  if (!course) throw new AppError('Course not found', 404);

  if (user.role === 'teacher' && course.teacher_id !== user.id) {
    throw new AppError('Access denied', 403);
  }

  return course;
}

const LessonService = {
  async createLesson(courseId, data, user) {
    await assertCourseAccess(courseId, user);

    let summary = data.summary || null;
    let learningObjectives = data.learningObjectives || null;

    if (data.content && data.generateAiExtras) {
      const aiResult = await AiService.summarizeLesson(data.content);
      summary = summary || aiResult.summary;
      learningObjectives = learningObjectives
        || (Array.isArray(aiResult.learningObjectives)
          ? aiResult.learningObjectives.join('\n')
          : null);
    }

    const competency = data.competency != null
      ? String(data.competency).trim() || null
      : null;

    return LessonModel.create({
      ...data,
      courseId,
      summary,
      learningObjectives,
      competency,
      createdBy: user.id,
      updatedBy: user.id,
    });
  },

  async getLessonsByCourse(courseId, user) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);

    if (user.role === 'student') {
      const enrolled = await CourseModel.isEnrolled(courseId, user.id);
      if (!enrolled && !course.is_published) {
        throw new AppError('Access denied', 403);
      }
      return LessonModel.getStudentProgressForCourse(courseId, user.id);
    }

    if (user.role === 'teacher' && course.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    // Teachers/admins: include materials with authenticated download URLs (never file paths).
    const lessons = await LessonModel.findByCourse(courseId);
    const withMaterials = [];
    for (const lesson of lessons) {
      const materials = await LessonModel.getMaterials(lesson.id);
      withMaterials.push({
        ...lesson,
        materials: materials.map((material) => ({
          ...material,
          file_path: undefined,
          download_url: materialFileApiPath(material.id),
        })),
      });
    }
    return withMaterials;
  },

  async getLessonById(id, user) {
    const lesson = await LessonModel.findById(id);
    if (!lesson) throw new AppError('Lesson not found', 404);

    if (user.role === 'student') {
      const enrolled = await CourseModel.isEnrolled(lesson.course_id, user.id);
      if (!enrolled) throw new AppError('Enroll in the course to view this lesson', 403);
    }

    if (user.role === 'teacher' && lesson.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    const materials = await LessonModel.getMaterials(id);
    const materialsWithUrls = materials.map((material) => ({
      ...material,
      // Never expose filesystem paths; clients use the authenticated file API.
      file_path: undefined,
      download_url: materialFileApiPath(material.id),
    }));
    let progress = null;

    if (user.role === 'student') {
      progress = await LessonModel.getProgress(id, user.id);
    }

    return { ...lesson, materials: materialsWithUrls, progress };
  },

  async updateLesson(id, data, user) {
    const lesson = await LessonModel.findById(id);
    if (!lesson) throw new AppError('Lesson not found', 404);

    if (user.role === 'teacher' && lesson.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    return LessonModel.update(id, { ...data, updatedBy: user.id });
  },

  async deleteLesson(id, user) {
    const lesson = await LessonModel.findById(id);
    if (!lesson) throw new AppError('Lesson not found', 404);

    if (user.role === 'teacher' && lesson.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    const materials = await LessonModel.getMaterials(id);
    for (const material of materials) {
      safeUnlinkUpload(material.file_name || material.file_path);
    }

    await LessonModel.delete(id);
    return true;
  },

  async completeLesson(lessonId, studentId) {
    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) throw new AppError('Lesson not found', 404);

    const enrolled = await CourseModel.isEnrolled(lesson.course_id, studentId);
    if (!enrolled) throw new AppError('Enroll in the course first', 403);

    const existing = await LessonModel.getProgress(lessonId, studentId);
    if (existing?.status === 'completed') {
      return { progress: existing, xpAward: null, alreadyCompleted: true };
    }

    const progress = await LessonModel.upsertProgress({
      lessonId,
      studentId,
      status: 'completed',
      xpEarned: lesson.xp_reward,
      completedAt: new Date(),
    });

    let xpAward = null;
    if (Number(lesson.xp_reward) > 0) {
      const xpResult = await GamificationService.awardXpOnce({
        studentId,
        amount: lesson.xp_reward,
        sourceType: 'lesson',
        sourceId: lessonId,
        description: `Completed lesson: ${lesson.title}`,
      });
      xpAward = xpResult.alreadyAwarded ? null : xpResult.xpAward;
    }

    const counts = await LessonModel.countCompleted(lesson.course_id, studentId);
    const progressPercent = counts.total
      ? Number(((counts.completed / counts.total) * 100).toFixed(2))
      : 0;
    await CourseModel.updateProgress(lesson.course_id, studentId, progressPercent);

    let certificate = null;
    if (progressPercent >= 100) {
      certificate = await GamificationService.autoIssueCourseCertificate({
        courseId: lesson.course_id,
        studentId,
      });
    }

    const streak = await StreakService.recordActivity(studentId);

    return {
      progress,
      xpAward,
      alreadyCompleted: false,
      progressPercent,
      certificate,
      streak,
    };
  },

  async uploadMaterial(lessonId, file, user) {
    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) throw new AppError('Lesson not found', 404);

    if (user.role === 'teacher' && lesson.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    if (!file) throw new AppError('No file uploaded', 400);

    const material = await LessonModel.addMaterial({
      lessonId,
      fileName: file.filename,
      originalName: sanitizeOriginalName(file.originalname, file.filename),
      fileType: file.mimetype,
      fileSize: file.size,
      filePath: file.path,
      uploadedBy: user.id,
    });

    return {
      ...material,
      file_path: undefined,
      download_url: materialFileApiPath(material.id),
    };
  },

  async deleteMaterial(materialId, user) {
    const material = await LessonModel.findMaterialById(materialId);
    if (!material) throw new AppError('Material not found', 404);

    const lesson = await LessonModel.findById(material.lesson_id);
    if (user.role === 'teacher' && lesson.teacher_id !== user.id) {
      throw new AppError('Access denied', 403);
    }

    safeUnlinkUpload(material.file_name || material.file_path);
    await LessonModel.deleteMaterial(materialId);
    return true;
  },
};

export default LessonService;
