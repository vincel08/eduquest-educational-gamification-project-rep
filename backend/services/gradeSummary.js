function roundScore(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(2));
}

function average(values) {
  const scores = values
    .map((value) => roundScore(value))
    .filter((value) => value != null);
  if (!scores.length) return null;
  const sum = scores.reduce((total, value) => total + value, 0);
  return roundScore(sum / scores.length);
}

function subjectName(course) {
  const subject = String(course.subject || "").trim();
  const title = String(course.title || "").trim();
  return subject || title || "Subject";
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    sensitivity: "base",
  });
}

/**
 * Turn a teacher's enrollments and released scores into one Summary of Grades
 * per class (school year + grade + section).
 * A subject grade is the average of that student's best released quiz and game
 * scores. Subjects with no released score stay blank and are left out of the average.
 */
export function buildClassGradeSummaries({
  teacherName = "",
  courses = [],
  enrollments = [],
  quizScores = [],
  gameScores = [],
} = {}) {
  const courseById = new Map(
    (courses || []).map((course) => [Number(course.id), course]),
  );
  const assessmentsByStudentCourse = new Map();

  function addAssessment(row, type) {
    const courseId = Number(row.courseId);
    const studentId = Number(row.studentId);
    if (!courseById.has(courseId) || !studentId) return;
    const score = roundScore(row.score);
    if (score == null) return;
    const key = `${studentId}:${courseId}`;
    if (!assessmentsByStudentCourse.has(key)) {
      assessmentsByStudentCourse.set(key, []);
    }
    const list = assessmentsByStudentCourse.get(key);
    const assessmentId = Number(row.assessmentId);
    const existing = Number.isFinite(assessmentId)
      ? list.find((item) => item.type === type && item.id === assessmentId)
      : null;
    if (existing) {
      if (score > existing.score) existing.score = score;
      return;
    }
    list.push({
      type,
      id: assessmentId,
      title: String(row.title || "").trim() || type,
      score,
    });
  }

  for (const row of quizScores || []) addAssessment(row, "Quiz");
  for (const row of gameScores || []) addAssessment(row, "Game");

  const classes = new Map();

  for (const enrollment of enrollments || []) {
    const courseId = Number(enrollment.courseId);
    const course = courseById.get(courseId);
    const studentId = Number(enrollment.studentId);
    if (!course || !studentId) continue;

    const schoolYear = String(enrollment.schoolYear || "").trim();
    const gradeLevel = String(enrollment.gradeLevel || "").trim();
    const section = String(enrollment.section || "").trim();
    const key = `${schoolYear}\u0000${gradeLevel}\u0000${section}`;
    if (!classes.has(key)) {
      classes.set(key, {
        schoolYear,
        gradeLevel,
        section,
        subjectIds: new Set(),
        students: new Map(),
      });
    }

    const classRow = classes.get(key);
    classRow.subjectIds.add(courseId);

    if (!classRow.students.has(studentId)) {
      classRow.students.set(studentId, {
        studentId,
        firstName: String(enrollment.firstName || "").trim(),
        lastName: String(enrollment.lastName || "").trim(),
        email: enrollment.email || null,
        grades: new Map(),
      });
    }

    const student = classRow.students.get(studentId);
    if (student.grades.has(courseId)) continue;

    const assessments = (
      assessmentsByStudentCourse.get(`${studentId}:${courseId}`) || []
    )
      .slice()
      .sort(
        (a, b) => compareText(a.type, b.type) || compareText(a.title, b.title),
      );
    student.grades.set(courseId, {
      courseId,
      score: average(assessments.map((item) => item.score)),
      assessments,
    });
  }

  const summaries = [...classes.values()].map((classRow) => {
    const subjects = [...classRow.subjectIds]
      .map((id) => courseById.get(id))
      .filter(Boolean)
      .sort(
        (a, b) =>
          compareText(subjectName(a), subjectName(b)) ||
          Number(a.id) - Number(b.id),
      );
    const nameCounts = new Map();
    for (const course of subjects) {
      const name = subjectName(course);
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }

    const subjectColumns = subjects.map((course) => {
      const name = subjectName(course);
      const title = String(course.title || "").trim();
      const label =
        nameCounts.get(name) > 1 && title && title !== name
          ? `${name} (${title})`
          : name;
      return {
        courseId: Number(course.id),
        label,
      };
    });
    const labelCounts = new Map();
    for (const column of subjectColumns) {
      labelCounts.set(column.label, (labelCounts.get(column.label) || 0) + 1);
    }
    for (const column of subjectColumns) {
      if ((labelCounts.get(column.label) || 0) < 2) continue;
      column.label = `${column.label} #${column.courseId}`;
    }

    const students = [...classRow.students.values()]
      .map((student) => {
        const grades = subjectColumns.map((column) => {
          return (
            student.grades.get(column.courseId) || {
              courseId: column.courseId,
              score: null,
              assessments: [],
            }
          );
        });
        return {
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          grades,
          average: average(grades.map((grade) => grade.score)),
        };
      })
      .sort(
        (a, b) =>
          compareText(a.lastName, b.lastName) ||
          compareText(a.firstName, b.firstName),
      );

    return {
      schoolYear: classRow.schoolYear,
      gradeLevel: classRow.gradeLevel,
      section: classRow.section,
      teacherName: String(teacherName || "").trim(),
      subjects: subjectColumns,
      students,
    };
  });

  summaries.sort(
    (a, b) =>
      compareText(a.schoolYear, b.schoolYear) ||
      compareText(a.gradeLevel, b.gradeLevel) ||
      compareText(a.section, b.section),
  );

  return summaries;
}
