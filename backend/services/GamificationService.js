import GamificationModel from '../models/GamificationModel.js';
import StudentProfileModel from '../models/StudentProfileModel.js';
import CourseModel from '../models/CourseModel.js';
import QuizModel from '../models/QuizModel.js';
import NotificationModel from '../models/NotificationModel.js';
import StreakService from './StreakService.js';
import CertificateEligibilityService from './CertificateEligibilityService.js';
import AppError from '../utils/AppError.js';
import { generateCertificateCode } from '../utils/generateCode.js';
import { calculateLevel, xpForNextLevel, xpProgressInLevel } from '../utils/levelCalculator.js';

function isDuplicateKeyError(error) {
  return error?.code === 'ER_DUP_ENTRY' || Number(error?.errno) === 1062;
}

const GamificationService = {
  async awardXp({ studentId, amount, sourceType, sourceId = null, description }) {
    if (amount <= 0) {
      throw new AppError('XP amount must be greater than zero', 400);
    }

    const previous = await StudentProfileModel.findByUserId(studentId);
    if (!previous) {
      throw new AppError('Student profile not found', 404);
    }

    const updated = await StudentProfileModel.addXp(studentId, amount);
    await GamificationModel.addXpTransaction({
      studentId,
      amount,
      sourceType,
      sourceId,
      description,
    });

    const newlyUnlocked = await this.evaluateAchievements(studentId);
    await StreakService.recordActivity(studentId);

    if (updated.level > previous.level) {
      await NotificationModel.create({
        userId: studentId,
        title: 'Level Up!',
        message: `Congratulations! You reached level ${updated.level}.`,
        type: 'achievement',
        link: '/student/achievements',
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
  async awardXpOnce({ studentId, amount, sourceType, sourceId, description }) {
    if (amount <= 0) {
      throw new AppError('XP amount must be greater than zero', 400);
    }
    if (sourceId == null) {
      throw new AppError('sourceId is required for one-time XP awards', 400);
    }

    const existing = await GamificationModel.findXpTransaction(studentId, sourceType, sourceId);
    if (existing) {
      return {
        alreadyAwarded: true,
        xpAward: null,
        transaction: existing,
      };
    }

    const previous = await StudentProfileModel.findByUserId(studentId);
    if (!previous) {
      throw new AppError('Student profile not found', 404);
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
          sourceId
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
    const newlyUnlocked = await this.evaluateAchievements(studentId);
    await StreakService.recordActivity(studentId);

    if (updated.level > previous.level) {
      await NotificationModel.create({
        userId: studentId,
        title: 'Level Up!',
        message: `Congratulations! You reached level ${updated.level}.`,
        type: 'achievement',
        link: '/student/achievements',
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
    const profile = await StudentProfileModel.findByUserId(studentId);
    const badges = await GamificationModel.findAllBadges({ activeOnly: true });
    const medals = await GamificationModel.findAllMedals({ activeOnly: true });
    const ownedBadges = await GamificationModel.getStudentBadges(studentId);
    const ownedMedals = await GamificationModel.getStudentMedals(studentId);
    const ownedBadgeIds = new Set(ownedBadges.map((item) => item.badge_id));
    const ownedMedalIds = new Set(ownedMedals.map((item) => item.medal_id));

    const lessonsCompleted = await GamificationModel.countCompletedLessons(studentId);
    const quizzesPassed = await QuizModel.countPassedQuizzes(studentId);
    const unlocked = { badges: [], medals: [] };

    for (const badge of badges) {
      if (ownedBadgeIds.has(badge.id) || badge.criteria_type === 'manual') {
        continue;
      }

      let qualifies = false;
      if (badge.criteria_type === 'xp' && profile.xp >= badge.criteria_value) qualifies = true;
      if (badge.criteria_type === 'lessons_completed' && lessonsCompleted >= badge.criteria_value) qualifies = true;
      if (badge.criteria_type === 'quizzes_passed' && quizzesPassed >= badge.criteria_value) qualifies = true;
      if (badge.criteria_type === 'streak' && Number(profile.current_streak || 0) >= badge.criteria_value) qualifies = true;

      if (qualifies) {
        const awarded = await GamificationModel.awardBadge({ studentId, badgeId: badge.id });
        unlocked.badges.push(awarded);

        if (badge.xp_bonus > 0) {
          await StudentProfileModel.addXp(studentId, badge.xp_bonus);
          await GamificationModel.addXpTransaction({
            studentId,
            amount: badge.xp_bonus,
            sourceType: 'badge',
            sourceId: badge.id,
            description: `Bonus XP for badge: ${badge.name}`,
          });
        }

        await NotificationModel.create({
          userId: studentId,
          title: 'New Badge Unlocked!',
          message: `You earned the "${badge.name}" badge.`,
          type: 'achievement',
          link: '/student/achievements',
        });
      }
    }

    for (const medal of medals) {
      if (ownedMedalIds.has(medal.id) || medal.criteria_type === 'manual') {
        continue;
      }

      let qualifies = false;
      if (medal.criteria_type === 'level' && profile.level >= medal.criteria_value) qualifies = true;

      if (medal.criteria_type === 'leaderboard_rank') {
        const rank = await StudentProfileModel.getStudentRank(studentId);
        if (rank && rank <= medal.criteria_value) qualifies = true;
      }

      if (qualifies) {
        const awarded = await GamificationModel.awardMedal({ studentId, medalId: medal.id });
        if (!awarded?.isNew) continue;
        unlocked.medals.push(awarded);
        await NotificationModel.create({
          userId: studentId,
          title: 'New Medal Earned!',
          message: `You earned the "${medal.name}" medal.`,
          type: 'achievement',
          link: '/student/achievements',
        });
      }
    }

    return unlocked;
  },

  async getStudentGamification(studentId) {
    const profile = await StudentProfileModel.findByUserId(studentId);
    if (!profile) {
      throw new AppError('Student profile not found', 404);
    }

    const [badges, medals, certificates, xpHistory, rank] = await Promise.all([
      GamificationModel.getStudentBadges(studentId),
      GamificationModel.getStudentMedals(studentId),
      GamificationModel.getStudentCertificates(studentId),
      GamificationModel.getXpHistory(studentId),
      StudentProfileModel.getStudentRank(studentId),
    ]);

    return {
      profile: {
        ...profile,
        level: calculateLevel(profile.xp),
        xpToNextLevel: xpForNextLevel(profile.xp),
        xpInLevel: xpProgressInLevel(profile.xp),
        rank,
      },
      badges,
      medals,
      certificates,
      xpHistory,
    };
  },

  async getLeaderboard(limit = 20, period = 'overall') {
    const rows = await StudentProfileModel.getLeaderboard(limit, period);
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
    }));
  },

  async createBadge(data) {
    return GamificationModel.createBadge(data);
  },

  async listBadges() {
    return GamificationModel.findAllBadges();
  },

  async updateBadge(id, data) {
    const badge = await GamificationModel.findBadgeById(id);
    if (!badge) throw new AppError('Badge not found', 404);
    return GamificationModel.updateBadge(id, data);
  },

  async awardBadgeManually({ studentId, badgeId, awardedBy }) {
    const badge = await GamificationModel.findBadgeById(badgeId);
    if (!badge) throw new AppError('Badge not found', 404);

    const awarded = await GamificationModel.awardBadge({ studentId, badgeId, awardedBy });
    await NotificationModel.create({
      userId: studentId,
      title: 'Badge Awarded',
      message: `You were awarded the "${badge.name}" badge.`,
      type: 'achievement',
      link: '/student/achievements',
    });
    return awarded;
  },

  async createMedal(data) {
    return GamificationModel.createMedal(data);
  },

  async listMedals() {
    return GamificationModel.findAllMedals();
  },

  async awardMedalManually({ studentId, medalId, awardedBy }) {
    const medal = await GamificationModel.findMedalById(medalId);
    if (!medal) throw new AppError('Medal not found', 404);

    const awarded = await GamificationModel.awardMedal({ studentId, medalId, awardedBy });
    if (!awarded?.isNew) {
      return { ...awarded, alreadyOwned: true };
    }

    await NotificationModel.create({
      userId: studentId,
      title: 'Medal Awarded',
      message: `You were awarded the "${medal.name}" medal.`,
      type: 'achievement',
      link: '/student/achievements',
    });
    return { ...awarded, alreadyOwned: false };
  },

  async createCertificate(data) {
    const courseId = Number(data.courseId);
    if (!Number.isInteger(courseId) || courseId < 1) {
      throw new AppError('Please select a course for this certificate template.', 400);
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    return GamificationModel.createCertificate({
      ...data,
      courseId,
    });
  },

  async listCertificates() {
    return GamificationModel.findAllCertificates();
  },

  async updateCertificate(id, data) {
    const certificate = await GamificationModel.findCertificateById(id);
    if (!certificate) throw new AppError('Certificate not found', 404);

    const updates = { ...data };
    if (Object.prototype.hasOwnProperty.call(data, 'courseId')) {
      if (data.courseId === null || data.courseId === '') {
        throw new AppError('Please select a course for this certificate template.', 400);
      }
      const courseId = Number(data.courseId);
      if (!Number.isInteger(courseId) || courseId < 1) {
        throw new AppError('Please select a course for this certificate template.', 400);
      }
      const course = await CourseModel.findById(courseId);
      if (!course) {
        throw new AppError('Course not found', 404);
      }
      updates.courseId = courseId;
    }

    return GamificationModel.updateCertificate(id, updates);
  },

  async getCourseCertificateEligibility(courseId, studentId) {
    return CertificateEligibilityService.evaluateCourseEligibility(courseId, studentId);
  },

  async issueCertificate({
    certificateId,
    studentId,
    issuedBy = null,
    actorRole = null,
    forceOverride = false,
    overrideReason = null,
  }) {
    const certificate = await GamificationModel.findCertificateById(certificateId);
    if (!certificate || !certificate.is_active) {
      throw new AppError('Certificate not found or inactive', 404);
    }

    if (!certificate.course_id) {
      throw new AppError('Certificate template must be linked to a course', 400);
    }

    const existingByTemplate = await GamificationModel.findStudentCertificate(
      certificateId,
      studentId
    );
    if (existingByTemplate) {
      return {
        ...await GamificationModel.findStudentCertificateById(existingByTemplate.id),
        alreadyIssued: true,
      };
    }

    const existingByCourse = await GamificationModel.findStudentCertificateByCourse(
      certificate.course_id,
      studentId
    );
    if (existingByCourse) {
      return { ...existingByCourse, alreadyIssued: true };
    }

    const eligibility = await CertificateEligibilityService.evaluateCourseEligibility(
      certificate.course_id,
      studentId
    );

    const wantsOverride = Boolean(forceOverride);
    if (wantsOverride) {
      if (actorRole !== 'administrator') {
        throw new AppError('Only administrators may override certificate eligibility', 403);
      }
      const reason = String(overrideReason || '').trim();
      if (reason.length < 5) {
        throw new AppError('overrideReason is required for administrative override (min 5 characters)', 400);
      }
    } else {
      CertificateEligibilityService.assertEligible(eligibility);
    }

    let issued;
    try {
      issued = await GamificationModel.issueCertificate({
        certificateId,
        studentId,
        certificateCode: generateCertificateCode(),
        issuedBy,
        isOverride: wantsOverride,
        issueReason: wantsOverride ? String(overrideReason).trim() : null,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const raced = await GamificationModel.findStudentCertificateByCourse(
          certificate.course_id,
          studentId
        );
        if (raced) return { ...raced, alreadyIssued: true };
      }
      throw error;
    }

    await CourseModel.updateProgress(certificate.course_id, studentId, 100);

    await NotificationModel.create({
      userId: studentId,
      title: 'Certificate Issued',
      message: `You received the certificate "${certificate.title}".`,
      type: 'achievement',
      link: '/student/certificates',
    });

    return {
      ...issued,
      alreadyIssued: false,
      eligibility,
      overridden: wantsOverride,
    };
  },

  async autoIssueCourseCertificate({ courseId, studentId }) {
    const courseCert = await GamificationModel.findActiveCertificateTemplateByCourse(courseId);
    if (!courseCert) return null;

    const eligibility = await CertificateEligibilityService.evaluateCourseEligibility(
      courseId,
      studentId
    );
    if (!eligibility.eligible) {
      return null;
    }

    return this.issueCertificate({
      certificateId: courseCert.id,
      studentId,
      issuedBy: null,
      actorRole: null,
      forceOverride: false,
    });
  },

  async getStudentCertificates(studentId) {
    return GamificationModel.getStudentCertificates(studentId);
  },

  async getCertificateById(id, actor) {
    const certificate = await GamificationModel.findStudentCertificateById(id);
    if (!certificate) throw new AppError('Certificate not found', 404);

    if (!actor) {
      throw new AppError('Unauthorized', 401);
    }

    if (actor.role === 'administrator') {
      return certificate;
    }

    if (actor.role === 'student') {
      if (Number(certificate.student_id) !== Number(actor.id)) {
        throw new AppError('Certificate not found', 404);
      }
      return certificate;
    }

    if (actor.role === 'teacher') {
      if (!certificate.course_id) {
        throw new AppError('Access denied', 403);
      }
      const course = await CourseModel.findById(certificate.course_id);
      if (!course || Number(course.teacher_id) !== Number(actor.id)) {
        throw new AppError('Access denied', 403);
      }
      return certificate;
    }

    throw new AppError('Access denied', 403);
  },
};

export default GamificationService;
