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
  parseSchoolYearLabel,
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

function snapshotFromLabel(schoolYear, configured) {
  const bounds = getSchoolYearBounds(schoolYear);
  const calendarStart = calendarSchoolYearStartYear();
  const options = listSchoolYearOptions({ includeAll: false });
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

const AcademicYearService = {
  async loadCurrent() {
    const stored = await readStoredLabel();
    if (stored) {
      setCurrentSchoolYearOverride(parseSchoolYearLabel(stored));
      return snapshotFromLabel(stored, true);
    }
    setCurrentSchoolYearOverride(null);
    return snapshotFromLabel(
      formatSchoolYearLabel(calendarSchoolYearStartYear()),
      false,
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
    const next = snapshotFromLabel(label, true);
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
};

export default AcademicYearService;
