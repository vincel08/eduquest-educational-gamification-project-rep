import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import QuizIcon from "@mui/icons-material/Quiz";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import FlagIcon from "@mui/icons-material/Flag";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import GlassStatCard from "../../components/common/GlassStatCard";
import QuestCard from "../../components/common/QuestCard";
import EmptyState from "../../components/common/EmptyState";
import SectionHeader from "../../components/common/SectionHeader";
import PageContainer from "../../components/common/PageContainer";
import LeaderboardCard from "../../components/gamification/LeaderboardCard";
import LoadingScreen from "../../components/common/LoadingScreen";
import analyticsService from "../../services/analyticsService";
import gamificationService from "../../services/gamificationService";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { buildAuthenticatedFileUrl } from "../../utils/fileUrls";

const DAILY_XP_GOAL = 50;

export default function StudentDashboard() {
  const { user, profile: authProfile, updateProfile } = useAuth();
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [analyticsRes, gamificationRes, leaderboardRes, coursesRes] =
          await Promise.all([
            analyticsService.student(),
            gamificationService.me(),
            gamificationService.leaderboard({ limit: 3 }),
            courseService.myCourses(),
          ]);
        setData({
          analytics: analyticsRes.data.data,
          gamification: gamificationRes.data.data,
        });
        updateProfile(gamificationRes.data.data.profile);
        setLeaderboard(leaderboardRes.data.data);
        setCourses(coursesRes.data.data?.courses || coursesRes.data.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [updateProfile]);

  const todayXp = useMemo(() => {
    if (!data?.analytics?.xpTrend?.length) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const match = data.analytics.xpTrend.find(
      (item) =>
        String(item.day).startsWith(today) ||
        String(item.day).slice(0, 10) === today,
    );
    if (match) return Number(match.xp) || 0;
    const last = data.analytics.xpTrend[data.analytics.xpTrend.length - 1];
    return Number(last?.xp) || 0;
  }, [data]);

  if (loading) return <LoadingScreen label="Loading your quest..." showCards />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const profile = data.gamification.profile;
  const analytics = data.analytics;
  const rank = data.gamification.profile?.rank;
  const courseList = Array.isArray(courses) ? courses : [];
  const recommended = courseList
    .filter((course) => Number(course.progress_percent || 0) < 100)
    .slice(0, 2);
  const upcomingQuiz = (analytics.upcomingQuizzes || [])[0] || null;
  const quickStart = analytics.quickStart || null;
  const quickStartTo = quickStart?.path || "/student/courses";
  const quickStartLabel = quickStart?.label || "Quick Start";
  const dailyProgress = Math.min(
    100,
    Math.round((todayXp / DAILY_XP_GOAL) * 100),
  );
  const overallPercent = analytics.learningProgress?.overallPercent ?? null;
  const avatarSrc = buildAuthenticatedFileUrl(
    authProfile?.avatar_url || profile.avatar_url,
  );
  const badgeCount = analytics.badges || 0;
  const medalCount = analytics.medals || 0;

  return (
    <PageContainer>
      <Stack
        className="page-hero"
        component={motion.div}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        sx={{ mb: 3 }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Avatar
            src={avatarSrc || undefined}
            alt={user?.firstName || "Student"}
            sx={{
              width: { xs: 64, md: 76 },
              height: { xs: 64, md: 76 },
              border: "3px solid rgba(255,255,255,0.65)",
              bgcolor: "secondary.main",
              fontWeight: 800,
              fontSize: "1.5rem",
            }}
          >
            {(user?.firstName || "S").charAt(0)}
          </Avatar>
          <Box>
            <Chip
              icon={<LocalFireDepartmentIcon />}
              label={`${profile.current_streak || 0}-day streak`}
              sx={{
                mb: 1,
                bgcolor: "rgba(250,204,21,0.95)",
                color: "#1E293B",
                fontWeight: 800,
              }}
            />
            <Typography
              variant="h4"
              sx={{ color: "#fff", fontWeight: 800, mb: 0.5 }}
            >
              Welcome back, {user?.firstName}!
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.92)", maxWidth: 520 }}>
              {quickStart?.title
                ? `${quickStartLabel}: ${quickStart.title}`
                : "Ready for today's quest? Pick up where you left off."}
            </Typography>
          </Box>
        </Stack>
        <Stack
          spacing={1}
          alignItems={{ xs: "stretch", md: "flex-end" }}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Button
            component={RouterLink}
            to={quickStartTo}
            variant="contained"
            size="large"
            startIcon={<RocketLaunchIcon />}
            sx={{
              bgcolor: "#FACC15",
              color: "#1E293B",
              "&:hover": { bgcolor: "#FDE047" },
            }}
          >
            {quickStartLabel}
          </Button>
          <Button
            component={RouterLink}
            to="/student/games"
            size="small"
            startIcon={<SportsEsportsIcon />}
            sx={{ color: "rgba(255,255,255,0.92)" }}
          >
            Play a Game
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <GlassStatCard
            accent
            label="Total XP"
            value={profile.xp}
            icon={<StarIcon />}
            subtitle={`+${todayXp} today`}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <GlassStatCard
            label="Level"
            value={profile.level || 1}
            icon={<TrendingUpIcon />}
            subtitle="Keep climbing"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <GlassStatCard
            label="Streak"
            value={`${profile.current_streak || 0}d`}
            icon={<LocalFireDepartmentIcon />}
            subtitle={`Best ${profile.longest_streak || 0}d`}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <GlassStatCard
            label="Rank"
            value={rank ? `#${rank}` : "—"}
            icon={<LeaderboardIcon />}
            subtitle="On the board"
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          p: { xs: 1.75, md: 2 },
          mb: 2,
          background:
            "linear-gradient(160deg, rgba(250,204,21,0.14), rgba(99,102,241,0.06))",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <FlagIcon sx={{ color: "#F59E0B" }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800}>
                Daily goal · {todayXp} / {DAILY_XP_GOAL} XP
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dailyProgress >= 100
                  ? "Daily challenge complete!"
                  : `${dailyProgress}% toward today's XP goal`}
              </Typography>
            </Box>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 220 } }}
          >
            <Box sx={{ flex: 1, minWidth: 140 }}>
              <LinearProgress
                variant="determinate"
                value={dailyProgress}
                sx={{ height: 8, borderRadius: 999 }}
              />
            </Box>
            <Button
              component={RouterLink}
              to="/student/achievements"
              size="small"
              startIcon={<EmojiEventsIcon />}
            >
              {badgeCount + medalCount
                ? `${badgeCount} badges · ${medalCount} medals`
                : "Trophy Room"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
            <SectionHeader
              title="Continue Learning"
              subtitle={
                overallPercent != null
                  ? `Overall lesson progress ${overallPercent}%`
                  : "Pick up where you left off"
              }
              actionLabel="All subjects"
              actionTo="/student/courses"
              icon={<MenuBookIcon color="secondary" />}
            />
            {recommended.length ? (
              <Stack spacing={1.5}>
                {recommended.map((course) => (
                  <Paper key={course.id} variant="outlined" sx={{ p: 1.75 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      alignItems={{ sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography fontWeight={800} noWrap>
                          {course.subject || course.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {Number(course.progress_percent || 0)}% lessons complete
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Number(course.progress_percent || 0)}
                        />
                      </Box>
                      <Button
                        component={RouterLink}
                        to={`/student/courses/${course.id}`}
                        variant="contained"
                        size="small"
                      >
                        Continue
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <EmptyState
                icon={<MenuBookIcon sx={{ fontSize: 36 }} />}
                title="No subjects in progress"
                description="Enroll in a subject to get started."
                actionLabel="Find a subject"
                to="/student/courses"
                color="#8B5CF6"
              />
            )}
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
            <SectionHeader
              title="Up Next"
              subtitle="One challenge ready when you are"
              actionLabel="All quizzes"
              actionTo="/student/quizzes"
              icon={<QuizIcon color="primary" />}
            />
            {upcomingQuiz ? (
              <QuestCard
                title={upcomingQuiz.title}
                description={upcomingQuiz.course_title}
                icon={<QuizIcon />}
                accent="purple"
                xpReward={upcomingQuiz.xp_reward || 50}
                difficulty="Challenge"
                status="Ready"
                statusColor="success"
                to={`/student/quizzes/${upcomingQuiz.id}`}
                actionLabel="Start Quiz"
              />
            ) : (
              <EmptyState
                icon={<QuizIcon sx={{ fontSize: 36 }} />}
                title="No quizzes waiting"
                description="Explore your subjects to unlock new quiz challenges."
                actionLabel="Browse subjects"
                to="/student/courses"
              />
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ mb: 2 }}>
            <SectionHeader
              title="Top Climbers"
              subtitle="See who is leading the board"
              actionLabel="Full board"
              actionTo="/student/leaderboard"
              icon={<LeaderboardIcon color="secondary" />}
            />
            <LeaderboardCard entries={leaderboard.slice(0, 3)} title="" />
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
