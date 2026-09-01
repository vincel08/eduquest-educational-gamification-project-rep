import GamificationModel from "../models/GamificationModel.js";
import StudentProfileModel from "../models/StudentProfileModel.js";
import QuizModel from "../models/QuizModel.js";
import NotificationModel from "../models/NotificationModel.js";
import StreakService from "./StreakService.js";
import ActivityLogService from "./ActivityLogService.js";
import AppError from "../utils/AppError.js";
import {
  calculateLevel,
  xpForNextLevel,
  xpProgressInLevel,
} from "../utils/levelCalculator.js";

function isDuplicateKeyError(error) {
  return error?.code === "ER_DUP_ENTRY" || Number(error?.errno) === 1062;
}

function normalizeBadgeDifficulty(value) {
  if (value == null || value === "") return null;
  const normalized = String(value).toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : null;
}

function criteriaSupportsDifficulty(criteriaType) {
  return (
    criteriaType === "quizzes_passed" || criteriaType === "games_completed"
  );
}

function resolveBadgeDifficulty(criteriaType, value) {
  if (!criteriaSupportsDifficulty(criteriaType)) return null;
  return normalizeBadgeDifficulty(value) || "medium";
}

function badgeUnlockHint(badge) {
  const value = Number(badge.criteria_value) || 0;
  switch (badge.criteria_type) {
    case "xp":
      return `Earn ${value} XP to unlock`;
    case "lessons_completed":
      return `Finish ${value} lesson${value === 1 ? "" : "s"} to unlock`;
    case "quizzes_passed":
      return `Pass ${value} quiz${value === 1 ? "" : "zes"} to unlock`;
    case "games_completed":
      return `Complete ${value} game${value === 1 ? "" : "s"} to unlock`;
    case "streak":
      return `Reach a ${value}-day streak to unlock`;
    case "level":
      return `Reach level ${value} to unlock`;
    case "leaderboard_rank":
      return value <= 1
        ? "Reach #1 on the leaderboard to unlock"
        : `Reach top ${value} on the leaderboard to unlock`;
    case "perfect_quiz":
      return value <= 1
        ? "Score 100% on a quiz to unlock"
        : `Get ${value} perfect quiz scores to unlock`;
    case "manual":
      return "Your teacher can award this badge";
    default:
      return "Keep learning to unlock";
  }
}

function medalUnlockHint(medal) {
  const value = Number(medal.criteria_value) || 0;
  switch (medal.criteria_type) {
    case "level":
      return `Reach level ${value} to unlock`;
    case "leaderboard_rank":
      return value <= 1
        ? "Reach #1 on the leaderboard to unlock"
        : `Reach top ${value} on the leaderboard to unlock`;
    case "perfect_quiz":
      return "Score 100% on a quiz to unlock";
    case "xp":
      return `Earn ${value} XP to unlock`;
    case "streak":
      return `Reach a ${value}-day streak to unlock`;
    case "quizzes_passed":
      return `Pass ${value} quiz${value === 1 ? "" : "zes"} to unlock`;
    case "lessons_completed":
      return `Finish ${value} lesson${value === 1 ? "" : "s"} to unlock`;
    case "games_completed":
      return `Complete ${value} game${value === 1 ? "" : "s"} to unlock`;
    case "manual":
      return "Your teacher can award this medal";
    default:
      return "Keep learning to unlock";
  }
}

function badgeProgress(
  badge,
  { xp, streak, lessonsCompleted, quizzesPassed, gamesCompleted, level, rank, perfectQuizzes },
) {
  if (badge.criteria_type === "manual") return null;
  if (badge.criteria_type === "perfect_quiz" && Number(badge.criteria_value) <= 1) {
    return null;
  }
  const target = Math.max(1, Number(badge.criteria_value) || 1);

  if (badge.criteria_type === "leaderboard_rank") {
    if (!rank) {
      return { current: 0, target, percent: 0 };
    }
    const current = Math.max(0, target - Number(rank) + 1);
    return {
      current: Math.min(current, target),
      target,
      percent: Math.min(100, Math.round((current / target) * 100)),
    };
  }

  let current = 0;
  if (badge.criteria_type === "xp") current = Number(xp) || 0;
  if (badge.criteria_type === "lessons_completed") {
    current = Number(lessonsCompleted) || 0;
  }
  if (badge.criteria_type === "quizzes_passed") {
    current = Number(quizzesPassed) || 0;
  }
  if (badge.criteria_type === "games_completed") {
    current = Number(gamesCompleted) || 0;
  }
  if (badge.criteria_type === "streak") current = Number(streak) || 0;
  if (badge.criteria_type === "level") current = Number(level) || 1;
  if (badge.criteria_type === "perfect_quiz") {
    current = Number(perfectQuizzes) || 0;
  }
  return {
    current: Math.min(current, target),
    target,
    percent: Math.min(100, Math.round((current / target) * 100)),
  };
}

const BADGE_UNLOCKABLE_TYPES = [
  "xp",
  "quizzes_passed",
  "lessons_completed",
  "streak",
  "games_completed",
  "level",
  "leaderboard_rank",
  "perfect_quiz",
];

