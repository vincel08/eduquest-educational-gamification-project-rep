import { getConnection, query } from "../config/db.js";
import AppError from "../utils/AppError.js";
import ActivityLogService from "./ActivityLogService.js";
import {
  FIRST_SCHOOL_YEAR_START,
  calendarSchoolYearStartYear,
  formatSchoolYearLabel,
  getSchoolYearBounds,
  isValidSchoolYearLabel,
  listCalendarSchoolYearOptions,
  listSchoolYearOptions,
  managedSchoolYearError,
  normalizeManagedSchoolYear,
  parseSchoolYearLabel,
  schoolYearTiming,
  setCurrentSchoolYearOverride,
} from "../utils/schoolYears.js";

const SETTING_KEY = "current_school_year";

function mysqlDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function countLabel(count, singular, plural) {
  const value = Number(count) || 0;
  return `${value} ${value === 1 ? singular : plural}`;
}

async function readStoredLabel() {
  try {
    const rows = await query(
      `SELECT setting_value
       FROM system_settings
       WHERE setting_key = :settingKey
       LIMIT 1`,
      { settingKey: SETTING_KEY },
    );
    const value = String(rows[0]?.setting_value || "").trim();
    return isValidSchoolYearLabel(value) ? value : null;
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") return null;
    throw error;
  }
}

function snapshotFromLabel(schoolYear, configured, catalogOptions = null) {
  const bounds = getSchoolYearBounds(schoolYear);
  const calendarStart = calendarSchoolYearStartYear();
  const options = catalogOptions?.length
    ? catalogOptions
    : listSchoolYearOptions({ includeAll: false });
  const settableYears = listCalendarSchoolYearOptions();

  return {
    schoolYear,
    calendarSchoolYear: formatSchoolYearLabel(calendarStart),
    start: bounds.start,
    endExclusive: bounds.endExclusive,
    configured: Boolean(configured),
    options,
    settableYears,
    nextSchoolYear: formatSchoolYearLabel(calendarStart + 1),
  };
}

function assertSettable(label) {
  const startYear = parseSchoolYearLabel(label);
  const maxYear = calendarSchoolYearStartYear();
  if (
    !startYear ||
    startYear < FIRST_SCHOOL_YEAR_START ||
    startYear > maxYear
  ) {
    const systemYear = formatSchoolYearLabel(maxYear);
    throw new AppError(
      `Choose a school year from SY ${formatSchoolYearLabel(FIRST_SCHOOL_YEAR_START)} through the system school year, SY ${systemYear}.`,
      400,
    );
  }
}

function contentCountLabel(refresh, subjectKey, quizKey, gameKey) {
  return [
    countLabel(refresh[subjectKey], "subject", "subjects"),
    countLabel(refresh[quizKey], "quiz", "quizzes"),
    countLabel(refresh[gameKey], "game", "games"),
  ].join(", ");
}

function describeChange(schoolYear, refresh) {
  if (refresh.unchanged) {
    return `School year is already SY ${schoolYear}.`;
  }
  if (refresh.reverted) {
    return `School year is now SY ${schoolYear}. Moved ${countLabel(refresh.studentsMoved, "student", "students")} back from SY ${refresh.previousSchoolYear}, and reopened ${contentCountLabel(refresh, "subjectsReopened", "quizzesReopened", "gamesReopened")}. Lessons, scores, and gradebook records stay in place.`;
  }
  if (!refresh.advanced) {
    return `Current school year is now SY ${schoolYear}.`;
  }
  return `School year is now SY ${schoolYear}. Closed ${contentCountLabel(refresh, "subjectsClosed", "quizzesClosed", "gamesClosed")} from SY ${refresh.previousSchoolYear}, copied ${countLabel(refresh.sectionsCopied, "class section", "class sections")}, and moved ${countLabel(refresh.studentsMoved, "student", "students")} to the new school year. Previous school year records stay available.`;
}

const CLOSEABLE_COURSE_SQL = `
  c.school_year = :previousSchoolYear
  AND (
    c.is_published = 1
    OR c.ends_at IS NULL
    OR c.ends_at > :closedAt
  )
`;

async function insertClosureRows(connection, rows) {
  for (const row of rows) {
    await connection.query(
      `INSERT INTO school_year_closures (
         school_year, entity_type, entity_id, was_published, ends_at, closed_at
       ) VALUES (
         :schoolYear, :entityType, :entityId, :wasPublished, :endsAt, :closedAt
       )
       ON DUPLICATE KEY UPDATE
         was_published = VALUES(was_published),
         ends_at = VALUES(ends_at),
         closed_at = VALUES(closed_at)`,
      row,
    );
  }
}

