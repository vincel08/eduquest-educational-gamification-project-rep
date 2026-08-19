import LessonModel from '../models/LessonModel.js';
import AppError from './AppError.js';

/**
 * Quizzes/games unlock only after required lesson work is finished.
 * - Linked to a lesson → that lesson must be published and completed
 * - Course-level (no lesson) → every published lesson in the subject must be completed
 * - No published lessons yet → stays locked
 */
export async function getContentUnlockState({ courseId, lessonId, studentId }) {
  if (lessonId) {
    const lesson = await LessonModel.findById(lessonId);
    if (!lesson || Number(lesson.course_id) !== Number(courseId)) {
      return {
        locked: true,
        requiredLessonId: Number(lessonId),
        requiredLessonTitle: 'required lesson',
        unlockMessage:
          'This activity is linked to a lesson that is not available yet.',
      };
    }
    if (!Number(lesson.is_published)) {
      return {
        locked: true,
        requiredLessonId: Number(lesson.id),
        requiredLessonTitle: lesson.title || 'required lesson',
        unlockMessage: `The lesson "${lesson.title || 'required lesson'}" must be published and completed first.`,
      };
    }

    const progress = await LessonModel.getProgress(lessonId, studentId);
    const completed = progress?.status === 'completed';
    return {
      locked: !completed,
      requiredLessonId: Number(lessonId),
      requiredLessonTitle: lesson.title || 'the linked lesson',
      unlockMessage: completed
        ? null
        : `Complete the lesson "${lesson.title || 'required lesson'}" before unlocking this.`,
    };
  }

  const lessons = await LessonModel.getStudentProgressForCourse(
    courseId,
    studentId,
  );
  if (!lessons.length) {
    return {
      locked: true,
      requiredLessonId: null,
      requiredLessonTitle: null,
      unlockMessage:
        'Complete the subject lessons first. No published lessons are available yet.',
    };
  }

  const incomplete = lessons.filter((lesson) => lesson.status !== 'completed');
  if (!incomplete.length) {
    return {
      locked: false,
      requiredLessonId: null,
      requiredLessonTitle: null,
      unlockMessage: null,
    };
  }

  const next = incomplete[0];
  return {
    locked: true,
    requiredLessonId: Number(next.id),
    requiredLessonTitle: next.title,
    unlockMessage: `Complete all lessons in this subject first (next: "${next.title}").`,
  };
}

export async function assertContentUnlocked({
  courseId,
  lessonId,
  studentId,
  contentLabel = 'activity',
}) {
  const state = await getContentUnlockState({ courseId, lessonId, studentId });
  if (state.locked) {
    throw new AppError(
      state.unlockMessage ||
        `Finish the required lesson before starting this ${contentLabel}.`,
      403,
    );
  }
  return state;
}

export async function withUnlockState(items, studentId) {
  const enriched = [];
  for (const item of items) {
    const state = await getContentUnlockState({
      courseId: item.course_id,
      lessonId: item.lesson_id,
      studentId,
    });
    enriched.push({
      ...item,
      locked: state.locked,
      requiredLessonId: state.requiredLessonId,
      requiredLessonTitle: state.requiredLessonTitle,
      unlockMessage: state.unlockMessage,
    });
  }
  return enriched;
}
