import CourseService from "../services/CourseService.js";
import GradebookService from "../services/GradebookService.js";
import { successResponse } from "../utils/apiResponse.js";

const CourseController = {
  async create(req, res, next) {
    try {
      const data = await CourseService.createCourse(req.body, req.user.id, req.user);
      return successResponse(res, "Course created", data, 201);
    } catch (error) {
      return next(error);
    }
  },

  async list(req, res, next) {
    try {
      const filters = {
        ...req.query,
        teacherId:
          req.user.role === "teacher" ? req.user.id : req.query.teacherId,
        publishedOnly:
          req.user.role === "student"
            ? true
            : req.query.publishedOnly === "true",
      };
      const data = await CourseService.listCourses(filters, req.user);
      return successResponse(res, "Courses retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await CourseService.getCourseById(
        Number(req.params.id),
        req.user,
      );
      return successResponse(res, "Course retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const data = await CourseService.updateCourse(
        Number(req.params.id),
        req.body,
        req.user,
      );
      return successResponse(res, "Course updated", data);
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await CourseService.deleteCourse(Number(req.params.id), req.user);
      return successResponse(res, "Course deleted", {});
    } catch (error) {
      return next(error);
    }
  },

  async enroll(req, res, next) {
    try {
      const data = await CourseService.enrollStudent(
        Number(req.params.id),
        req.user.id,
      );
      return successResponse(res, "Enrolled successfully", data);
    } catch (error) {
      return next(error);
    }
  },

  async removeStudent(req, res, next) {
    try {
      const data = await CourseService.removeStudent(
        Number(req.params.id),
        Number(req.params.studentId),
        req.user,
      );
      return successResponse(res, "Student removed from subject", data);
    } catch (error) {
      return next(error);
    }
  },

  async myCourses(req, res, next) {
    try {
      const data = await CourseService.getStudentCourses(req.user.id);
      return successResponse(res, "Enrolled courses retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async enrollments(req, res, next) {
    try {
      const data = await CourseService.getEnrollments(
        Number(req.params.id),
        req.user,
        {
          schoolYear: req.query.schoolYear,
          gradeLevel: req.query.gradeLevel,
          section: req.query.section,
        },
      );
      return successResponse(res, "Enrollments retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async teacherSections(req, res, next) {
    try {
      const teacherId =
        req.user.role === "teacher" ? req.user.id : Number(req.query.teacherId);
      if (!teacherId) {
        return successResponse(res, "Student sections retrieved", []);
      }
      const data = await CourseService.listTeacherSections(teacherId, {
        schoolYear: req.query.schoolYear,
        gradeLevel: req.query.gradeLevel,
      });
      return successResponse(res, "Student sections retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async gradebook(req, res, next) {
    try {
      const data = await GradebookService.getCourseGradebook(
        Number(req.params.id),
        req.user,
        {
          schoolYear: req.query.schoolYear,
          gradeLevel: req.query.gradeLevel,
          section: req.query.section,
        },
      );
      return successResponse(res, "Gradebook retrieved", data);
    } catch (error) {
      return next(error);
    }
  },

  async updateQuizGrade(req, res, next) {
    try {
      const data = await GradebookService.updateQuizStudentScore(
        Number(req.params.id),
        Number(req.params.quizId),
        Number(req.params.studentId),
        req.body,
        req.user,
      );
      return successResponse(res, "Quiz score saved", data);
    } catch (error) {
      return next(error);
    }
  },

  async updateGameGrade(req, res, next) {
    try {
      const data = await GradebookService.updateGameStudentScore(
        Number(req.params.id),
        Number(req.params.gameId),
        Number(req.params.studentId),
        req.body,
        req.user,
      );
      return successResponse(res, "Game score saved", data);
    } catch (error) {
      return next(error);
    }
  },
};

export default CourseController;