async function snapshotAndCloseYearContent(connection, schoolYear, closedAt) {
  const params = { previousSchoolYear: schoolYear, closedAt };
  const [courses] = await connection.query(
    `SELECT c.id, c.is_published,
            DATE_FORMAT(c.ends_at, '%Y-%m-%d %H:%i:%s') AS ends_at
     FROM courses c
     WHERE ${CLOSEABLE_COURSE_SQL}`,
    params,
  );
  const [quizzes] = await connection.query(
    `SELECT q.id, q.is_published
     FROM quizzes q
     INNER JOIN courses c ON c.id = q.course_id
     WHERE ${CLOSEABLE_COURSE_SQL}`,
    params,
  );
  const [games] = await connection.query(
    `SELECT g.id, g.is_published
     FROM educational_games g
     INNER JOIN courses c ON c.id = g.course_id
     WHERE ${CLOSEABLE_COURSE_SQL}`,
    params,
  );

  await connection.query(
    `DELETE FROM school_year_closures WHERE school_year = :schoolYear`,
    { schoolYear },
  );
  await insertClosureRows(connection, [
    ...courses.map((course) => ({
      schoolYear,
      entityType: "course",
      entityId: course.id,
      wasPublished: course.is_published ? 1 : 0,
      endsAt: course.ends_at || null,
      closedAt,
    })),
    ...quizzes.map((quiz) => ({
      schoolYear,
      entityType: "quiz",
      entityId: quiz.id,
      wasPublished: quiz.is_published ? 1 : 0,
      endsAt: null,
      closedAt,
    })),
    ...games.map((game) => ({
      schoolYear,
      entityType: "game",
      entityId: game.id,
      wasPublished: game.is_published ? 1 : 0,
      endsAt: null,
      closedAt,
    })),
  ]);

  const [quizResult] = await connection.query(
    `UPDATE quizzes q
     INNER JOIN courses c ON c.id = q.course_id
     SET q.is_published = 0
     WHERE q.is_published = 1
       AND ${CLOSEABLE_COURSE_SQL}`,
    params,
  );
  const [gameResult] = await connection.query(
    `UPDATE educational_games g
     INNER JOIN courses c ON c.id = g.course_id
     SET g.is_published = 0
     WHERE g.is_published = 1
       AND ${CLOSEABLE_COURSE_SQL}`,
    params,
  );
  const [courseResult] = await connection.query(
    `UPDATE courses c
     SET c.is_published = 0,
         c.ends_at = :closedAt
     WHERE ${CLOSEABLE_COURSE_SQL}`,
    params,
  );

  return {
    subjectsClosed: courseResult.affectedRows || 0,
    quizzesClosed: quizResult.affectedRows || 0,
    gamesClosed: gameResult.affectedRows || 0,
  };
}

async function reopenYearContent(connection, schoolYear) {
  const [counts] = await connection.query(
    `SELECT entity_type,
            SUM(CASE WHEN was_published = 1 THEN 1 ELSE 0 END) AS published_count
     FROM school_year_closures
     WHERE school_year = :schoolYear
     GROUP BY entity_type`,
    { schoolYear },
  );
  const publishedByType = Object.fromEntries(
    counts.map((row) => [row.entity_type, Number(row.published_count) || 0]),
  );

  await connection.query(
    `UPDATE courses c
     INNER JOIN school_year_closures s
       ON s.entity_type = 'course'
      AND s.entity_id = c.id
      AND s.school_year = :schoolYear
     SET c.is_published = s.was_published,
         c.ends_at = s.ends_at
     WHERE c.school_year = :schoolYear`,
    { schoolYear },
  );
  await connection.query(
    `UPDATE quizzes q
     INNER JOIN school_year_closures s
       ON s.entity_type = 'quiz'
      AND s.entity_id = q.id
      AND s.school_year = :schoolYear
     SET q.is_published = s.was_published`,
    { schoolYear },
  );
  await connection.query(
    `UPDATE educational_games g
     INNER JOIN school_year_closures s
       ON s.entity_type = 'game'
      AND s.entity_id = g.id
      AND s.school_year = :schoolYear
     SET g.is_published = s.was_published`,
    { schoolYear },
  );
  await connection.query(
    `DELETE FROM school_year_closures WHERE school_year = :schoolYear`,
    { schoolYear },
  );

  return {
    subjectsReopened: publishedByType.course || 0,
    quizzesReopened: publishedByType.quiz || 0,
    gamesReopened: publishedByType.game || 0,
  };
}

