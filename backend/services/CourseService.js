import CourseModel from "../models/CourseModel.js";
import LessonModel from "../models/LessonModel.js";
import NotificationModel from "../models/NotificationModel.js";
import StudentProfileModel from "../models/StudentProfileModel.js";
import UserModel from "../models/UserModel.js";
import AppError from "../utils/AppError.js";
import { generateJoinCode, normalizeJoinCode } from "../utils/joinCode.js";
import {
  GRADE_LEVEL_MISMATCH_MESSAGE,
  GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE,
  gradesMatch,
  normalizeGradeLevel,
} from "../utils/gradeLevels.js";
import {
  COURSE_EXPIRED_MESSAGE,
  defaultCourseSchedule,
  isCourseExpired,
} from "../utils/courseSchedule.js";
import {
  getSchoolYearBounds,
  isValidSchoolYearLabel,
  schoolYearsMatch,
  SCHOOL_YEAR_MISMATCH_MESSAGE,
  SCHOOL_YEAR_REQUIRED_FOR_ACCESS_MESSAGE,
} from "../utils/schoolYears.js";
import ClassSectionService from "./ClassSectionService.js";
import ActivityLogService from "./ActivityLogService.js";

async function getStudentPlacement(studentId) {
  const profile = await StudentProfileModel.findByUserId(studentId);
  return {
    gradeLevel: normalizeGradeLevel(profile?.grade_level),
    schoolYear: String(profile?.school_year || "").trim() || null,
    section: profile?.section || null,
  };
}

function resolveScheduleFields(data = {}) {
  const defaults = defaultCourseSchedule();
  let schoolYear = data.schoolYear
    ? String(data.schoolYear).trim()
    : defaults.schoolYear;
  if (!isValidSchoolYearLabel(schoolYear)) {
    throw new AppError("Please select a valid school year for this subject.", 400);
  }

  let endsAt = data.endsAt || null;
  if (endsAt) {
    const parsed = new Date(endsAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("Invalid subject end date.", 400);
    }
    endsAt = parsed.toISOString().slice(0, 19).replace("T", " ");
  } else {
    endsAt = getSchoolYearBounds(schoolYear).endExclusive;
  }

  return { schoolYear, endsAt };
}

function withoutJoinCode(course) {
  if (!course) return course;
  const next = { ...course };
  delete next.join_code;
  return next;
}

