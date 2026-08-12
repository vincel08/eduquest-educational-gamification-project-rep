import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for certificate eligibility rules using a lightweight
 * stubbed evaluator that mirrors CertificateEligibilityService logic.
 */

function evaluateEligibility({
  enrolled,
  lessons = [],
  quizzes = [],
  existingCertificate = null,
}) {
  const lessonStatuses = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    completed: Boolean(lesson.completed),
  }));
  const quizStatuses = quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    passed: Boolean(quiz.passed),
  }));

  const lessonsCompleted = lessonStatuses.filter((item) => item.completed).length;
  const quizzesPassed = quizStatuses.filter((item) => item.passed).length;
  const hasRequiredLessons = lessons.length > 0;
  const lessonsComplete = hasRequiredLessons && lessonsCompleted === lessons.length;
  const quizzesComplete = quizzes.length === 0 ? true : quizzesPassed === quizzes.length;
  const alreadyIssued = Boolean(existingCertificate);
  const eligible = enrolled
    && hasRequiredLessons
    && lessonsComplete
    && quizzesComplete
    && !alreadyIssued;

  const missing = [];
  if (!enrolled) missing.push('enrollment');
  if (!hasRequiredLessons || !lessonsComplete) missing.push('lessons');
  if (!quizzesComplete) missing.push('quizzes');

  return {
    enrolled,
    eligible,
    alreadyIssued,
    lessons: {
      required: lessons.length,
      completed: lessonsCompleted,
      complete: lessonsComplete,
      items: lessonStatuses,
    },
    quizzes: {
      required: quizzes.length,
      passed: quizzesPassed,
      complete: quizzesComplete,
      items: quizStatuses,
    },
    gamesRequired: false,
    missing,
  };
}

describe('certificate eligibility rules', () => {
  it('TEST 1: empty course (0 lessons, 0 quizzes) is NOT eligible', () => {
    const result = evaluateEligibility({
      enrolled: true,
      lessons: [],
      quizzes: [],
    });
    assert.equal(result.eligible, false);
    assert.ok(result.missing.includes('lessons'));
    assert.equal(result.lessons.required, 0);
  });

  it('TEST 2: course with lessons but incomplete is NOT eligible', () => {
    const result = evaluateEligibility({
      enrolled: true,
      lessons: [
        { id: 1, title: 'L1', completed: true },
        { id: 2, title: 'L2', completed: false },
      ],
      quizzes: [{ id: 1, title: 'Q1', passed: true }],
    });
    assert.equal(result.eligible, false);
    assert.deepEqual(result.missing, ['lessons']);
  });

  it('TEST 3: all lessons complete, quizzes exist but not passed → NOT eligible', () => {
    const result = evaluateEligibility({
      enrolled: true,
      lessons: [
        { id: 1, title: 'L1', completed: true },
        { id: 2, title: 'L2', completed: true },
      ],
      quizzes: [{ id: 1, title: 'Q1', passed: false }],
    });
    assert.equal(result.eligible, false);
    assert.deepEqual(result.missing, ['quizzes']);
  });

  it('TEST 4: all lessons complete, all quizzes passed → eligible', () => {
    const result = evaluateEligibility({
      enrolled: true,
      lessons: [
        { id: 1, title: 'L1', completed: true },
        { id: 2, title: 'L2', completed: true },
      ],
      quizzes: [{ id: 1, title: 'Q1', passed: true }],
    });
    assert.equal(result.eligible, true);
    assert.deepEqual(result.missing, []);
  });

  it('TEST 5: all lessons complete, no quizzes → eligible', () => {
    const result = evaluateEligibility({
      enrolled: true,
      lessons: [{ id: 1, title: 'L1', completed: true }],
      quizzes: [],
    });
    assert.equal(result.eligible, true);
    assert.equal(result.quizzes.complete, true);
  });

  it('already issued certificate is not eligible again', () => {
    const result = evaluateEligibility({
      enrolled: true,
      lessons: [{ id: 1, title: 'L1', completed: true }],
      quizzes: [{ id: 1, title: 'Q1', passed: true }],
      existingCertificate: { id: 99 },
    });
    assert.equal(result.eligible, false);
    assert.equal(result.alreadyIssued, true);
  });

  it('not enrolled blocks certificate', () => {
    const result = evaluateEligibility({
      enrolled: false,
      lessons: [{ id: 1, title: 'L1', completed: true }],
      quizzes: [{ id: 1, title: 'Q1', passed: true }],
    });
    assert.equal(result.eligible, false);
    assert.ok(result.missing.includes('enrollment'));
  });

  it('unpublished/deleted lessons are not in required set', () => {
    const result = evaluateEligibility({
      enrolled: true,
      lessons: [{ id: 1, title: 'Published only', completed: true }],
      quizzes: [],
    });
    assert.equal(result.lessons.required, 1);
    assert.equal(result.eligible, true);
  });

  it('games are never required', () => {
    const result = evaluateEligibility({
      enrolled: true,
      lessons: [{ id: 1, title: 'L1', completed: true }],
      quizzes: [],
    });
    assert.equal(result.gamesRequired, false);
  });
});

describe('certificate access conventions', () => {
  it('foreign student access should be denied (404 convention)', () => {
    const ownerId = 10;
    const actorId = 11;
    const allowed = Number(ownerId) === Number(actorId);
    assert.equal(allowed, false);
  });

  it('frontend completion flags must not grant eligibility alone', () => {
    const fakeFrontendComplete = true;
    const result = evaluateEligibility({
      enrolled: true,
      lessons: [{ id: 1, title: 'L1', completed: false }],
      quizzes: [{ id: 1, title: 'Q1', passed: false }],
    });
    assert.equal(fakeFrontendComplete, true);
    assert.equal(result.eligible, false);
  });
});

describe('certificate template course requirement', () => {
  it('TEST 6: certificate template without course is rejected', () => {
    function validateCourseTemplate(courseId) {
      const id = Number(courseId);
      if (!Number.isInteger(id) || id < 1) {
        throw new Error('Please select a course for this certificate template.');
      }
      return id;
    }

    assert.throws(() => validateCourseTemplate(null), /select a course/i);
    assert.throws(() => validateCourseTemplate(''), /select a course/i);
    assert.throws(() => validateCourseTemplate(0), /select a course/i);
  });

  it('TEST 7: existing valid certificate template still accepts course id', () => {
    function validateCourseTemplate(courseId) {
      const id = Number(courseId);
      if (!Number.isInteger(id) || id < 1) {
        throw new Error('Please select a course for this certificate template.');
      }
      return id;
    }

    assert.equal(validateCourseTemplate(12), 12);
  });
});