const CATALOG_UNAVAILABLE_MESSAGE =
  "School year management is unavailable until database migrations are applied.";

let catalogReady = false;

function catalogUnavailable(error) {
  return error?.code === "ER_NO_SUCH_TABLE";
}

async function ensureCatalog() {
  if (catalogReady) return true;
  const labels = new Set();
  const calendarStart = calendarSchoolYearStartYear();
  for (let startYear = FIRST_SCHOOL_YEAR_START; startYear <= calendarStart; startYear += 1) {
    labels.add(formatSchoolYearLabel(startYear));
  }

  try {
    const used = await query(
      `SELECT DISTINCT school_year AS label
       FROM courses
       WHERE school_year IS NOT NULL AND TRIM(school_year) <> ''
       UNION
       SELECT DISTINCT school_year
       FROM student_profiles
       WHERE school_year IS NOT NULL AND TRIM(school_year) <> ''
       UNION
       SELECT DISTINCT school_year
       FROM class_sections
       WHERE school_year IS NOT NULL AND TRIM(school_year) <> ''
       UNION
       SELECT DISTINCT school_year
       FROM course_enrollments
       WHERE school_year IS NOT NULL AND TRIM(school_year) <> ''`,
    );
    for (const row of used) {
      const label = normalizeManagedSchoolYear(row.label);
      // Keep every year already stored on a record, even outside the add range.
      if (isValidSchoolYearLabel(label)) labels.add(label);
    }

    for (const label of labels) {
      await query(
        `INSERT IGNORE INTO school_years (label, start_year)
         VALUES (:label, :startYear)`,
        { label, startYear: parseSchoolYearLabel(label) },
      );
    }
    catalogReady = true;
    return true;
  } catch (error) {
    if (catalogUnavailable(error)) return false;
    throw error;
  }
}

async function catalogOptions() {
  const ready = await ensureCatalog();
  if (!ready) return null;
  const rows = await query(
    `SELECT label
     FROM school_years
     ORDER BY start_year ASC, id ASC`,
  );
  return rows.map((row) => ({
    value: row.label,
    label: `SY ${row.label}`,
  }));
}

async function countUsage(label) {
  const rows = await query(
    `SELECT COUNT(*) AS used
     FROM (
       SELECT school_year FROM courses WHERE school_year = :label
       UNION ALL
       SELECT school_year FROM student_profiles WHERE school_year = :label
       UNION ALL
       SELECT school_year FROM class_sections WHERE school_year = :label
       UNION ALL
       SELECT school_year FROM course_enrollments WHERE school_year = :label
     ) records`,
    { label },
  );
  return Number(rows[0]?.used) || 0;
}

function timingLabel(timing) {
  if (timing === "previous") return "previous";
  if (timing === "future") return "future";
  return "current";
}