function medalProgress(
  medal,
  { level, rank, xp, streak, lessonsCompleted, quizzesPassed, gamesCompleted },
) {
  if (medal.criteria_type === "manual" || medal.criteria_type === "perfect_quiz") {
    return null;
  }
  const target = Math.max(1, Number(medal.criteria_value) || 1);
  if (medal.criteria_type === "level") {
    const current = Number(level) || 1;
    return {
      current: Math.min(current, target),
      target,
      percent: Math.min(100, Math.round((current / target) * 100)),
    };
  }
  if (medal.criteria_type === "leaderboard_rank") {
    if (!rank) {
      return { current: 0, target, percent: 0 };
    }
    // Lower rank number is better; progress rises as you approach the target band.
    const current = Math.max(0, target - Number(rank) + 1);
    return {
      current: Math.min(current, target),
      target,
      percent: Math.min(100, Math.round((current / target) * 100)),
    };
  }

  let current = 0;
  if (medal.criteria_type === "xp") current = Number(xp) || 0;
  if (medal.criteria_type === "streak") current = Number(streak) || 0;
  if (medal.criteria_type === "lessons_completed") {
    current = Number(lessonsCompleted) || 0;
  }
  if (medal.criteria_type === "quizzes_passed") {
    current = Number(quizzesPassed) || 0;
  }
  if (medal.criteria_type === "games_completed") {
    current = Number(gamesCompleted) || 0;
  }
  if (
    ["xp", "streak", "lessons_completed", "quizzes_passed", "games_completed"].includes(
      medal.criteria_type,
    )
  ) {
    return {
      current: Math.min(current, target),
      target,
      percent: Math.min(100, Math.round((current / target) * 100)),
    };
  }
  return null;
}

const MEDAL_UNLOCKABLE_TYPES = [
  "level",
  "leaderboard_rank",
  "perfect_quiz",
  "xp",
  "streak",
  "quizzes_passed",
  "lessons_completed",
  "games_completed",
];

/** Medals are major achievements — higher floors than badges. */
const MEDAL_CRITERIA_MIN = {
  level: 5,
  leaderboard_rank: 1,
  perfect_quiz: 1,
  xp: 500,
  streak: 7,
  quizzes_passed: 5,
  lessons_completed: 5,
  games_completed: 5,
};

function medalCriteriaMin(criteriaType) {
  return MEDAL_CRITERIA_MIN[criteriaType] ?? 5;
}

function assertMedalCriteriaValue(criteriaType, criteriaValue) {
  if (criteriaType === "perfect_quiz") return 1;
  const value = Number(criteriaValue);
  const min = medalCriteriaMin(criteriaType);
  if (!Number.isFinite(value) || value < min) {
    throw new AppError(
      `Medal criteria must be at least ${min} for ${criteriaType.replace(/_/g, " ")}`,
      400,
    );
  }
  return value;
}

function buildBadgeCollection(catalog, ownedRows, stats) {
  const ownedById = new Map(
    ownedRows.map((row) => [Number(row.badge_id), row]),
  );

  // Active unlockables + any inactive ones the student already earned.
  return catalog
    .filter((badge) => badge.criteria_type !== "manual")
    .filter(
      (badge) =>
        Number(badge.is_active) === 1 || ownedById.has(Number(badge.id)),
    )
    .map((badge) => {
      const owned = ownedById.get(Number(badge.id));
      const unlocked = Boolean(owned);
      const progress = unlocked
        ? {
            current: Math.max(1, Number(badge.criteria_value) || 1),
            target: Math.max(1, Number(badge.criteria_value) || 1),
            percent: 100,
          }
        : badgeProgress(badge, stats);
      return {
        id: Number(badge.id),
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        criteriaType: badge.criteria_type,
        criteriaValue: Number(badge.criteria_value) || 0,
        difficulty: criteriaSupportsDifficulty(badge.criteria_type)
          ? normalizeBadgeDifficulty(badge.difficulty)
          : null,
        xpBonus: Number(badge.xp_bonus) || 0,
        unlocked,
        awardedAt: owned?.awarded_at || null,
        progress,
        unlockHint: badgeUnlockHint(badge),
      };
    })
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      const ap = a.progress?.percent ?? (a.unlocked ? 100 : 0);
      const bp = b.progress?.percent ?? (b.unlocked ? 100 : 0);
      if (ap !== bp) return bp - ap;
      return String(a.name).localeCompare(String(b.name));
    });
}

function buildTeacherAwardedBadges(ownedRows) {
  return ownedRows
    .filter(
      (row) =>
        row.criteria_type === "manual" ||
        row.badge_created_by != null ||
        Number(row.owner_key) > 0,
    )
    .map((row) => ({
      id: Number(row.badge_id || row.id),
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      criteriaType: "manual",
      criteriaValue: Number(row.criteria_value) || 0,
      unlocked: true,
      awardedAt: row.awarded_at || null,
      awardedBy: row.awarded_by || null,
      createdBy: row.badge_created_by ?? null,
      progress: null,
      unlockHint: "Awarded by your teacher",
    }))
    .sort((a, b) => {
      const aTime = a.awardedAt ? new Date(a.awardedAt).getTime() : 0;
      const bTime = b.awardedAt ? new Date(b.awardedAt).getTime() : 0;
      return bTime - aTime;
    });
}

