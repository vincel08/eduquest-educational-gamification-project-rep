import ClassSectionModel from "../models/ClassSectionModel.js";
import StudentProfileModel from "../models/StudentProfileModel.js";
import UserModel from "../models/UserModel.js";
import AppError from "../utils/AppError.js";
import {
  SECTION_INVALID_MESSAGE,
  SECTION_REQUIRED_MESSAGE,
  SCHOOL_YEAR_INVALID_MESSAGE,
  isValidSection,
  normalizeSection,
} from "../utils/classSections.js";
import {
  GRADE_LEVEL_INVALID_MESSAGE,
  isValidGradeLevel,
  normalizeGradeLevel,
} from "../utils/gradeLevels.js";
import { isValidSchoolYearLabel } from "../utils/schoolYears.js";
import ActivityLogService from "./ActivityLogService.js";

export const SECTION_NOT_IN_CATALOG_MESSAGE =
  "Please select a valid class section for this grade and school year.";

function serializeSection(row) {
  if (!row) return null;
  return {
    id: row.id,
    schoolYear: row.school_year,
    gradeLevel: row.grade_level,
    name: row.name,
    adviserId: row.adviser_id || null,
    adviserName:
      row.adviser_first_name || row.adviser_last_name
        ? `${row.adviser_first_name || ""} ${row.adviser_last_name || ""}`.trim()
        : null,
    adviserEmail: row.adviser_email || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertValidAdviser(adviserId) {
  if (adviserId === null || adviserId === undefined || adviserId === "") {
    return null;
  }
  const id = Number(adviserId);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError("Invalid adviser", 400);
  }
  const user = await UserModel.findById(id);
  if (!user || user.role !== "teacher" || !user.is_active) {
    throw new AppError("Adviser must be an active teacher account", 400);
  }
  return id;
}

const ClassSectionService = {
  async list(filters = {}) {
    const result = await ClassSectionModel.findAll(filters);
    return {
      sections: result.sections.map(serializeSection),
      total: result.total,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 100,
    };
  },

  async getById(id) {
    const row = await ClassSectionModel.findById(id);
    if (!row) throw new AppError("Class section not found", 404);
    return serializeSection(row);
  },

  async create(data, actor = null) {
    const schoolYear = String(data.schoolYear || "").trim();
    if (!isValidSchoolYearLabel(schoolYear)) {
      throw new AppError(SCHOOL_YEAR_INVALID_MESSAGE, 400);
    }

    const gradeLevel = normalizeGradeLevel(data.gradeLevel);
    if (!gradeLevel || !isValidGradeLevel(gradeLevel)) {
      throw new AppError(GRADE_LEVEL_INVALID_MESSAGE, 400);
    }

    const name = normalizeSection(data.name);
    if (!name) {
      throw new AppError("Section name is required.", 400);
    }
    if (!isValidSection(name)) {
      throw new AppError(SECTION_INVALID_MESSAGE, 400);
    }

    const existing = await ClassSectionModel.findByIdentity(
      schoolYear,
      gradeLevel,
      name,
    );
    if (existing) {
      throw new AppError(
        "A section with this name already exists for that school year and grade.",
        409,
      );
    }

    const adviserId = await assertValidAdviser(data.adviserId);
    const row = await ClassSectionModel.create({
      schoolYear,
      gradeLevel,
      name,
      adviserId,
    });
    const section = serializeSection(row);
    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "section.created",
      entityType: "class_section",
      entityId: section.id,
      summary: `Created section ${section.name} (${section.gradeLevel}, SY ${section.schoolYear})`,
    });
    return section;
  },

  async update(id, data, actor = null) {
    const current = await ClassSectionModel.findById(id);
    if (!current) throw new AppError("Class section not found", 404);

    const schoolYear =
      data.schoolYear !== undefined
        ? String(data.schoolYear || "").trim()
        : current.school_year;
    if (!isValidSchoolYearLabel(schoolYear)) {
      throw new AppError(SCHOOL_YEAR_INVALID_MESSAGE, 400);
    }

    const gradeLevel =
      data.gradeLevel !== undefined
        ? normalizeGradeLevel(data.gradeLevel)
        : current.grade_level;
    if (!gradeLevel || !isValidGradeLevel(gradeLevel)) {
      throw new AppError(GRADE_LEVEL_INVALID_MESSAGE, 400);
    }

    const name =
      data.name !== undefined
        ? normalizeSection(data.name)
        : current.name;
    if (!name) {
      throw new AppError("Section name is required.", 400);
    }
    if (!isValidSection(name)) {
      throw new AppError(SECTION_INVALID_MESSAGE, 400);
    }

    const duplicate = await ClassSectionModel.findByIdentity(
      schoolYear,
      gradeLevel,
      name,
    );
    if (duplicate && Number(duplicate.id) !== Number(id)) {
      throw new AppError(
        "A section with this name already exists for that school year and grade.",
        409,
      );
    }

    const adviserId =
      data.adviserId !== undefined
        ? await assertValidAdviser(data.adviserId)
        : current.adviser_id;

    const row = await ClassSectionModel.update(id, {
      schoolYear,
      gradeLevel,
      name,
      adviserId,
    });
    const section = serializeSection(row);
    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "section.updated",
      entityType: "class_section",
      entityId: section.id,
      summary: `Updated section ${section.name} (${section.gradeLevel}, SY ${section.schoolYear})`,
    });
    return section;
  },

  async remove(id, actor = null) {
    const current = await ClassSectionModel.findById(id);
    if (!current) throw new AppError("Class section not found", 404);

    const inUse = await ClassSectionModel.countStudentsUsing(
      current.school_year,
      current.grade_level,
      current.name,
    );
    if (inUse > 0) {
      throw new AppError(
        `Cannot delete section "${current.name}" while ${inUse} student(s) are assigned to it.`,
        400,
      );
    }

    await ClassSectionModel.delete(id);
    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "section.deleted",
      entityType: "class_section",
      entityId: id,
      summary: `Deleted section ${current.name} (${current.grade_level}, SY ${current.school_year})`,
    });
    return true;
  },

  /**
   * Section name options for selects/filters.
   * Prefers catalog; falls back to distinct profile values when catalog is empty.
   */
  async listOptions({ schoolYear, gradeLevel } = {}) {
    const catalog = await ClassSectionModel.listNames({
      schoolYear,
      gradeLevel,
    });
    if (catalog.length) {
      return catalog;
    }
    return StudentProfileModel.listDistinctSections({
      schoolYear,
      gradeLevel,
    });
  },

  async assertSectionInCatalog(schoolYear, gradeLevel, section) {
    const name = normalizeSection(section);
    if (!name) {
      throw new AppError(SECTION_REQUIRED_MESSAGE, 400);
    }

    const sy = String(schoolYear || "").trim();
    const grade = normalizeGradeLevel(gradeLevel);
    if (!isValidSchoolYearLabel(sy) || !grade || !isValidGradeLevel(grade)) {
      throw new AppError(SECTION_NOT_IN_CATALOG_MESSAGE, 400);
    }

    const catalogCount = await ClassSectionModel.findAll({
      schoolYear: sy,
      gradeLevel: grade,
      limit: 1,
    });
    // If admin has not configured sections yet, allow normalized free-text.
    if (!catalogCount.total) {
      if (!isValidSection(name)) {
        throw new AppError(SECTION_INVALID_MESSAGE, 400);
      }
      return name;
    }

    const match = await ClassSectionModel.findByIdentity(sy, grade, name);
    if (!match) {
      throw new AppError(SECTION_NOT_IN_CATALOG_MESSAGE, 400);
    }
    return match.name;
  },
};

export default ClassSectionService;