const AcademicYearService = {
  async assertManaged(schoolYear) {
    const label = normalizeManagedSchoolYear(schoolYear);
    if (!isValidSchoolYearLabel(label)) {
      throw new AppError("Choose a valid school year.", 400);
    }
    const ready = await ensureCatalog();
    if (!ready) return label;
    const rows = await query(
      `SELECT label
       FROM school_years
       WHERE label = :label
       LIMIT 1`,
      { label },
    );
    if (!rows[0]) {
      throw new AppError(
        `Add SY ${label} in School Years before using it.`,
        400,
      );
    }
    return label;
  },

  async loadCurrent() {
    const options = await catalogOptions();
    const stored = await readStoredLabel();
    if (stored) {
      setCurrentSchoolYearOverride(parseSchoolYearLabel(stored));
      return snapshotFromLabel(stored, true, options);
    }
    setCurrentSchoolYearOverride(null);
    return snapshotFromLabel(
      formatSchoolYearLabel(calendarSchoolYearStartYear()),
      false,
      options,
    );
  },

  async getCurrent() {
    return this.loadCurrent();
  },

  async setCurrent(schoolYear, actor = null) {
    const label = String(schoolYear || "").trim();
    if (!isValidSchoolYearLabel(label)) {
      throw new AppError("Choose a valid school year.", 400);
    }

    const before = await this.loadCurrent();
    assertSettable(label);

    if (before.schoolYear === label && before.configured) {
      return {
        ...before,
        refresh: {
          unchanged: true,
          advanced: false,
          reverted: false,
          previousSchoolYear: before.schoolYear,
          subjectsClosed: 0,
          quizzesClosed: 0,
          gamesClosed: 0,
          subjectsReopened: 0,
          quizzesReopened: 0,
          gamesReopened: 0,
          sectionsCopied: 0,
          studentsMoved: 0,
        },
        message: describeChange(label, { unchanged: true }),
      };
    }

    const previousStart = parseSchoolYearLabel(before.schoolYear);
    const nextStart = parseSchoolYearLabel(label);
    const advanced = nextStart > previousStart;
    const reverted = nextStart < previousStart;
    const closedAt = mysqlDateTime(new Date());
    const refresh = {
      unchanged: false,
      advanced,
      reverted,
      previousSchoolYear: before.schoolYear,
      subjectsClosed: 0,
      quizzesClosed: 0,
      gamesClosed: 0,
      subjectsReopened: 0,
      quizzesReopened: 0,
      gamesReopened: 0,
      sectionsCopied: 0,
      studentsMoved: 0,
    };

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      if (advanced) {
        await connection.query(
          `UPDATE course_enrollments ce
           INNER JOIN courses c ON c.id = ce.course_id
           SET ce.school_year = c.school_year
           WHERE c.school_year = :previousSchoolYear
             AND (ce.school_year IS NULL OR TRIM(ce.school_year) = '')`,
          { previousSchoolYear: before.schoolYear },
        );

        const closed = await snapshotAndCloseYearContent(
          connection,
          before.schoolYear,
          closedAt,
        );
        refresh.subjectsClosed = closed.subjectsClosed;
        refresh.quizzesClosed = closed.quizzesClosed;
        refresh.gamesClosed = closed.gamesClosed;

        const [sectionResult] = await connection.query(
          `INSERT INTO class_sections (school_year, grade_level, name, adviser_id)
           SELECT :nextSchoolYear, src.grade_level, src.name, src.adviser_id
           FROM class_sections src
           WHERE src.school_year = :previousSchoolYear
             AND NOT EXISTS (
               SELECT 1
               FROM class_sections dest
               WHERE dest.school_year = :nextSchoolYear
                 AND dest.grade_level = src.grade_level
                 AND dest.name = src.name
             )`,
          {
            nextSchoolYear: label,
            previousSchoolYear: before.schoolYear,
          },
        );
        refresh.sectionsCopied = sectionResult.affectedRows || 0;

        const [studentResult] = await connection.query(
          `UPDATE student_profiles
           SET school_year = :nextSchoolYear
           WHERE school_year = :previousSchoolYear`,
          {
            nextSchoolYear: label,
            previousSchoolYear: before.schoolYear,
          },
        );
        refresh.studentsMoved = studentResult.affectedRows || 0;
      }

      if (reverted) {
        const [studentResult] = await connection.query(
          `UPDATE student_profiles
           SET school_year = :nextSchoolYear
           WHERE school_year = :previousSchoolYear`,
          {
            nextSchoolYear: label,
            previousSchoolYear: before.schoolYear,
          },
        );
        refresh.studentsMoved = studentResult.affectedRows || 0;

        const reopened = await reopenYearContent(connection, label);
        refresh.subjectsReopened = reopened.subjectsReopened;
        refresh.quizzesReopened = reopened.quizzesReopened;
        refresh.gamesReopened = reopened.gamesReopened;
      }

      await connection.query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_by)
         VALUES (:settingKey, :settingValue, :updatedBy)
         ON DUPLICATE KEY UPDATE
           setting_value = VALUES(setting_value),
           updated_by = VALUES(updated_by)`,
        {
          settingKey: SETTING_KEY,
          settingValue: label,
          updatedBy: actor?.id || null,
        },
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    setCurrentSchoolYearOverride(nextStart);
    const next = snapshotFromLabel(label, true, await catalogOptions());
    const message = describeChange(label, refresh);

    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "school_year.updated",
      entityType: "system_setting",
      entityId: null,
      summary: message,
      metadata: refresh,
    });

    return { ...next, refresh, message };
  },

  async listManaged() {
    const ready = await ensureCatalog();
    if (!ready) {
      throw new AppError(CATALOG_UNAVAILABLE_MESSAGE, 503);
    }
    const current = await this.loadCurrent();
    const rows = await query(
      `SELECT label, start_year AS startYear
       FROM school_years
       ORDER BY start_year ASC, id ASC`,
    );
    const usageRows = await query(
      `SELECT school_year AS label, COUNT(*) AS used
       FROM (
         SELECT school_year FROM courses WHERE school_year IS NOT NULL
         UNION ALL
         SELECT school_year FROM student_profiles WHERE school_year IS NOT NULL
         UNION ALL
         SELECT school_year FROM class_sections WHERE school_year IS NOT NULL
         UNION ALL
         SELECT school_year FROM course_enrollments WHERE school_year IS NOT NULL
       ) records
       GROUP BY school_year`,
    );
    const usage = new Map(
      usageRows.map((row) => [String(row.label), Number(row.used) || 0]),
    );
    const calendarStart = calendarSchoolYearStartYear();

    return rows.map((row) => {
      const startYear = Number(row.startYear);
      const used = usage.get(row.label) || 0;
      const extra = startYear < FIRST_SCHOOL_YEAR_START || startYear > calendarStart;
      return {
        schoolYear: row.label,
        startYear,
        timing: schoolYearTiming(row.label),
        isCurrentSetting: row.label === current.schoolYear,
        used,
        canRemove: extra && used === 0 && row.label !== current.schoolYear,
      };
    });
  },

  async addSchoolYear(schoolYear, actor = null) {
    const label = normalizeManagedSchoolYear(schoolYear);
    const rangeError = managedSchoolYearError(label);
    if (rangeError) throw new AppError(rangeError, 400);

    const ready = await ensureCatalog();
    if (!ready) throw new AppError(CATALOG_UNAVAILABLE_MESSAGE, 503);

    const before = await this.loadCurrent();
    try {
      await query(
        `INSERT INTO school_years (label, start_year, created_by)
         VALUES (:label, :startYear, :createdBy)`,
        {
          label,
          startYear: parseSchoolYearLabel(label),
          createdBy: actor?.id || null,
        },
      );
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        throw new AppError(`SY ${label} is already available.`, 409);
      }
      throw error;
    }

    const timing = schoolYearTiming(label);
    const snapshot = await this.loadCurrent();
    const message = `Added SY ${label} as a ${timingLabel(timing)} school year. The current school year is still SY ${snapshot.schoolYear}.`;

    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "school_year.added",
      entityType: "school_year",
      entityId: null,
      summary: message,
      metadata: {
        schoolYear: label,
        timing,
        currentSchoolYear: snapshot.schoolYear,
      },
    });

    return {
      ...snapshot,
      added: { schoolYear: label, timing },
      message,
      previousSchoolYear: before.schoolYear,
    };
  },

  async removeSchoolYear(startYear, actor = null) {
    const year = Number(startYear);
    if (!Number.isInteger(year)) {
      throw new AppError("Choose a school year.", 400);
    }
    const label = formatSchoolYearLabel(year);
    const ready = await ensureCatalog();
    if (!ready) throw new AppError(CATALOG_UNAVAILABLE_MESSAGE, 503);

    const current = await this.loadCurrent();
    if (label === current.schoolYear) {
      throw new AppError("The current school year setting cannot be removed.", 400);
    }
    const calendarStart = calendarSchoolYearStartYear();
    if (year >= FIRST_SCHOOL_YEAR_START && year <= calendarStart) {
      throw new AppError(
        "This school year stays available because it is inside the system range.",
        400,
      );
    }

    const existing = await query(
      `SELECT id FROM school_years WHERE label = :label LIMIT 1`,
      { label },
    );
    if (!existing[0]) throw new AppError("School year not found.", 404);

    const used = await countUsage(label);
    if (used > 0) {
      throw new AppError(
        "This school year is already used by students, subjects, or sections.",
        400,
      );
    }

    const removed = await query(
      `DELETE sy FROM school_years sy
       WHERE sy.label = :label
         AND NOT EXISTS (SELECT 1 FROM courses c WHERE c.school_year = sy.label)
         AND NOT EXISTS (
           SELECT 1 FROM student_profiles sp WHERE sp.school_year = sy.label
         )
         AND NOT EXISTS (
           SELECT 1 FROM class_sections cs WHERE cs.school_year = sy.label
         )
         AND NOT EXISTS (
           SELECT 1 FROM course_enrollments ce WHERE ce.school_year = sy.label
         )`,
      { label },
    );
    if (!removed?.affectedRows) {
      const stillThere = await query(
        `SELECT id FROM school_years WHERE label = :label LIMIT 1`,
        { label },
      );
      throw new AppError(
        stillThere[0]
          ? "This school year is already used by students, subjects, or sections."
          : "School year not found.",
        stillThere[0] ? 400 : 404,
      );
    }
    const snapshot = await this.loadCurrent();
    const message = `Removed SY ${label}. The current school year is still SY ${snapshot.schoolYear}.`;

    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "school_year.removed",
      entityType: "school_year",
      entityId: null,
      summary: message,
      metadata: { schoolYear: label, currentSchoolYear: snapshot.schoolYear },
    });

    return { ...snapshot, message };
  },
};

export default AcademicYearService;