function buildMedalCollection(catalog, ownedRows, stats) {
  const ownedById = new Map(
    ownedRows.map((row) => [Number(row.medal_id), row]),
  );

  // Active unlockables + inactive ones the student already earned.
  return catalog
    .filter((medal) => medal.criteria_type !== "manual")
    .filter(
      (medal) =>
        Number(medal.is_active) === 1 || ownedById.has(Number(medal.id)),
    )
    .map((medal) => {
      const owned = ownedById.get(Number(medal.id));
      const unlocked = Boolean(owned);
      const progress = unlocked
        ? {
            current: Math.max(1, Number(medal.criteria_value) || 1),
            target: Math.max(1, Number(medal.criteria_value) || 1),
            percent: 100,
          }
        : medalProgress(medal, stats);
      return {
        id: Number(medal.id),
        name: medal.name,
        description: medal.description,
        icon: medal.icon,
        tier: medal.tier,
        criteriaType: medal.criteria_type,
        criteriaValue: Number(medal.criteria_value) || 0,
        unlocked,
        awardedAt: owned?.awarded_at || null,
        progress,
        unlockHint: medalUnlockHint(medal),
      };
    })
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      const ap = a.progress?.percent ?? (a.unlocked ? 100 : 0);
      const bp = b.progress?.percent ?? (b.unlocked ? 100 : 0);
      if (ap !== bp) return bp - ap;
      return String(a.name).localeCompare(String(b.name));
    });
}

function buildTeacherAwardedMedals(ownedRows) {
  return ownedRows
    .filter((row) => row.criteria_type === "manual")
    .map((row) => ({
      id: Number(row.medal_id || row.id),
      name: row.name,
      description: row.description,
      icon: row.icon,
      tier: row.tier,
      criteriaType: "manual",
      criteriaValue: Number(row.criteria_value) || 0,
      unlocked: true,
      awardedAt: row.awarded_at || null,
      awardedBy: row.awarded_by || null,
      progress: null,
      unlockHint: "Awarded by your teacher",
    }))
    .sort((a, b) => {
      const aTime = a.awardedAt ? new Date(a.awardedAt).getTime() : 0;
      const bTime = b.awardedAt ? new Date(b.awardedAt).getTime() : 0;
      return bTime - aTime;
    });
}

const DEFAULT_STUDENT_BADGES = [
  {
    name: "First Steps",
    description: "Complete your first lesson",
    icon: "school",
    color: "#42A5F5",
    criteriaType: "lessons_completed",
    criteriaValue: 1,
    difficulty: null,
    xpBonus: 10,
  },
  {
    name: "Quiz Champion",
    description: "Pass 3 quizzes",
    icon: "quiz",
    color: "#66BB6A",
    criteriaType: "quizzes_passed",
    criteriaValue: 3,
    difficulty: "medium",
    xpBonus: 20,
  },
  {
    name: "XP Collector",
    description: "Earn 100 XP",
    icon: "star",
    color: "#FFA726",
    criteriaType: "xp",
    criteriaValue: 100,
    difficulty: null,
    xpBonus: 15,
  },
  {
    name: "Rising Star",
    description: "Reach 500 XP",
    icon: "auto_awesome",
    color: "#AB47BC",
    criteriaType: "xp",
    criteriaValue: 500,
    difficulty: null,
    xpBonus: 50,
  },
  {
    name: "Streak Starter",
    description: "Learn 3 days in a row",
    icon: "local_fire_department",
    color: "#EF4444",
    criteriaType: "streak",
    criteriaValue: 3,
    difficulty: null,
    xpBonus: 15,
  },
];

const DEFAULT_STUDENT_MEDALS = [
  {
    name: "Bronze Climber",
    description: "Reach level 5",
    tier: "bronze",
    icon: "military_tech",
    criteriaType: "level",
    criteriaValue: 5,
  },
  {
    name: "Silver Scholar",
    description: "Reach level 8",
    tier: "silver",
    icon: "military_tech",
    criteriaType: "level",
    criteriaValue: 8,
  },
  {
    name: "Perfect Score",
    description: "Get a perfect quiz score",
    tier: "gold",
    icon: "workspace_premium",
    criteriaType: "perfect_quiz",
    criteriaValue: 1,
  },
  {
    name: "Top Contender",
    description: "Reach top 3 on the leaderboard",
    tier: "platinum",
    icon: "emoji_events",
    criteriaType: "leaderboard_rank",
    criteriaValue: 3,
  },
  {
    name: "Diamond Achiever",
    description: "Reach level 10",
    tier: "diamond",
    icon: "diamond",
    criteriaType: "level",
    criteriaValue: 10,
  },
  {
    name: "Legendary Learner",
    description: "Reach level 20",
    tier: "legendary",
    icon: "workspace_premium",
    criteriaType: "level",
    criteriaValue: 20,
  },
  {
    name: "Campus Champion",
    description: "Reach #1 on the leaderboard",
    tier: "legendary",
    icon: "emoji_events",
    criteriaType: "leaderboard_rank",
    criteriaValue: 1,
  },
  {
    name: "XP Titan",
    description: "Earn 1,000 XP — a major mastery milestone",
    tier: "gold",
    icon: "star",
    criteriaType: "xp",
    criteriaValue: 1000,
  },
  {
    name: "Unstoppable Streak",
    description: "Learn 14 days in a row",
    tier: "platinum",
    icon: "local_fire_department",
    criteriaType: "streak",
    criteriaValue: 14,
  },
  {
    name: "Quiz Master",
    description: "Pass 10 quizzes",
    tier: "gold",
    icon: "quiz",
    criteriaType: "quizzes_passed",
    criteriaValue: 10,
  },
  {
    name: "Lesson Legend",
    description: "Complete 15 lessons",
    tier: "platinum",
    icon: "school",
    criteriaType: "lessons_completed",
    criteriaValue: 15,
  },
  {
    name: "Game Veteran",
    description: "Complete 10 educational games",
    tier: "diamond",
    icon: "sports_esports",
    criteriaType: "games_completed",
    criteriaValue: 10,
  },
];

