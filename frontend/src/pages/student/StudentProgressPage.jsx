import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import TimelineIcon from "@mui/icons-material/Timeline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import QuizIcon from "@mui/icons-material/Quiz";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import StarIcon from "@mui/icons-material/Star";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import FlagIcon from "@mui/icons-material/Flag";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SchoolIcon from "@mui/icons-material/School";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import { Link as RouterLink } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import EmptyState from "../../components/common/EmptyState";
import GlassStatCard from "../../components/common/GlassStatCard";
import SectionHeader from "../../components/common/SectionHeader";
import analyticsService from "../../services/analyticsService";
import gamificationService from "../../services/gamificationService";
import { getErrorMessage } from "../../services/api";
import { useRewards } from "../../contexts/RewardsContext";
import {
  DEFAULT_DAILY_XP_GOAL,
  getDailyXpGoalDisplay,
  localTodayKey,
  sumTodayXpFromTrend,
} from "../../utils/dailyXpGoal";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
);

const XP_PER_LEVEL = 100;

function formatChartDay(value) {
  const raw = String(value || "").trim();
  const isoDay = raw.slice(0, 10);
  const match = isoDay.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw || "—";
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (Number.isNaN(date.getTime())) return isoDay;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function xpProgressInLevel(xp) {
  return (Number(xp) || 0) % XP_PER_LEVEL;
}

function xpForNextLevel(xp) {
  const level = Math.max(1, Math.floor(Number(xp || 0) / XP_PER_LEVEL) + 1);
  return level * XP_PER_LEVEL;
}

export default function StudentProgressPage() {
  const theme = useTheme();
  const { todayXp, setTodayXpBaseline } = useRewards();
  const [analytics, setAnalytics] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [analyticsRes, gamificationRes] = await Promise.all([
          analyticsService.student(),
          gamificationService.me(),
        ]);
        if (!active) return;
        const nextAnalytics = analyticsRes.data.data;
        setAnalytics(nextAnalytics);
        setGamification(gamificationRes.data.data);
        setTodayXpBaseline(sumTodayXpFromTrend(nextAnalytics?.xpTrend));
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    function onFocus() {
      analyticsService
        .student()
        .then((response) => {
          if (!active) return;
          const nextAnalytics = response.data.data;
          setAnalytics(nextAnalytics);
          setTodayXpBaseline(sumTodayXpFromTrend(nextAnalytics?.xpTrend));
        })
        .catch(() => {});
    }

    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [setTodayXpBaseline]);

  const profile = gamification?.profile || null;
  const learning = analytics?.learningProgress || null;
  const subjects = useMemo(
    () => (Array.isArray(learning?.subjects) ? learning.subjects : []),
    [learning],
  );
  const upcomingQuizzes = useMemo(
    () =>
      Array.isArray(analytics?.upcomingQuizzes)
        ? analytics.upcomingQuizzes
        : [],
    [analytics],
  );

  const xpChart = useMemo(() => {
    const trend = Array.isArray(analytics?.xpTrend) ? [...analytics.xpTrend] : [];
    const lineColor = theme.palette.primary.main;
    const today = localTodayKey();
    const todayIndex = trend.findIndex(
      (item) => String(item?.day || "").slice(0, 10) === today,
    );
    if (todayIndex >= 0) {
      const serverToday = Number(trend[todayIndex].xp) || 0;
      trend[todayIndex] = {
        ...trend[todayIndex],
        xp: Math.max(serverToday, todayXp),
      };
    } else if (todayXp > 0) {
      trend.push({ day: today, xp: todayXp });
    }

    return {
      labels: trend.map((item) => formatChartDay(item.day)),
      datasets: [
        {
          label: "XP earned",
          data: trend.map((item) => Number(item.xp) || 0),
          borderColor: lineColor,
          backgroundColor: `${lineColor}33`,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    };
  }, [analytics, theme.palette.primary.main, todayXp]);

  if (loading) {
    return <LoadingScreen label="Loading progress..." showCards />;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const overallPercent = Number(learning?.overallPercent ?? 0);
  const completedLessons = Number(learning?.completed ?? 0);
  const totalLessons = Number(learning?.totalLessons ?? 0);
  const inProgressLessons = Number(learning?.inProgress ?? 0);
  const notStartedLessons = Number(learning?.notStarted ?? 0);
  const completedCourses = Number(analytics?.completedCourses || 0);
  const badgeCount = Number(
    analytics?.badges ?? gamification?.badges?.length ?? 0,
  );
  const medalCount = Number(
    analytics?.medals ?? gamification?.medals?.length ?? 0,
  );
  const rank = profile?.rank;
  const totalXp = Number(profile?.xp || 0);
  const level = Number(profile?.level || 1);
  const levelXp = xpProgressInLevel(totalXp);
  const nextLevelXp = xpForNextLevel(totalXp);
  const levelProgress = Math.round((levelXp / XP_PER_LEVEL) * 100);
  const dailyGoal = getDailyXpGoalDisplay(todayXp, DEFAULT_DAILY_XP_GOAL);
  const quickStart = analytics?.quickStart || null;
  const quizAttempts = Number(analytics?.quizAttempts || 0);
  const quizzesPassed = Number(analytics?.quizzesPassed || 0);
  const averageQuizScore = Number(analytics?.averageQuizScore || 0);
  const quizPassRate = quizAttempts
    ? Math.round((quizzesPassed / quizAttempts) * 100)
    : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Progress Tracking"
        subtitle="See how far you've come in lessons, quizzes, and XP."
        action={
          quickStart?.path ? (
            <Button
              component={RouterLink}
              to={quickStart.path}
              variant="contained"
              startIcon={<RocketLaunchIcon />}
              sx={{
                maxWidth: "100%",
                "& .MuiButton-startIcon": { flexShrink: 0 },
              }}
            >
              <Box
                component="span"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: { xs: "12rem", sm: "18rem", md: "none" },
                }}
              >
                {quickStart.label || "Continue"}
                {quickStart.title ? `: ${quickStart.title}` : ""}
              </Box>
            </Button>
          ) : null
        }
      />

      <Paper
        sx={{
          p: { xs: 1.75, md: 2.5 },
          mb: 3,
          background:
            "linear-gradient(160deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))",
          overflow: "hidden",
          maxWidth: "100%",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          sx={{ minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0, flex: 1, width: "100%" }}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={900} variant="h6">
                  All lessons
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {totalLessons
                    ? `You finished ${completedLessons} of ${totalLessons} lessons.`
                    : "Join a subject and finish lessons to see your progress here."}
                </Typography>
              </Box>
              <Typography
                variant="h4"
                fontWeight={900}
                color="primary.main"
                sx={{
                  flexShrink: 0,
                  fontSize: { xs: "1.75rem", md: "2.5rem" },
                  lineHeight: 1,
                  display: { xs: "block", md: "none" },
                }}
              >
                {overallPercent}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, overallPercent))}
              sx={{ height: 12, borderRadius: 999 }}
            />
            <Box
              sx={{
                mt: 1.25,
                display: "flex",
                flexWrap: "wrap",
                gap: 0.75,
                width: "100%",
                maxWidth: "100%",
              }}
            >
              <Chip
                size="small"
                color="success"
                label={`${completedLessons} done`}
              />
              <Chip
                size="small"
                color="warning"
                label={`${inProgressLessons} started`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${notStartedLessons} not started`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${completedCourses} subjects`}
              />
            </Box>
          </Box>
          <Typography
            variant="h3"
            fontWeight={900}
            color="primary.main"
            sx={{
              flexShrink: 0,
              display: { xs: "none", md: "block" },
            }}
          >
            {overallPercent}%
          </Typography>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <GlassStatCard
            accent
            label="Total XP"
            value={totalXp}
            icon={<StarIcon />}
            subtitle={`+${todayXp} today`}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <GlassStatCard
            label="Level"
            value={level}
            icon={<TrendingUpIcon />}
            subtitle={`${levelXp}/${XP_PER_LEVEL} to Lv ${level + 1}`}
            progress={levelProgress}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <GlassStatCard
            label="Streak"
            value={`${profile?.current_streak || 0}d`}
            icon={<LocalFireDepartmentIcon />}
            subtitle={`Best ${profile?.longest_streak || 0}d`}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <GlassStatCard
            label="Rank"
            value={rank ? `#${rank}` : "—"}
            icon={<LeaderboardIcon />}
            subtitle="Leaderboard"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <GlassStatCard
            label="Badges"
            value={badgeCount}
            icon={<EmojiEventsIcon />}
            subtitle="Unlocked"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <GlassStatCard
            label="Medals"
            value={medalCount}
            icon={<MilitaryTechIcon />}
            subtitle="Earned"
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          p: { xs: 1.75, md: 2 },
          mb: 3,
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
              <Typography fontWeight={800}>{dailyGoal.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {dailyGoal.subtitle}
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ width: { xs: "100%", sm: 220 } }}>
            <LinearProgress
              variant="determinate"
              value={dailyGoal.progress}
              sx={{ height: 8, borderRadius: 999 }}
            />
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <SectionHeader
            title="Subject progress"
            subtitle="Lesson completion by enrolled subject"
            icon={<MenuBookIcon color="primary" />}
            actionLabel="My subjects"
            actionTo="/student/courses"
          />
          {subjects.length ? (
            <Stack spacing={1.5} sx={{ mb: 3 }}>
              {subjects.map((subject) => {
                const percent = Number(subject.percent || 0);
                return (
                  <Paper key={subject.courseId} variant="outlined" sx={{ p: 2 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      alignItems={{ sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mb: 0.75 }}
                        >
                          <Typography fontWeight={800} noWrap>
                            {subject.subject || subject.title}
                          </Typography>
                          {subject.gradeLevel ? (
                            <Chip size="small" label={subject.gradeLevel} />
                          ) : null}
                          <Chip
                            size="small"
                            color={percent >= 100 ? "success" : "default"}
                            label={`${percent}%`}
                            sx={{ fontWeight: 800 }}
                          />
                        </Stack>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {subject.completed}/{subject.totalLessons} lessons
                          complete
                          {subject.inProgress
                            ? ` · ${subject.inProgress} in progress`
                            : ""}
                          {subject.notStarted
                            ? ` · ${subject.notStarted} not started`
                            : ""}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, Math.max(0, percent))}
                          sx={{ height: 8, borderRadius: 999 }}
                        />
                      </Box>
                      <Button
                        component={RouterLink}
                        to={`/student/courses/${subject.courseId}`}
                        variant="contained"
                        size="small"
                      >
                        {percent >= 100 ? "Review" : "Continue"}
                      </Button>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Box sx={{ mb: 3 }}>
              <EmptyState
                icon={<SchoolIcon sx={{ fontSize: 36 }} />}
                title="No subject progress yet"
                description="Enroll in a subject and complete lessons to start tracking."
                actionLabel="Browse subjects"
                to="/student/courses"
                color="#3B82F6"
              />
            </Box>
          )}

          <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
            <SectionHeader
              title="Quiz performance"
              subtitle="Attempts, pass rate, and average score"
              icon={<QuizIcon color="secondary" />}
              actionLabel="All quizzes"
              actionTo="/student/quizzes"
            />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Attempts
                </Typography>
                <Typography fontWeight={900}>{quizAttempts}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Passed
                </Typography>
                <Typography fontWeight={900}>{quizzesPassed}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Pass rate
                </Typography>
                <Typography fontWeight={900}>{quizPassRate}%</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Avg score
                </Typography>
                <Typography fontWeight={900}>
                  {averageQuizScore ? `${averageQuizScore.toFixed(0)}%` : "—"}
                </Typography>
              </Grid>
            </Grid>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Pass rate across completed quiz attempts
            </Typography>
            <LinearProgress
              variant="determinate"
              value={quizPassRate}
              sx={{ height: 8, borderRadius: 999, mb: 2 }}
            />

            <Typography fontWeight={800} sx={{ mb: 1 }}>
              Upcoming quizzes
            </Typography>
            {upcomingQuizzes.length ? (
              <List dense disablePadding>
                {upcomingQuizzes.slice(0, 5).map((quiz) => (
                  <ListItem
                    key={quiz.id}
                    disableGutters
                    secondaryAction={
                      <Button
                        component={RouterLink}
                        to={`/student/quizzes/${quiz.id}`}
                        size="small"
                      >
                        Open
                      </Button>
                    }
                    sx={{ pr: 10 }}
                  >
                    <ListItemText
                      primary={quiz.title}
                      secondary={[
                        quiz.course_title,
                        quiz.due_at || quiz.dueAt
                          ? `Due ${new Date(
                              quiz.due_at || quiz.dueAt,
                            ).toLocaleString()}`
                          : null,
                        quiz.attemptsRemaining != null
                          ? `${quiz.attemptsRemaining} attempt(s) left`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No open quizzes waiting — check your subjects for new
                challenges.
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
            <SectionHeader
              title="XP trend"
              subtitle="XP earned over the last 14 days"
              icon={<TimelineIcon color="primary" />}
            />
            {(analytics?.xpTrend || []).length ? (
              <Box sx={{ height: 220 }}>
                <Line
                  data={xpChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                      },
                    },
                  }}
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Complete lessons, quizzes, or games to start your XP history.
              </Typography>
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5 }}
            >
              Next level at {nextLevelXp} XP · {XP_PER_LEVEL - levelXp} XP to
              go.
            </Typography>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
            <SectionHeader
              title="Achievements snapshot"
              subtitle="Badges and medals you have unlocked"
              icon={<EmojiEventsIcon color="warning" />}
              actionLabel="Trophy Room"
              actionTo="/student/achievements"
            />
            <Stack spacing={1.25}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography fontWeight={700}>Badges</Typography>
                <Chip label={badgeCount} size="small" sx={{ fontWeight: 800 }} />
              </Stack>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography fontWeight={700}>Medals</Typography>
                <Chip label={medalCount} size="small" sx={{ fontWeight: 800 }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Keep finishing lessons and scoring 70%+ on quizzes and games to
                unlock more.
              </Typography>
            </Stack>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
            <SectionHeader
              title="Quick tips"
              subtitle="Easy ways to read this page"
              icon={<FlagIcon color="action" />}
            />
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>Lessons</strong> — finish them to raise your subject %.
              </Typography>
              <Typography variant="body2">
                <strong>100%</strong> — you finished every lesson in that
                subject.
              </Typography>
              <Typography variant="body2">
                <strong>XP</strong> — points you earn. Every {XP_PER_LEVEL} XP =
                1 new level.
              </Typography>
              <Typography variant="body2">
                <strong>Daily goal</strong> — try to earn {DEFAULT_DAILY_XP_GOAL}{" "}
                XP each day. Extra XP still counts!
              </Typography>
              <Typography variant="body2">
                <strong>Streak</strong> — how many days in a row you learned.
              </Typography>
              <Typography variant="body2">
                <strong>Quizzes</strong> — usually need about 70% to pass. Submit
                your result when you are ready.
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
