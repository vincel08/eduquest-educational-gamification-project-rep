import GamificationModel from '../models/GamificationModel.js';
import StudentProfileModel from '../models/StudentProfileModel.js';
import QuizModel from '../models/QuizModel.js';
import NotificationModel from '../models/NotificationModel.js';
import StreakService from './StreakService.js';
import AppError from '../utils/AppError.js';
import { generateCertificateCode } from '../utils/generateCode.js';
import { calculateLevel, xpForNextLevel, xpProgressInLevel } from '../utils/levelCalculator.js';

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
      avatarUrl: row.avatar_url,
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
    await NotificationModel.create({
      userId: studentId,
      title: 'Medal Awarded',
      message: `You were awarded the "${medal.name}" medal.`,
      type: 'achievement',
      link: '/student/achievements',
    });
    return awarded;
  },

  async createCertificate(data) {
    return GamificationModel.createCertificate(data);
  },

  async listCertificates() {
    return GamificationModel.findAllCertificates();
  },

  async updateCertificate(id, data) {
    const certificate = await GamificationModel.findCertificateById(id);
    if (!certificate) throw new AppError('Certificate not found', 404);
    return GamificationModel.updateCertificate(id, data);
  },

  async issueCertificate({ certificateId, studentId, issuedBy = null }) {
    const certificate = await GamificationModel.findCertificateById(certificateId);
    if (!certificate || !certificate.is_active) {
      throw new AppError('Certificate not found or inactive', 404);
    }

    const existing = await GamificationModel.findStudentCertificate(certificateId, studentId);
    if (existing) {
      return existing;
    }

    const issued = await GamificationModel.issueCertificate({
      certificateId,
      studentId,
      certificateCode: generateCertificateCode(),
      issuedBy,
    });

    await NotificationModel.create({
      userId: studentId,
      title: 'Certificate Issued',
      message: `You received the certificate "${certificate.title}".`,
      type: 'achievement',
      link: '/student/certificates',
    });

    return issued;
  },

  async autoIssueCourseCertificate({ courseId, studentId }) {
    const certificates = await GamificationModel.findAllCertificates();
    const courseCert = certificates.find(
      (item) => Number(item.course_id) === Number(courseId) && item.is_active
    );
    if (!courseCert) return null;

    return this.issueCertificate({
      certificateId: courseCert.id,
      studentId,
      issuedBy: null,
    });
  },

  async getStudentCertificates(studentId) {
    return GamificationModel.getStudentCertificates(studentId);
  },

  async getCertificateById(id) {
    const certificate = await GamificationModel.findStudentCertificateById(id);
    if (!certificate) throw new AppError('Certificate not found', 404);
    return certificate;
  },
};

export default GamificationService;