const CourseService = {
  /**
   * If the subject is past ends_at / school-year end, unpublish it (auto-deactivate).
   */
  async deactivateIfExpired(course) {
    if (!course || !course.is_published) return course;
    if (!isCourseExpired(course)) return course;
    return CourseModel.update(course.id, {
      isPublished: false,
      updatedBy: course.updated_by || course.teacher_id,
    });
  },

  async createCourse(data, teacherId, actor = null) {
    const subject = String(data.subject || "").trim();
    const title = String(data.title || subject).trim() || subject;
    const schedule = resolveScheduleFields(data);
    const course = await CourseModel.create({
      ...data,
      ...schedule,
      subject,
      title,
      teacherId,
    });
    const joinCode = await this.assignJoinCode(course.id);
    course.join_code = joinCode;
    await ActivityLogService.log({
      actorId: actor?.id || teacherId || null,
      action: "course.created",
      entityType: "course",
      entityId: course.id,
      summary: `Created subject "${course.title || title}"`,
      metadata: { teacherId, schoolYear: course.school_year || schedule.schoolYear },
    });
    return course;
  },

  async listCourses(filters = {}, user = null) {
    const nextFilters = { ...filters };
    if (user?.role === "student") {
      const placement = await getStudentPlacement(user.id);
      // Incomplete placement → empty catalog.
      if (!placement.gradeLevel || !isValidSchoolYearLabel(placement.schoolYear)) {
        return { courses: [], total: 0 };
      }
      nextFilters.gradeLevel = placement.gradeLevel;
      nextFilters.schoolYear = placement.schoolYear;
      nextFilters.publishedOnly = true;
    }
    const result = await CourseModel.findAll(nextFilters);
    const courses = [];
    for (const course of result.courses) {
      const next = await this.deactivateIfExpired(course);
      if (user?.role === "student" && (!next.is_published || isCourseExpired(next))) {
        continue;
      }
      courses.push(
        user?.role === "student" ? withoutJoinCode(next) : next,
      );
    }
    return { courses, total: courses.length };
  },

  async assignJoinCode(courseId) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const joinCode = generateJoinCode();
      try {
        await CourseModel.setJoinCode(courseId, joinCode);
      } catch (error) {
        if (error?.code === "ER_DUP_ENTRY") continue;
        throw error;
      }
      const course = await CourseModel.findById(courseId);
      if (course?.join_code) return course.join_code;
    }
    throw new AppError("Could not generate a subject code.", 500);
  },

  async ensureJoinCodes() {
    let missing = [];
    try {
      missing = await CourseModel.listMissingJoinCodes();
    } catch (error) {
      if (error?.code === "ER_BAD_FIELD_ERROR" || error?.code === "ER_NO_SUCH_TABLE") {
        return;
      }
      throw error;
    }
    for (const row of missing) {
      await this.assignJoinCode(row.id);
    }
  },

  async requestJoin(studentId, courseId, rawCode) {
    const code = normalizeJoinCode(rawCode);
    if (code.length < 6) {
      throw new AppError("Enter the subject code from your teacher.", 400);
    }

    let course = await CourseModel.findByJoinCode(code);
    if (!course || Number(course.id) !== Number(courseId)) {
      throw new AppError("That code is not for this subject.", 400);
    }
    course = await this.deactivateIfExpired(course);
    if (isCourseExpired(course) || !course.is_published) {
      throw new AppError("That subject is not open for new students.", 404);
    }

    const placement = await getStudentPlacement(studentId);
    if (!placement.gradeLevel) {
      throw new AppError(GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE, 400);
    }
    if (!isValidSchoolYearLabel(placement.schoolYear)) {
      throw new AppError(SCHOOL_YEAR_REQUIRED_FOR_ACCESS_MESSAGE, 400);
    }
    if (!gradesMatch(placement.gradeLevel, course.grade_level)) {
      throw new AppError(GRADE_LEVEL_MISMATCH_MESSAGE, 403);
    }
    if (!schoolYearsMatch(placement.schoolYear, course.school_year)) {
      throw new AppError(SCHOOL_YEAR_MISMATCH_MESSAGE, 403);
    }

    if (await CourseModel.isEnrolled(course.id, studentId)) {
      throw new AppError("You are already enrolled in this subject.", 409);
    }

    const existing = await CourseModel.findJoinRequest(course.id, studentId);
    if (existing?.status === "pending") {
      return {
        request: existing,
        course: withoutJoinCode(course),
        alreadyPending: true,
      };
    }

    const request = await CourseModel.upsertJoinRequest(course.id, studentId);
    const student = await UserModel.findById(studentId);
    const studentName = `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "A student";
    const subjectName = course.subject || course.title;

    await NotificationModel.create({
      userId: course.teacher_id,
      title: "Subject join request",
      message: `${studentName} asked to join "${subjectName}".`,
      type: "course",
      link: `/teacher/courses/${course.id}`,
    });
    await ActivityLogService.log({
      actorId: studentId,
      action: "course.join_requested",
      entityType: "course",
      entityId: course.id,
      summary: `${studentName} requested to join "${subjectName}"`,
      metadata: { requestId: request?.id || null },
    });

    return {
      request,
      course: withoutJoinCode(course),
      alreadyPending: false,
    };
  },

  async listMyJoinRequests(studentId) {
    const rows = await CourseModel.listStudentJoinRequests(studentId);
    return rows.filter((row) => row.status !== "approved");
  },

  async listJoinRequests(courseId, user) {
    await this.assertStaffCourseAccess(courseId, user);
    return CourseModel.listJoinRequests(courseId, "pending");
  },

  async reviewJoinRequest(courseId, requestId, user, decision) {
    const course = await this.assertStaffCourseAccess(courseId, user);
    const request = await CourseModel.findJoinRequestById(requestId);
    if (!request || Number(request.course_id) !== Number(courseId)) {
      throw new AppError("Join request not found", 404);
    }
    if (request.status !== "pending") {
      throw new AppError("This request has already been reviewed.", 409);
    }

    const subjectName = course.subject || course.title;
    const studentName = `${request.first_name || ""} ${request.last_name || ""}`.trim();

    if (decision === "reject") {
      const reviewed = await CourseModel.reviewJoinRequest(requestId, {
        status: "rejected",
        reviewedBy: user.id,
      });
      await NotificationModel.create({
        userId: request.student_id,
        title: "Join request declined",
        message: `Your request to join "${subjectName}" was declined.`,
        type: "course",
        link: `/student/courses/${courseId}`,
      });
      await ActivityLogService.log({
        actorId: user.id,
        action: "course.join_rejected",
        entityType: "course",
        entityId: courseId,
        summary: `Declined ${studentName}'s request to join "${subjectName}"`,
        metadata: { requestId, studentId: request.student_id },
      });
      return reviewed;
    }

    if (await CourseModel.isEnrolled(courseId, request.student_id)) {
      return CourseModel.reviewJoinRequest(requestId, {
        status: "approved",
        reviewedBy: user.id,
      });
    }

    await this.enrollStudent(courseId, request.student_id, { notify: false });
    const reviewed = await CourseModel.reviewJoinRequest(requestId, {
      status: "approved",
      reviewedBy: user.id,
    });
    await NotificationModel.create({
      userId: request.student_id,
      title: "Joined subject",
      message: `Your teacher approved your request to join "${subjectName}".`,
      type: "course",
      link: `/student/courses/${courseId}`,
    });
    await ActivityLogService.log({
      actorId: user.id,
      action: "course.join_approved",
      entityType: "course",
      entityId: courseId,
      summary: `Approved ${studentName}'s request to join "${subjectName}"`,
      metadata: { requestId, studentId: request.student_id },
    });
    return reviewed;
  },

  async getCourseById(id, user = null) {
    let course = await CourseModel.findById(id);
    if (!course) throw new AppError("Course not found", 404);
    course = await this.deactivateIfExpired(course);

    if (user?.role === "student") {
      const access = await this.resolveStudentCourseAccess(id, user.id);
      course = access.course;
      const enrollment = access.enrolled
        ? await CourseModel.findEnrollment(id, user.id)
        : null;
      const lessons = await LessonModel.getStudentProgressForCourse(id, user.id);
      const request = await CourseModel.findJoinRequest(id, user.id);
      return {
        ...withoutJoinCode(course),
        lessons,
        enrolled: access.enrolled,
        recordOnly: access.recordOnly,
        progress_percent: enrollment?.progress_percent ?? null,
        joinRequestStatus: request?.status || null,
      };
    } else if (user?.role === "teacher") {
      if (Number(course.teacher_id) !== Number(user.id)) {
        throw new AppError("Access denied", 403);
      }
    }

    if (!course.join_code) {
      course.join_code = await this.assignJoinCode(course.id);
    }
    const lessons = await LessonModel.findByCourse(id);
    return { ...course, lessons };
  },

  /**
   * Teachers may only access their own subjects; admins may access any.
   */
  async assertStaffCourseAccess(courseId, user) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);
    if (
      user?.role === "teacher" &&
      Number(course.teacher_id) !== Number(user.id)
    ) {
      throw new AppError("Access denied", 403);
    }
    return course;
  },

  async updateCourse(id, data, user) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && Number(course.teacher_id) !== Number(user.id)) {
      throw new AppError("You can only update your own courses", 403);
    }

    const patch = { ...data, updatedBy: user.id };

    if (data.teacherId !== undefined) {
      if (user.role !== "administrator") {
        throw new AppError("Only administrators can reassign subject teachers", 403);
      }
      const nextTeacherId = Number(data.teacherId);
      if (!Number.isInteger(nextTeacherId) || nextTeacherId < 1) {
        throw new AppError("Please select a valid teacher", 400);
      }
      const teacher = await UserModel.findById(nextTeacherId);
      if (!teacher || teacher.role !== "teacher" || !teacher.is_active) {
        throw new AppError("Selected user must be an active teacher", 400);
      }
      patch.teacherId = nextTeacherId;
    }

    if (data.schoolYear !== undefined || data.endsAt !== undefined) {
      const schedule = resolveScheduleFields({
        schoolYear:
          data.schoolYear !== undefined ? data.schoolYear : course.school_year,
        endsAt: data.endsAt !== undefined ? data.endsAt : course.ends_at,
      });
      patch.schoolYear = schedule.schoolYear;
      patch.endsAt = schedule.endsAt;
    }

    // Prevent re-publishing an already-expired subject without extending ends_at.
    if (patch.isPublished) {
      const preview = {
        ...course,
        school_year: patch.schoolYear ?? course.school_year,
        ends_at: patch.endsAt ?? course.ends_at,
      };
      if (isCourseExpired(preview)) {
        throw new AppError(
          "This subject’s end date has passed. Extend the end date or school year before publishing.",
          400,
        );
      }
    }

    const updated = await CourseModel.update(id, patch);
    await ActivityLogService.log({
      actorId: user?.id || null,
      action: "course.updated",
      entityType: "course",
      entityId: id,
      summary: `Updated subject "${updated.title || course.title}"`,
      metadata: {
        published:
          data.isPublished !== undefined
            ? Boolean(data.isPublished)
            : undefined,
      },
    });
    return updated;
  },

  async deleteCourse(id, user) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && Number(course.teacher_id) !== Number(user.id)) {
      throw new AppError("You can only delete your own courses", 403);
    }

    await CourseModel.delete(id);
    await ActivityLogService.log({
      actorId: user?.id || null,
      action: "course.deleted",
      entityType: "course",
      entityId: id,
      summary: `Deleted subject "${course.title}"`,
    });
    return true;
  },

  async enrollStudent(courseId, studentId, { notify = true } = {}) {
    let course = await CourseModel.findById(courseId);
    if (!course) {
      throw new AppError("Course not available for enrollment", 404);
    }
    course = await this.deactivateIfExpired(course);
    if (isCourseExpired(course)) {
      throw new AppError(COURSE_EXPIRED_MESSAGE, 404);
    }
    if (!course.is_published) {
      throw new AppError("Course not available for enrollment", 404);
    }

    const placement = await getStudentPlacement(studentId);
    if (!placement.gradeLevel) {
      throw new AppError(GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE, 400);
    }
    if (!isValidSchoolYearLabel(placement.schoolYear)) {
      throw new AppError(SCHOOL_YEAR_REQUIRED_FOR_ACCESS_MESSAGE, 400);
    }
    if (!gradesMatch(placement.gradeLevel, course.grade_level)) {
      throw new AppError(GRADE_LEVEL_MISMATCH_MESSAGE, 403);
    }
    if (!schoolYearsMatch(placement.schoolYear, course.school_year)) {
      throw new AppError(SCHOOL_YEAR_MISMATCH_MESSAGE, 403);
    }

    await CourseModel.enroll(courseId, studentId);
    if (notify) {
      await NotificationModel.create({
        userId: studentId,
        title: "Enrolled in Course",
        message: `You enrolled in "${course.title}".`,
        type: "course",
        link: `/student/courses/${courseId}`,
      });
    }

    return CourseModel.findById(courseId);
  },

  /**
   * Teacher/admin removes a student from this subject only (keeps the account).
   * Quiz/game attempt history is retained for records; the student loses access.
   */
  async removeStudent(courseId, studentId, user) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && Number(course.teacher_id) !== Number(user.id)) {
      throw new AppError("Access denied", 403);
    }

    const enrolled = await CourseModel.isEnrolled(courseId, studentId);
    if (!enrolled) {
      throw new AppError("Student is not enrolled in this subject", 404);
    }

    const student = await UserModel.findById(studentId);
    if (!student || student.role !== "student") {
      throw new AppError("Student not found", 404);
    }

    await CourseModel.unenroll(courseId, studentId);

    await NotificationModel.create({
      userId: studentId,
      title: "Removed from subject",
      message: `You were removed from "${course.subject || course.title}".`,
      type: "course",
      link: "/student/courses",
    });

    await ActivityLogService.log({
      actorId: user?.id || null,
      action: "course.student_removed",
      entityType: "course",
      entityId: courseId,
      summary: `Removed ${student.first_name} ${student.last_name} from "${course.subject || course.title}"`,
      metadata: { studentId: Number(studentId) },
    });

    return {
      courseId: Number(courseId),
      studentId: Number(studentId),
    };
  },

  async getStudentCourses(studentId) {
    const placement = await getStudentPlacement(studentId);
    if (
      !placement.gradeLevel ||
      !isValidSchoolYearLabel(placement.schoolYear)
    ) {
      return [];
    }
    const courses = await CourseModel.getStudentCourses(studentId, {
      gradeLevel: placement.gradeLevel,
      schoolYear: placement.schoolYear,
    });
    const visible = [];
    for (const course of courses) {
      const next = await this.deactivateIfExpired(course);
      if (next.is_published && !isCourseExpired(next)) {
        visible.push(next);
      }
    }
    return visible;
  },

  /**
   * Student may use course content only when the subject matches their
   * grade level and school year. Enrollment alone is not enough.
   */
  async assertStudentCourseAccess(courseId, studentId, { requireEnrollment = false } = {}) {
    let course = await CourseModel.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404);
    }
    course = await this.deactivateIfExpired(course);
    if (isCourseExpired(course)) {
      throw new AppError(COURSE_EXPIRED_MESSAGE, 404);
    }
    if (!course.is_published) {
      throw new AppError("Course not found", 404);
    }

    const placement = await getStudentPlacement(studentId);
    if (!placement.gradeLevel) {
      throw new AppError(GRADE_LEVEL_REQUIRED_FOR_ENROLL_MESSAGE, 400);
    }
    if (!isValidSchoolYearLabel(placement.schoolYear)) {
      throw new AppError(SCHOOL_YEAR_REQUIRED_FOR_ACCESS_MESSAGE, 400);
    }
    if (!gradesMatch(placement.gradeLevel, course.grade_level)) {
      throw new AppError(GRADE_LEVEL_MISMATCH_MESSAGE, 403);
    }
    if (!schoolYearsMatch(placement.schoolYear, course.school_year)) {
      throw new AppError(SCHOOL_YEAR_MISMATCH_MESSAGE, 403);
    }

    if (requireEnrollment) {
      const enrolled = await CourseModel.isEnrolled(courseId, studentId);
      if (!enrolled) {
        throw new AppError("Course not found", 404);
      }
    }

    return course;
  },

  /**
   * Live subjects use the student's current grade and school year.
   * An enrollment from another school year, or a closed subject the student
   * already joined, stays readable. New quizzes and games stay closed.
   */
  async resolveStudentCourseAccess(courseId, studentId) {
    let course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);
    course = await this.deactivateIfExpired(course);

    const enrolled = await CourseModel.isEnrolled(courseId, studentId);
    try {
      const live = await this.assertStudentCourseAccess(courseId, studentId);
      return { course: live, enrolled, recordOnly: false };
    } catch (error) {
      if (!enrolled) throw error;
      const placement = await getStudentPlacement(studentId);
      const courseYear = String(course.school_year || "").trim();
      const studentYear = String(placement.schoolYear || "").trim();
      const previousYear = Boolean(
        courseYear && studentYear && courseYear !== studentYear,
      );
      const closed = !course.is_published || isCourseExpired(course);
      if (previousYear || closed) {
        return { course, enrolled: true, recordOnly: true };
      }
      throw error;
    }
  },

  /**
   * After a grade change, drop current-year enrollments that no longer match.
   * Previous school year enrollments stay so those records remain available.
   */
  async alignStudentAccessAfterPlacementChange(studentId, actorId = null) {
    const placement = await getStudentPlacement(studentId);
    if (
      !placement.gradeLevel ||
      !isValidSchoolYearLabel(placement.schoolYear)
    ) {
      return { removed: [] };
    }

    const removed = await CourseModel.unenrollWherePlacementMismatch(
      studentId,
      {
        gradeLevel: placement.gradeLevel,
        schoolYear: placement.schoolYear,
      },
    );

    if (removed.length) {
      const subjectNames = removed
        .map((row) => row.subject || row.title)
        .filter(Boolean);
      const preview = subjectNames.slice(0, 3).join(", ");
      const extra =
        subjectNames.length > 3 ? ` and ${subjectNames.length - 3} more` : "";

      await NotificationModel.create({
        userId: studentId,
        title: "Subjects updated",
        message: `Your class placement changed. You were removed from ${preview}${extra}. Browse subjects for your current grade and school year to enroll again.`,
        type: "course",
        link: "/student/courses",
      });

      await ActivityLogService.log({
        actorId: actorId || null,
        action: "course.student_placement_aligned",
        entityType: "user",
        entityId: Number(studentId),
        summary: `Aligned subject access for student #${studentId} after class placement change`,
        metadata: {
          studentId: Number(studentId),
          gradeLevel: placement.gradeLevel,
          schoolYear: placement.schoolYear,
          section: placement.section,
          removedCourseIds: removed.map((row) => Number(row.id)),
        },
      });
    }

    return { removed };
  },

  async getEnrollments(courseId, user, rosterFilters = {}) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError("Course not found", 404);

    if (user.role === "teacher" && course.teacher_id !== user.id) {
      throw new AppError("Access denied", 403);
    }

    return CourseModel.getEnrollments(courseId, rosterFilters);
  },

  async listTeacherSections(teacherId, filters = {}) {
    const catalog = await ClassSectionService.listOptions(filters);
    if (catalog.length) {
      // Always expose the admin catalog so newly added sections appear system-wide
      // before any students are assigned to them.
      return catalog;
    }
    return CourseModel.listTeacherSections(teacherId, filters);
  },
};

export default CourseService;