async function ensureStudentAchievementCatalog() {
  const [badges, medals] = await Promise.all([
    GamificationModel.findAllBadges({ activeOnly: false }),
    GamificationModel.findAllMedals({ activeOnly: false }),
  ]);
  const badgeNames = new Set(
    badges.map((row) => String(row.name).toLowerCase()),
  );
  const medalNames = new Set(
    medals.map((row) => String(row.name).toLowerCase()),
  );

  for (const badge of DEFAULT_STUDENT_BADGES) {
    if (badgeNames.has(badge.name.toLowerCase())) continue;
    await GamificationModel.createBadge({
      ...badge,
      isActive: true,
      createdBy: null,
      ownerKey: 0,
    });
  }

  for (const medal of DEFAULT_STUDENT_MEDALS) {
    if (medalNames.has(medal.name.toLowerCase())) continue;
    await GamificationModel.createMedal({
      ...medal,
      isActive: true,
    });
  }
}

const GamificationService = {
  async awardXp({
    studentId,
    amount,
    sourceType,
    sourceId = null,
    description,
  }) {
    if (amount <= 0) {
      throw new AppError("XP amount must be greater than zero", 400);
    }

    const previous = await StudentProfileModel.findByUserId(studentId);
    if (!previous) {
      throw new AppError("Student profile not found", 404);
    }

    const updated = await StudentProfileModel.addXp(studentId, amount);
    await GamificationModel.addXpTransaction({
      studentId,
      amount,
      sourceType,
      sourceId,
      description,
    });

    // Streak first so streak badges unlock on the same activity.
    await StreakService.recordActivity(studentId);
    const newlyUnlocked = await this.evaluateAchievements(studentId);

    if (updated.level > previous.level) {
      await NotificationModel.create({
        userId: studentId,
        title: "Level Up!",
        message: `Congratulations! You reached level ${updated.level}.`,
        type: "achievement",
        link: "/student/achievements",
      });
    }

    return {
      profile: {
        ...updated,
        level: calculateLevel(updated.xp),
        xpToNextLevel: xpForNextLevel(updated.xp),
        xpInLevel: xpProgressInLevel(updated.xp),
      },
      newlyUnlocked,
    };
  },

  /**
   * Award XP at most once per (student, sourceType, sourceId).
   * Inserts the XP ledger row first (unique constraint) so parallel
   * requests cannot double-credit profile XP.
   */
  async awardXpOnce({
    studentId,
    amount,
    sourceType,
    sourceId,
    description,
    evaluateAchievements = true,
  }) {
    if (amount <= 0) {
      throw new AppError("XP amount must be greater than zero", 400);
    }
    if (sourceId == null) {
      throw new AppError("sourceId is required for one-time XP awards", 400);
    }

    const existing = await GamificationModel.findXpTransaction(
      studentId,
      sourceType,
      sourceId,
    );
    if (existing) {
      return {
        alreadyAwarded: true,
        xpAward: null,
        transaction: existing,
      };
    }

    const previous = await StudentProfileModel.findByUserId(studentId);
    if (!previous) {
      throw new AppError("Student profile not found", 404);
    }

    try {
      await GamificationModel.addXpTransaction({
        studentId,
        amount,
        sourceType,
        sourceId,
        description,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const transaction = await GamificationModel.findXpTransaction(
          studentId,
          sourceType,
          sourceId,
        );
        return {
          alreadyAwarded: true,
          xpAward: null,
          transaction,
        };
      }
      throw error;
    }

    const updated = await StudentProfileModel.addXp(studentId, amount);
    // Streak before evaluate so streak criteria see today's activity.
    await StreakService.recordActivity(studentId);
    const newlyUnlocked = evaluateAchievements
      ? await this.evaluateAchievements(studentId)
      : { badges: [], medals: [] };

    if (updated.level > previous.level) {
      await NotificationModel.create({
        userId: studentId,
        title: "Level Up!",
        message: `Congratulations! You reached level ${updated.level}.`,
        type: "achievement",
        link: "/student/achievements",
      });
    }

    return {
      alreadyAwarded: false,
      xpAward: {
        profile: {
          ...updated,
          level: calculateLevel(updated.xp),
          xpToNextLevel: xpForNextLevel(updated.xp),
          xpInLevel: xpProgressInLevel(updated.xp),
        },
        newlyUnlocked,
      },
      transaction: null,
    };
  },

  async evaluateAchievements(studentId) {
    let profile = await StudentProfileModel.findByUserId(studentId);
    const badges = await GamificationModel.findAllBadges({
      activeOnly: true,
      unlockableOnly: true,
    });
    const medals = await GamificationModel.findAllMedals({
      activeOnly: true,
      unlockableOnly: true,
    });
    const ownedBadges = await GamificationModel.getStudentBadges(studentId);
    const ownedMedals = await GamificationModel.getStudentMedals(studentId);
    const ownedBadgeIds = new Set(
      ownedBadges.map((item) => Number(item.badge_id)),
    );
    const ownedMedalIds = new Set(
      ownedMedals.map((item) => Number(item.medal_id)),
    );

    const lessonsCompleted =
      await GamificationModel.countCompletedLessons(studentId);
    const quizzesPassed = await QuizModel.countPassedQuizzes(studentId);
    const gamesCompleted =
      await GamificationModel.countCompletedGames(studentId);
    const perfectQuizzes = await QuizModel.countPerfectQuizzes(studentId);
    const unlocked = { badges: [], medals: [] };

    for (const badge of badges) {
      if (
        ownedBadgeIds.has(Number(badge.id)) ||
        badge.criteria_type === "manual"
      ) {
        continue;
      }

      let qualifies = false;
      if (
        badge.criteria_type === "xp" &&
        Number(profile.xp) >= Number(badge.criteria_value)
      )
        qualifies = true;
      if (
        badge.criteria_type === "lessons_completed" &&
        lessonsCompleted >= badge.criteria_value
      )
        qualifies = true;
      if (
        badge.criteria_type === "quizzes_passed" &&
        quizzesPassed >= badge.criteria_value
      )
        qualifies = true;
      if (
        badge.criteria_type === "games_completed" &&
        gamesCompleted >= badge.criteria_value
      )
        qualifies = true;
      if (
        badge.criteria_type === "streak" &&
        Number(profile.current_streak || 0) >= Number(badge.criteria_value)
      )
        qualifies = true;
      if (
        badge.criteria_type === "level" &&
        Number(profile.level) >= Number(badge.criteria_value)
      )
        qualifies = true;
      if (
        badge.criteria_type === "perfect_quiz" &&
        perfectQuizzes >= Number(badge.criteria_value || 1)
      )
        qualifies = true;
      if (badge.criteria_type === "leaderboard_rank") {
        const rank = await StudentProfileModel.getStudentRank(studentId);
        if (rank && rank <= badge.criteria_value) qualifies = true;
      }

      if (qualifies) {
        const awarded = await GamificationModel.awardBadge({
          studentId,
          badgeId: badge.id,
        });
        unlocked.badges.push(awarded);
        ownedBadgeIds.add(Number(badge.id));

        if (Number(badge.xp_bonus) > 0) {
          profile = await StudentProfileModel.addXp(
            studentId,
            Number(badge.xp_bonus),
          );
          await GamificationModel.addXpTransaction({
            studentId,
            amount: Number(badge.xp_bonus),
            sourceType: "badge",
            sourceId: badge.id,
            description: `Bonus XP for badge: ${badge.name}`,
          });
        }

        await NotificationModel.create({
          userId: studentId,
          title: "New Badge Unlocked!",
          message: `You earned the "${badge.name}" badge.`,
          type: "achievement",
          link: "/student/achievements",
        });
      }
    }

    // Refresh after badge XP bonuses so level medals reflect the new total.
    profile = await StudentProfileModel.findByUserId(studentId);

    for (const medal of medals) {
      if (
        ownedMedalIds.has(Number(medal.id)) ||
        medal.criteria_type === "manual" ||
        medal.criteria_type === "perfect_quiz"
      ) {
        continue;
      }

      let qualifies = false;
      if (
        medal.criteria_type === "level" &&
        Number(profile.level) >= Number(medal.criteria_value)
      )
        qualifies = true;

      if (medal.criteria_type === "leaderboard_rank") {
        const rank = await StudentProfileModel.getStudentRank(studentId);
        if (rank && rank <= medal.criteria_value) qualifies = true;
      }
      if (
        medal.criteria_type === "xp" &&
        Number(profile.xp) >= Number(medal.criteria_value)
      )
        qualifies = true;
      if (
        medal.criteria_type === "streak" &&
        Number(profile.current_streak || 0) >= Number(medal.criteria_value)
      )
        qualifies = true;
      if (
        medal.criteria_type === "lessons_completed" &&
        lessonsCompleted >= medal.criteria_value
      )
        qualifies = true;
      if (
        medal.criteria_type === "quizzes_passed" &&
        quizzesPassed >= medal.criteria_value
      )
        qualifies = true;
      if (
        medal.criteria_type === "games_completed" &&
        gamesCompleted >= medal.criteria_value
      )
        qualifies = true;

      if (qualifies) {
        const awarded = await GamificationModel.awardMedal({
          studentId,
          medalId: medal.id,
        });
        if (!awarded?.isNew) continue;
        unlocked.medals.push(awarded);
        ownedMedalIds.add(Number(medal.id));
        await NotificationModel.create({
          userId: studentId,
          title: "New Medal Earned!",
          message: `You earned the "${medal.name}" medal.`,
          type: "achievement",
          link: "/student/achievements",
        });
      }
    }

    return unlocked;
  },

  async getStudentGamification(studentId) {
    const profile = await StudentProfileModel.findByUserId(studentId);
    if (!profile) {
      throw new AppError("Student profile not found", 404);
    }

    await ensureStudentAchievementCatalog();
    // Catch up any unlockables already earned (e.g. badges added after progress,
    // or activity that previously skipped evaluation).
    await this.evaluateAchievements(studentId);

    const refreshedProfile =
      (await StudentProfileModel.findByUserId(studentId)) || profile;

    const [
      badges,
      medals,
      xpHistory,
      rank,
      allBadges,
      allMedals,
      lessonsCompleted,
      quizzesPassed,
      gamesCompleted,
      perfectQuizzes,
    ] = await Promise.all([
      GamificationModel.getStudentBadges(studentId),
      GamificationModel.getStudentMedals(studentId),
      GamificationModel.getXpHistory(studentId),
      StudentProfileModel.getStudentRank(studentId),
      GamificationModel.findAllBadges({
        unlockableOnly: true,
      }),
      GamificationModel.findAllMedals({ unlockableOnly: true }),
      GamificationModel.countCompletedLessons(studentId),
      QuizModel.countPassedQuizzes(studentId),
      GamificationModel.countCompletedGames(studentId),
      QuizModel.countPerfectQuizzes(studentId),
    ]);

    const level = calculateLevel(refreshedProfile.xp);
    const stats = {
      xp: Number(refreshedProfile.xp) || 0,
      streak: Number(refreshedProfile.current_streak) || 0,
      lessonsCompleted: Number(lessonsCompleted) || 0,
      quizzesPassed: Number(quizzesPassed) || 0,
      gamesCompleted: Number(gamesCompleted) || 0,
      perfectQuizzes: Number(perfectQuizzes) || 0,
      level,
      rank: rank || null,
    };

    return {
      profile: {
        ...refreshedProfile,
        level,
        xpToNextLevel: xpForNextLevel(refreshedProfile.xp),
        xpInLevel: xpProgressInLevel(refreshedProfile.xp),
        rank,
      },
      badges,
      medals,
      badgeCollection: buildBadgeCollection(allBadges, badges, stats),
      medalCollection: buildMedalCollection(allMedals, medals, stats),
      teacherAwardedBadges: buildTeacherAwardedBadges(badges),
      teacherAwardedMedals: buildTeacherAwardedMedals(medals),
      progressStats: {
        lessonsCompleted: stats.lessonsCompleted,
        quizzesPassed: stats.quizzesPassed,
      },
      xpHistory,
    };
  },

  async getLeaderboard(
    limit = 20,
    period = "overall",
    schoolYear = "all",
    rosterFilters = {},
  ) {
    const rows = await StudentProfileModel.getLeaderboard(
      limit,
      period,
      schoolYear,
      rosterFilters,
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      avatarUrl: row.avatar_url ? `/api/files/avatars/${row.user_id}` : null,
      xp: row.period_xp != null ? Number(row.period_xp) : row.xp,
      totalXp: row.xp,
      level: row.level,
      badgeCount: row.badge_count,
      period,
      schoolYear: schoolYear && schoolYear !== "all" ? schoolYear : "all",
    }));
  },

  async createBadge(data, actor = null) {
    const role = actor?.role;
    const name = String(data.name || "").trim();
    const description = String(data.description || "").trim();

    if (!name) throw new AppError("Badge name is required", 400);
    if (!description) throw new AppError("Badge description is required", 400);

    let payload;

    if (role === "teacher") {
      payload = {
        name,
        description,
        icon: data.icon || "emoji_events",
        color: data.color || "#FFB300",
        criteriaType: "manual",
        criteriaValue: 0,
        difficulty: null,
        xpBonus: 0,
        isActive: data.isActive === false ? false : true,
        createdBy: actor.id,
        ownerKey: actor.id,
      };
    } else if (role === "administrator") {
      const unlockableTypes = BADGE_UNLOCKABLE_TYPES;
      const criteriaType = data.criteriaType;
      if (!unlockableTypes.includes(criteriaType)) {
        throw new AppError(
          "Admin badges must use a supported unlockable criteria type",
          400,
        );
      }
      const criteriaValue =
        criteriaType === "perfect_quiz" && !Number(data.criteriaValue)
          ? 1
          : Number(data.criteriaValue);
      if (!Number.isFinite(criteriaValue) || criteriaValue < 1) {
        throw new AppError("Criteria value must be at least 1", 400);
      }
      const difficulty = resolveBadgeDifficulty(criteriaType, data.difficulty);
      payload = {
        name,
        description,
        icon: data.icon || "emoji_events",
        color: data.color || "#FFB300",
        criteriaType,
        criteriaValue,
        difficulty,
        xpBonus: Number(data.xpBonus) || 0,
        isActive: data.isActive === false ? false : true,
        createdBy: null,
        ownerKey: 0,
      };
    } else {
      throw new AppError("Not allowed to create badges", 403);
    }

    try {
      const badge = await GamificationModel.createBadge(payload);
      await ActivityLogService.log({
        actorId: actor?.id || null,
        action: "badge.created",
        entityType: "badge",
        entityId: badge.id,
        summary:
          role === "teacher"
            ? `Teacher created custom badge "${badge.name}"`
            : `Created unlockable badge "${badge.name}"`,
      });
      return badge;
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY" || Number(error?.errno) === 1062) {
        throw new AppError("A badge with this name already exists", 409);
      }
      throw error;
    }
  },

  async listBadges(actor = null) {
    if (actor?.role === "teacher") {
      return GamificationModel.findAllBadges({
        createdBy: actor.id,
        teacherOnly: true,
        activeOnly: true,
      });
    }
    if (actor?.role === "administrator") {
      return GamificationModel.findAllBadges({
        unlockableOnly: true,
        activeOnly: true,
      });
    }
    return GamificationModel.findAllBadges({
      unlockableOnly: true,
      activeOnly: true,
    });
  },

  async updateBadge(id, data, actor = null) {
    const badge = await GamificationModel.findBadgeById(id);
    if (!badge) throw new AppError("Badge not found", 404);
    if (!Number(badge.is_active)) {
      throw new AppError("This badge has been deleted", 404);
    }

    if (actor?.role === "teacher") {
      if (Number(badge.created_by) !== Number(actor.id)) {
        throw new AppError("You can only update your own custom badges", 403);
      }
      const updated = await GamificationModel.updateBadge(id, {
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        isActive: true,
        // Teachers cannot change award badges into unlockables
        criteriaType: "manual",
        criteriaValue: 0,
        xpBonus: 0,
      });
      await ActivityLogService.log({
        actorId: actor.id,
        action: "badge.updated",
        entityType: "badge",
        entityId: id,
        summary: `Teacher updated custom badge "${updated.name || badge.name}"`,
      });
      return updated;
    }

    if (actor?.role !== "administrator") {
      throw new AppError("Not allowed to update badges", 403);
    }

    if (badge.created_by != null || badge.criteria_type === "manual") {
      throw new AppError(
        "Teacher custom badges cannot be edited from admin unlockables",
        400,
      );
    }

    const unlockableTypes = BADGE_UNLOCKABLE_TYPES;
    if (
      data.criteriaType !== undefined &&
      !unlockableTypes.includes(data.criteriaType)
    ) {
      throw new AppError(
        "Admin badges must use an unlockable criteria type",
        400,
      );
    }

    const updatePayload = { ...data };
    const nextCriteriaType =
      data.criteriaType !== undefined ? data.criteriaType : badge.criteria_type;
    if (
      data.difficulty !== undefined ||
      data.criteriaType !== undefined
    ) {
      updatePayload.difficulty = resolveBadgeDifficulty(
        nextCriteriaType,
        data.difficulty !== undefined ? data.difficulty : badge.difficulty,
      );
    }
    if (nextCriteriaType === "perfect_quiz" && data.criteriaValue === undefined) {
      updatePayload.criteriaValue = badge.criteria_value || 1;
    }

    const updated = await GamificationModel.updateBadge(id, updatePayload);
    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "badge.updated",
      entityType: "badge",
      entityId: id,
      summary: `Updated unlockable badge "${updated.name || badge.name}"`,
    });
    return updated;
  },

  async deleteBadge(id, actor = null) {
    const badge = await GamificationModel.findBadgeById(id);
    if (!badge) throw new AppError("Badge not found", 404);
    if (!Number(badge.is_active)) {
      throw new AppError("This badge has already been deleted", 404);
    }

    if (actor?.role === "teacher") {
      if (Number(badge.created_by) !== Number(actor.id)) {
        throw new AppError("You can only delete your own custom badges", 403);
      }
      if (badge.criteria_type !== "manual") {
        throw new AppError("Only custom teacher badges can be deleted here", 400);
      }
    } else if (actor?.role === "administrator") {
      if (badge.created_by != null || badge.criteria_type === "manual") {
        throw new AppError(
          "Teacher custom badges cannot be deleted from admin unlockables",
          400,
        );
      }
    } else {
      throw new AppError("Not allowed to delete badges", 403);
    }

    const awardCount = await GamificationModel.countBadgeAwards(id);
    if (awardCount > 0) {
      // Soft-delete so awarded students keep the badge on their profile.
      await GamificationModel.softDeleteBadge(id);
      await ActivityLogService.log({
        actorId: actor?.id || null,
        action: "badge.deleted",
        entityType: "badge",
        entityId: id,
        summary: `Deleted badge "${badge.name}" (kept ${awardCount} student award${awardCount === 1 ? "" : "s"})`,
        metadata: { soft: true, awardCount },
      });
      return {
        id: Number(id),
        soft: true,
        preservedAwards: awardCount,
      };
    }

    await GamificationModel.hardDeleteBadge(id);
    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "badge.deleted",
      entityType: "badge",
      entityId: id,
      summary: `Permanently deleted badge "${badge.name}"`,
      metadata: { soft: false, awardCount: 0 },
    });
    return {
      id: Number(id),
      soft: false,
      preservedAwards: 0,
    };
  },

  async awardBadgeManually({ studentId, badgeId, awardedBy, actorRole }) {
    const badge = await GamificationModel.findBadgeById(badgeId);
    if (!badge) throw new AppError("Badge not found", 404);

    if (badge.criteria_type !== "manual") {
      throw new AppError("Only custom teacher badges can be awarded manually", 400);
    }

    if (actorRole === "teacher") {
      if (Number(badge.created_by) !== Number(awardedBy)) {
        throw new AppError("You can only award badges you created", 403);
      }
    } else if (actorRole === "administrator") {
      // Admins may award legacy manual badges or any teacher custom badge.
    } else {
      throw new AppError("Not allowed to award badges", 403);
    }

    if (!Number(badge.is_active)) {
      throw new AppError("This badge is inactive", 400);
    }

    const awarded = await GamificationModel.awardBadge({
      studentId,
      badgeId,
      awardedBy,
    });
    await NotificationModel.create({
      userId: studentId,
      title: "Badge Awarded",
      message: `You were awarded the "${badge.name}" badge.`,
      type: "achievement",
      link: "/student/achievements",
    });
    await ActivityLogService.log({
      actorId: awardedBy || null,
      action: "badge.awarded",
      entityType: "badge",
      entityId: badgeId,
      summary: `Awarded badge "${badge.name}" to student #${studentId}`,
      metadata: { studentId },
    });
    return awarded;
  },

  async createMedal(data, actor = null) {
    const name = String(data.name || "").trim();
    const description = String(data.description || "").trim();
    if (!name) throw new AppError("Medal name is required", 400);
    if (!description) throw new AppError("Medal description is required", 400);

    const unlockableTypes = MEDAL_UNLOCKABLE_TYPES;
    const criteriaType = data.criteriaType;
    if (!unlockableTypes.includes(criteriaType)) {
      throw new AppError(
        "Medals must use a major achievement criteria",
        400,
      );
    }

    const criteriaValue = assertMedalCriteriaValue(
      criteriaType,
      data.criteriaValue,
    );

    const tiers = [
      "bronze",
      "silver",
      "gold",
      "platinum",
      "diamond",
      "legendary",
    ];
    const tier = String(data.tier || "bronze").toLowerCase();
    if (!tiers.includes(tier)) {
      throw new AppError("Invalid medal tier", 400);
    }

    try {
      const medal = await GamificationModel.createMedal({
        name,
        description,
        tier,
        icon: data.icon || "military_tech",
        criteriaType,
        criteriaValue,
        isActive: data.isActive === false ? false : true,
      });
      await ActivityLogService.log({
        actorId: actor?.id || null,
        action: "medal.created",
        entityType: "medal",
        entityId: medal.id,
        summary: `Created medal "${medal.name}"`,
      });
      return medal;
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY" || Number(error?.errno) === 1062) {
        throw new AppError("A medal with this name already exists", 409);
      }
      throw error;
    }
  },

  async listMedals(actor = null) {
    if (actor?.role === "administrator") {
      return GamificationModel.findAllMedals({
        unlockableOnly: true,
        activeOnly: true,
      });
    }
    return GamificationModel.findAllMedals({
      unlockableOnly: true,
      activeOnly: true,
    });
  },

  async updateMedal(id, data, actor = null) {
    if (actor?.role !== "administrator") {
      throw new AppError("Not allowed to update medals", 403);
    }

    const medal = await GamificationModel.findMedalById(id);
    if (!medal) throw new AppError("Medal not found", 404);
    if (!Number(medal.is_active)) {
      throw new AppError("This medal has been deleted", 404);
    }
    if (medal.criteria_type === "manual") {
      throw new AppError("Manual medals cannot be edited here", 400);
    }

    const unlockableTypes = MEDAL_UNLOCKABLE_TYPES;
    if (
      data.criteriaType !== undefined &&
      !unlockableTypes.includes(data.criteriaType)
    ) {
      throw new AppError(
        "Medals must use a major achievement criteria",
        400,
      );
    }

    const updatePayload = { ...data };
    const nextCriteriaType = data.criteriaType ?? medal.criteria_type;
    if (
      data.criteriaType !== undefined ||
      data.criteriaValue !== undefined
    ) {
      updatePayload.criteriaValue = assertMedalCriteriaValue(
        nextCriteriaType,
        data.criteriaValue !== undefined
          ? data.criteriaValue
          : medal.criteria_value,
      );
    }
    if (data.tier !== undefined) {
      const tier = String(data.tier).toLowerCase();
      const tiers = [
        "bronze",
        "silver",
        "gold",
        "platinum",
        "diamond",
        "legendary",
      ];
      if (!tiers.includes(tier)) {
        throw new AppError("Invalid medal tier", 400);
      }
      updatePayload.tier = tier;
    }

    const updated = await GamificationModel.updateMedal(id, updatePayload);
    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "medal.updated",
      entityType: "medal",
      entityId: id,
      summary: `Updated medal "${updated.name || medal.name}"`,
    });
    return updated;
  },

  async deleteMedal(id, actor = null) {
    if (actor?.role !== "administrator") {
      throw new AppError("Not allowed to delete medals", 403);
    }

    const medal = await GamificationModel.findMedalById(id);
    if (!medal) throw new AppError("Medal not found", 404);
    if (!Number(medal.is_active)) {
      throw new AppError("This medal has already been deleted", 404);
    }
    if (medal.criteria_type === "manual") {
      throw new AppError("Manual medals cannot be deleted here", 400);
    }

    const awardCount = await GamificationModel.countMedalAwards(id);
    if (awardCount > 0) {
      await GamificationModel.softDeleteMedal(id);
      await ActivityLogService.log({
        actorId: actor?.id || null,
        action: "medal.deleted",
        entityType: "medal",
        entityId: id,
        summary: `Deleted medal "${medal.name}" (kept ${awardCount} student award${awardCount === 1 ? "" : "s"})`,
        metadata: { soft: true, awardCount },
      });
      return { id: Number(id), soft: true, preservedAwards: awardCount };
    }

    await GamificationModel.hardDeleteMedal(id);
    await ActivityLogService.log({
      actorId: actor?.id || null,
      action: "medal.deleted",
      entityType: "medal",
      entityId: id,
      summary: `Permanently deleted medal "${medal.name}"`,
      metadata: { soft: false, awardCount: 0 },
    });
    return { id: Number(id), soft: false, preservedAwards: 0 };
  },

  async awardMedalManually({ studentId, medalId, awardedBy }) {
    const medal = await GamificationModel.findMedalById(medalId);
    if (!medal) throw new AppError("Medal not found", 404);

    const awarded = await GamificationModel.awardMedal({
      studentId,
      medalId,
      awardedBy,
    });
    if (!awarded?.isNew) {
      return { ...awarded, alreadyOwned: true };
    }

    const isSystemUnlock = medal.criteria_type !== "manual" && !awardedBy;
    await NotificationModel.create({
      userId: studentId,
      title: isSystemUnlock ? "New Medal Earned!" : "Medal Awarded",
      message: isSystemUnlock
        ? `You earned the "${medal.name}" medal.`
        : `You were awarded the "${medal.name}" medal.`,
      type: "achievement",
      link: "/student/achievements",
    });
    return { ...awarded, alreadyOwned: false };
  },
};

export default GamificationService;
