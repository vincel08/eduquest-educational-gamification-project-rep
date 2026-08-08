/**
 * UI helpers that distinguish lesson-based learning progress
 * from certificate eligibility requirements.
 * Does NOT change certificate eligibility rules.
 */

export function computeLearningProgressPercent(lessons = []) {
  const total = lessons.length;
  if (!total) return 0;
  const completed = lessons.filter((lesson) => (
    lesson.status === 'completed'
    || lesson.progress?.status === 'completed'
  )).length;
  return Number(((completed / total) * 100).toFixed(0));
}

export function buildCertificateRequirementRows(eligibility) {
  if (!eligibility) return [];

  return [
    {
      key: 'enrollment',
      ok: Boolean(eligibility.enrolled),
      label: 'Enrolled in course',
    },
    {
      key: 'lessons',
      ok: Boolean(eligibility.lessons?.complete),
      label: eligibility.lessons?.required
        ? `All required lessons completed (${eligibility.lessons.completed}/${eligibility.lessons.required})`
        : 'No published lessons required yet',
    },
    {
      key: 'quizzes',
      ok: Boolean(eligibility.quizzes?.complete),
      label: eligibility.quizzes?.required
        ? `Required quizzes passed (${eligibility.quizzes.passed}/${eligibility.quizzes.required})`
        : 'No quiz requirement for this course',
    },
  ];
}

export function getCertificateStatus(eligibility) {
  if (!eligibility) {
    return {
      locked: true,
      title: 'Certificate Locked',
      message: 'Enroll and complete requirements to unlock your certificate.',
    };
  }

  if (eligibility.alreadyIssued) {
    return {
      locked: false,
      title: 'Certificate Available',
      message: 'Your certificate has been issued.',
      certificateId: eligibility.existingCertificate?.id || null,
    };
  }

  if (eligibility.eligible) {
    return {
      locked: false,
      title: 'Certificate Available',
      message: 'Requirements complete. Your certificate will be issued automatically when progress is finalized.',
      certificateId: null,
    };
  }

  const missingQuizzes = Array.isArray(eligibility.missing)
    && eligibility.missing.includes('quizzes');
  const missingLessons = Array.isArray(eligibility.missing)
    && eligibility.missing.includes('lessons');

  let message = 'Complete the missing requirements below to unlock your certificate.';
  if (missingQuizzes && !missingLessons) {
    message = 'Learning progress can reach 100% from lessons alone. Pass required quizzes to unlock your certificate.';
  }

  return {
    locked: true,
    title: 'Certificate Locked',
    message,
    certificateId: null,
  };
}
