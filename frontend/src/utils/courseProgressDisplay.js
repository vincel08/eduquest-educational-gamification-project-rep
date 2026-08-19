/**
 * UI helpers for lesson-based learning progress display.
 */

export function computeLearningProgressPercent(lessons = []) {
  const total = lessons.length;
  if (!total) return 0;
  const completed = lessons.filter(
    (lesson) =>
      lesson.status === "completed" || lesson.progress?.status === "completed",
  ).length;
  return Number(((completed / total) * 100).toFixed(0));
}

export function summarizeLessonStatuses(lessons = []) {
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;

  for (const lesson of lessons) {
    const status = lesson.status || lesson.progress?.status || "not_started";
    if (status === "completed") completed += 1;
    else if (status === "in_progress") inProgress += 1;
    else notStarted += 1;
  }

  const total = lessons.length;
  const percent = total
    ? Number(((completed / total) * 100).toFixed(0))
    : 0;

  return { total, completed, inProgress, notStarted, percent };
}
