import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import pool, { query } from "../config/db.js";
import { validate } from "../middleware/validateMiddleware.js";
import { registerValidation } from "../validations/authValidation.js";
import AuthController from "../controllers/AuthController.js";
import { errorHandler } from "../middleware/errorMiddleware.js";
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  GRADE_LEVEL_REQUIRED_MESSAGE,
} from "../utils/gradeLevels.js";

const createdUserIds = [];

after(async () => {
  for (const id of createdUserIds) {
    try {
      await query("DELETE FROM student_profiles WHERE user_id = :id", { id });
      await query("DELETE FROM users WHERE id = :id", { id });
    } catch {
      // best-effort cleanup
    }
  }
  await pool.end();
});

async function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

function buildRegisterApp() {
  const app = express();
  app.use(express.json());
  app.post(
    "/api/auth/register",
    registerValidation,
    validate,
    AuthController.register,
  );
  app.use(errorHandler);
  return app;
}

async function registerViaHttp(payload) {
  const app = buildRegisterApp();
  const { baseUrl, close } = await listen(app);
  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    return { status: response.status, body };
  } finally {
    await close();
  }
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function uniqueUsername(prefix) {
  return `${prefix}${Date.now()}${Math.random().toString(16).slice(2, 8)}`
    .toLowerCase()
    .slice(0, 64);
}

function baseStudentPayload(overrides = {}) {
  return {
    firstName: "Grade",
    lastName: "Student",
    username: uniqueUsername("gradereg"),
    email: uniqueEmail("grade-reg"),
    password: "Password123!",
    role: "student",
    schoolName: "EduWow High",
    ...overrides,
  };
}

describe("student grade level registration", () => {
  it("registers with valid Grade 7 and persists grade_level", async () => {
    const { default: AuthService } = await import("../services/AuthService.js");
    const email = uniqueEmail("grade7");
    const username = uniqueUsername("grade7");
    const result = await AuthService.register(
      baseStudentPayload({
        email,
        username,
        gradeLevel: "Grade 7",
      }),
    );

    createdUserIds.push(result.user.id);
    assert.equal(result.user.role, "student");
    assert.ok(result.user.username);
    assert.equal(result.profile.grade_level, "Grade 7");

    const rows = await query(
      "SELECT grade_level FROM student_profiles WHERE user_id = :id",
      { id: result.user.id },
    );
    assert.equal(rows[0].grade_level, "Grade 7");
  });

  it("registers with valid Grade 10 and persists grade_level", async () => {
    const { default: AuthService } = await import("../services/AuthService.js");
    const result = await AuthService.register(
      baseStudentPayload({
        email: uniqueEmail("grade10"),
        username: uniqueUsername("grade10"),
        gradeLevel: "Grade 10",
      }),
    );

    createdUserIds.push(result.user.id);
    assert.equal(result.profile.grade_level, "Grade 10");
  });

  it("registers with valid Grade 12 and persists grade_level", async () => {
    const { default: AuthService } = await import("../services/AuthService.js");
    const result = await AuthService.register(
      baseStudentPayload({
        email: uniqueEmail("grade12"),
        username: uniqueUsername("grade12"),
        gradeLevel: "Grade 12",
      }),
    );

    createdUserIds.push(result.user.id);
    assert.equal(result.profile.grade_level, "Grade 12");
  });

  it("rejects registration without grade level (service)", async () => {
    const { default: AuthService } = await import("../services/AuthService.js");
    await assert.rejects(
      () => AuthService.register(baseStudentPayload({ gradeLevel: "" })),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, GRADE_LEVEL_REQUIRED_MESSAGE);
        return true;
      },
    );
  });

  it("rejects registration without grade level (HTTP validation)", async () => {
    const { status, body } = await registerViaHttp(
      baseStudentPayload({ gradeLevel: undefined }),
    );
    assert.equal(status, 422);
    assert.equal(body.success, false);
    const messages = (body.errors || []).map((item) => item.message);
    assert.ok(messages.includes(GRADE_LEVEL_REQUIRED_MESSAGE));
  });

  it("rejects invalid grade level (service)", async () => {
    const { default: AuthService } = await import("../services/AuthService.js");
    await assert.rejects(
      () =>
        AuthService.register(baseStudentPayload({ gradeLevel: "Grade 99" })),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.message, GRADE_LEVEL_INVALID_MESSAGE);
        return true;
      },
    );
  });

  it("rejects invalid grade level (HTTP validation)", async () => {
    const { status, body } = await registerViaHttp(
      baseStudentPayload({ gradeLevel: "Kindergarten" }),
    );
    assert.equal(status, 422);
    const messages = (body.errors || []).map((item) => item.message);
    assert.ok(messages.includes(GRADE_LEVEL_INVALID_MESSAGE));
  });

  it("keeps existing students without grade_level functional", async () => {
    const { default: UserService } = await import("../services/UserService.js");
    const { default: AuthService } = await import("../services/AuthService.js");

    const email = uniqueEmail("legacy-student");
    const username = uniqueUsername("legacystudent");
    const password = "Password123!";
    const user = await UserService.createUser({
      username,
      email,
      password,
      firstName: "Legacy",
      lastName: "Student",
      role: "student",
      gradeLevel: null,
      schoolName: null,
    });
    createdUserIds.push(user.id);

    await query(
      "UPDATE student_profiles SET grade_level = NULL WHERE user_id = :id",
      { id: user.id },
    );

    const login = await AuthService.login({ login: username, password });
    assert.equal(login.user.id, user.id);
    assert.equal(login.user.role, "student");
    assert.equal(login.profile.grade_level, null);

    const me = await AuthService.getMe(user.id);
    assert.equal(me.user.id, user.id);
    assert.equal(me.profile.grade_level, null);

    const updated = await AuthService.updateProfile(user.id, {
      firstName: "Legacy",
      lastName: "Student",
      gradeLevel: "Grade 9",
      schoolName: "EduWow High",
    });
    assert.equal(updated.profile.grade_level, "Grade 9");
  });

  it("teacher account creation remains functional without grade level", async () => {
    const { default: UserService } = await import("../services/UserService.js");
    const email = uniqueEmail("teacher-create");
    const teacher = await UserService.createUser({
      email,
      password: "Password123!",
      firstName: "Teach",
      lastName: "Er",
      role: "teacher",
    });
    createdUserIds.push(teacher.id);

    assert.equal(teacher.role, "teacher");
    const profiles = await query(
      "SELECT id FROM student_profiles WHERE user_id = :id",
      { id: teacher.id },
    );
    assert.equal(profiles.length, 0);
  });

  it("administrator account creation remains functional without grade level", async () => {
    const { default: UserService } = await import("../services/UserService.js");
    const email = uniqueEmail("admin-create");
    const admin = await UserService.createUser({
      email,
      password: "Password123!",
      firstName: "Ad",
      lastName: "Min",
      role: "administrator",
    });
    createdUserIds.push(admin.id);

    assert.equal(admin.role, "administrator");
    const profiles = await query(
      "SELECT id FROM student_profiles WHERE user_id = :id",
      { id: admin.id },
    );
    assert.equal(profiles.length, 0);
  });
});
