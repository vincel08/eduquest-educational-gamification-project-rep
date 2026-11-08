import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildClassGradeSummaries } from "../services/gradeSummary.js";

const courses = [
  { id: 1, title: "Algebra", subject: "Math", gradeLevel: "Grade 7", schoolYear: "2026-2027" },
  { id: 2, title: "Life Science", subject: "Science", gradeLevel: "Grade 7", schoolYear: "2026-2027" },
  { id: 3, title: "Algebra 2", subject: "Math", gradeLevel: "Grade 8", schoolYear: "2026-2027" },
];

describe("class grade summary", () => {
  it("averages released scores per subject and leaves blanks out of the average", () => {
    const classes = buildClassGradeSummaries({
      teacherName: "Taylor Swift",
      courses,
      enrollments: [
        {
          courseId: 1,
          studentId: 10,
          firstName: "Sam",
          lastName: "Cruz",
          email: "sam@eduwow.local",
          gradeLevel: "Grade 7",
          section: "Mahirap",
          schoolYear: "2026-2027",
        },
        {
          courseId: 2,
          studentId: 10,
          firstName: "Sam",
          lastName: "Cruz",
          gradeLevel: "Grade 7",
          section: "Mahirap",
          schoolYear: "2026-2027",
        },
        {
          courseId: 1,
          studentId: 11,
          firstName: "Ana",
          lastName: "Reyes",
          gradeLevel: "Grade 7",
          section: "Mahirap",
          schoolYear: "2026-2027",
        },
        {
          courseId: 3,
          studentId: 12,
          firstName: "Liza",
          lastName: "Santos",
          gradeLevel: "Grade 8",
          section: "A",
          schoolYear: "2026-2027",
        },
      ],
      quizScores: [
        { courseId: 1, studentId: 10, assessmentId: 100, title: "Fractions", score: 80 },
        { courseId: 1, studentId: 10, assessmentId: 101, title: "Decimals", score: 90 },
      ],
      gameScores: [
        { courseId: 1, studentId: 10, assessmentId: 200, title: "Fraction Match", score: 100 },
      ],
    });

    assert.equal(classes.length, 2);
    assert.equal(classes[0].section, "Mahirap");
    assert.equal(classes[0].teacherName, "Taylor Swift");
    assert.deepEqual(
      classes[0].subjects.map((subject) => subject.label),
      ["Math", "Science"],
    );

    const sam = classes[0].students.find((student) => student.studentId === 10);
    assert.equal(sam.grades[0].score, 90);
    assert.equal(sam.grades[0].assessments.length, 3);
    assert.equal(sam.grades[1].score, null);
    assert.equal(sam.average, 90);

    const ana = classes[0].students[1];
    assert.equal(ana.lastName, "Reyes");
    assert.equal(ana.grades[0].score, null);
    assert.equal(ana.grades[1].score, null);
    assert.equal(ana.average, null);

    assert.equal(classes[1].section, "A");
    assert.equal(classes[1].subjects[0].label, "Math");
    assert.equal(classes[1].students[0].grades[0].score, null);
  });

  it("disambiguates two subjects that share a name in the same class", () => {
    const classes = buildClassGradeSummaries({
      courses: [
        courses[0],
        { id: 4, title: "Geometry", subject: "Math", gradeLevel: "Grade 7", schoolYear: "2026-2027" },
      ],
      enrollments: [
        {
          courseId: 1,
          studentId: 10,
          firstName: "Sam",
          lastName: "Cruz",
          gradeLevel: "Grade 7",
          section: "A",
          schoolYear: "2026-2027",
        },
        {
          courseId: 4,
          studentId: 10,
          firstName: "Sam",
          lastName: "Cruz",
          gradeLevel: "Grade 7",
          section: "A",
          schoolYear: "2026-2027",
        },
      ],
    });
    assert.deepEqual(
      classes[0].subjects.map((subject) => subject.label),
      ["Math (Algebra)", "Math (Geometry)"],
    );
  });

  it("keeps a zero and uses the best score when the same item is listed twice", () => {
    const classes = buildClassGradeSummaries({
      courses: [courses[0]],
      enrollments: [
        {
          courseId: 1,
          studentId: 10,
          firstName: "Sam",
          lastName: "Cruz",
          gradeLevel: "Grade 7",
          section: "A",
          schoolYear: "2026-2027",
        },
        {
          courseId: 1,
          studentId: 10,
          firstName: "Sam",
          lastName: "Cruz",
          gradeLevel: "Grade 7",
          section: "A",
          schoolYear: "2026-2027",
        },
      ],
      quizScores: [
        { courseId: 1, studentId: 10, assessmentId: 100, title: "Fractions", score: 40 },
        { courseId: 1, studentId: 10, assessmentId: 100, title: "Fractions", score: 80 },
      ],
      gameScores: [
        { courseId: 1, studentId: 10, assessmentId: 200, title: "Match", score: 0 },
      ],
    });

    assert.equal(classes.length, 1);
    assert.equal(classes[0].students.length, 1);
    assert.equal(classes[0].students[0].grades[0].assessments.length, 2);
    assert.equal(classes[0].students[0].grades[0].score, 40);
  });

  it("numbers two identical subject names so the columns stay distinct", () => {
    const classes = buildClassGradeSummaries({
      courses: [
        { id: 1, title: "Math", subject: "Math", gradeLevel: "Grade 7", schoolYear: "2026-2027" },
        { id: 4, title: "Math", subject: "Math", gradeLevel: "Grade 7", schoolYear: "2026-2027" },
      ],
      enrollments: [
        {
          courseId: 1,
          studentId: 10,
          firstName: "Sam",
          lastName: "Cruz",
          gradeLevel: "Grade 7",
          section: "A",
          schoolYear: "2026-2027",
        },
        {
          courseId: 4,
          studentId: 10,
          firstName: "Sam",
          lastName: "Cruz",
          gradeLevel: "Grade 7",
          section: "A",
          schoolYear: "2026-2027",
        },
      ],
      quizScores: [
        { courseId: 1, studentId: 10, assessmentId: 1, title: "A", score: 70 },
        { courseId: 4, studentId: 10, assessmentId: 2, title: "B", score: 90 },
      ],
    });

    assert.deepEqual(
      classes[0].subjects.map((subject) => subject.label),
      ["Math #1", "Math #4"],
    );
    assert.equal(classes[0].students[0].grades[0].score, 70);
    assert.equal(classes[0].students[0].grades[1].score, 90);
    assert.equal(classes[0].students[0].average, 80);
  });

  it("ignores scores for subjects outside the supplied course list", () => {
    const classes = buildClassGradeSummaries({
      courses: [courses[0]],
      enrollments: [
        {
          courseId: 9,
          studentId: 10,
          firstName: "Sam",
          lastName: "Cruz",
          gradeLevel: "Grade 7",
          section: "A",
          schoolYear: "2026-2027",
        },
      ],
      quizScores: [
        { courseId: 9, studentId: 10, assessmentId: 1, title: "Other", score: 100 },
      ],
    });
    assert.deepEqual(classes, []);
  });
});
