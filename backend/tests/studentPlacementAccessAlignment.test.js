import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import pool, { query } from "../config/db.js";
import CourseService from "../services/CourseService.js";
import UserService from "../services/UserService.js";

const createdUserIds = [];
const createdCourseIds = [];

after(async () => {
  for (const id of createdCourseIds) {
    try {
      await query("DELETE FROM course_enrollments WHERE course_id = :id", { id });
      await query("DELETE FROM courses WHERE id = :id", { id });
    } catch {
      // best-effort
    }
  }
  for (const id of createdUserIds) {
    try {
      await query("DELETE FROM student_profiles WHERE user_id = :id", { id });
      await query("DELETE FROM users WHERE id = :id", { id });
    } catch {
      // best-effort
    }
  }
  await pool.end();
});

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function uniqueUsername(prefix) {
  return `${prefix}${Date.now()}${Math.random().toString(16).slice(2, 8)}`
    .toLowerCase()
    .slice(0, 64);
}

describe("student placement access alignment", () => {
  it("unenrolls mismatched subjects when admin changes grade or school year", async () => {
    const teacher = await UserService.createUser({
      email: uniqueEmail("align-teacher"),
      password: "Password123!",
      firstName: "Align",
      lastName: "Teacher",
      role: "teacher",
    });
    createdUserIds.push(teacher.id);

    const student = await UserService.createUser({
      username: uniqueUsername("alignstu"),
      email: uniqueEmail("align-student"),
      password: "Password123!",
      firstName: "Align",
      lastName: "Student",
      role: "student",
      gradeLevel: "Grade 7",
      schoolName: "EduWow High",
      section: "A",
      schoolYear: "2026-2027",
    });
    createdUserIds.push(student.id);

    const matchCourse = await CourseService.createCourse(
      {
        title: "Grade 7 Math",
        subject: "Math",
        gradeLevel: "Grade 7",
        schoolYear: "2026-2027",
        isPublished: true,
      },
      teacher.id,
    );
    createdCourseIds.push(matchCourse.id);

    const otherGrade = await CourseService.createCourse(
      {
        title: "Grade 8 Math",
        subject: "Math 8",
        gradeLevel: "Grade 8",
        schoolYear: "2026-2027",
        isPublished: true,
      },
      teacher.id,
    );
    createdCourseIds.push(otherGrade.id);

    const otherYear = await CourseService.createCourse(
      {
        title: "Grade 7 Prior SY",
        subject: "Science",
        gradeLevel: "Grade 7",
        schoolYear: "2025-2026",
        isPublished: true,
      },
      teacher.id,
    );
    createdCourseIds.push(otherYear.id);

    // Seed enrollments directly (bypass enroll gates for mismatch fixtures).
    await query(
      `INSERT INTO course_enrollments (course_id, student_id)
       VALUES (:a, :student), (:b, :student), (:c, :student)`,
      {
        a: matchCourse.id,
        b: otherGrade.id,
        c: otherYear.id,
        student: student.id,
      },
    );

    const admin = await UserService.createUser({
      email: uniqueEmail("align-admin"),
      password: "Password123!",
      firstName: "Align",
      lastName: "Admin",
      role: "administrator",
    });
    createdUserIds.push(admin.id);

    await UserService.updateUser(
      student.id,
      {
        gradeLevel: "Grade 8",
        schoolYear: "2026-2027",
        section: "A",
      },
      admin,
    );

    const remaining = await query(
      `SELECT course_id FROM course_enrollments WHERE student_id = :id ORDER BY course_id`,
      { id: student.id },
    );
    assert.equal(remaining.length, 1);
    assert.equal(Number(remaining[0].course_id), Number(otherGrade.id));

    const mine = await CourseService.getStudentCourses(student.id);
    assert.equal(mine.length, 1);
    assert.equal(Number(mine[0].id), Number(otherGrade.id));

    await assert.rejects(
      () => CourseService.assertStudentCourseAccess(matchCourse.id, student.id),
      (error) => {
        assert.ok([403, 404].includes(error.statusCode));
        return true;
      },
    );
    await assert.rejects(
      () => CourseService.assertStudentCourseAccess(otherYear.id, student.id),
      (error) => {
        assert.ok([403, 404].includes(error.statusCode));
        return true;
      },
    );
  });
});