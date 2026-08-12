import { useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QuizIcon from '@mui/icons-material/Quiz';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FlagIcon from '@mui/icons-material/Flag';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import StatCard from '../../components/common/StatCard';
import GlassStatCard from '../../components/common/GlassStatCard';
import QuestCard from '../../components/common/QuestCard';
import EmptyState from '../../components/common/EmptyState';
import SectionHeader from '../../components/common/SectionHeader';
import PageContainer from '../../components/common/PageContainer';
import XpBar from '../../components/gamification/XpBar';
import LeaderboardCard from '../../components/gamification/LeaderboardCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import analyticsService from '../../services/analyticsService';
import gamificationService from '../../services/gamificationService';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { buildAuthenticatedFileUrl } from '../../utils/fileUrls';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const DAILY_XP_GOAL = 50;

export default function StudentDashboard() {
  const { user, profile: authProfile, updateProfile } = useAuth();
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [analyticsRes, gamificationRes, leaderboardRes, coursesRes] = await Promise.all([
          analyticsService.student(),
          gamificationService.me(),
          gamificationService.leaderboard({ limit: 5 }),
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
    const match = data.analytics.xpTrend.find((item) => String(item.day).startsWith(today)
      || String(item.day).slice(0, 10) === today);
    if (match) return Number(match.xp) || 0;
    const last = data.analytics.xpTrend[data.analytics.xpTrend.length - 1];
    return Number(last?.xp) || 0;
  }, [data]);

  if (loading) return <LoadingScreen label="Loading your quest..." showCards />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const profile = data.gamification.profile;
  const analytics = data.analytics;
  const rank = data.gamification.rank;
  const courseList = Array.isArray(courses) ? courses : [];
  const recommended = courseList
    .filter((course) => Number(course.progress_percent || 0) < 100)
    .slice(0, 3);
  const upcomingQuizzes = analytics.upcomingQuizzes || [];
  const dailyProgress = Math.min(100, Math.round((todayXp / DAILY_XP_GOAL) * 100));
  const avatarSrc = buildAuthenticatedFileUrl(authProfile?.avatar_url || profile.avatar_url);
  const quickStartTo = upcomingQuizzes[0]
    ? `/student/quizzes/${upcomingQuizzes[0].id}`
    : recommended[0]
      ? `/student/courses/${recommended[0].id}`
      : '/student/courses';

  const chartData = {
    labels: (analytics.xpTrend || []).map((item) => item.day),
    datasets: [
      {
        label: 'XP earned',
        data: (analytics.xpTrend || []).map((item) => Number(item.xp)),
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99,102,241,0.16)',
        tension: 0.35,
        fill: true,
      },
    ],
  };

  return (
    <PageContainer>
      <Stack
        className="page-hero"
        component={motion.div}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Avatar
            src={avatarSrc || undefined}
            alt={user?.firstName || 'Student'}
            sx={{
              width: { xs: 64, md: 76 },
              height: { xs: 64, md: 76 },
              border: '3px solid rgba(255,255,255,0.65)',
              bgcolor: 'secondary.main',
              fontWeight: 800,
              fontSize: '1.5rem',
            }}
          >
            {(user?.firstName || 'S').charAt(0)}
          </Avatar>
          <Box>
            <Chip
              icon={<LocalFireDepartmentIcon />}
              label={`${profile.current_streak || 0}-day streak`}
              sx={{ mb: 1, bgcolor: 'rgba(250,204,21,0.95)', color: '#1E293B', fontWeight: 800 }}
            />
            <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, mb: 0.5 }}>
              Welcome back, {user?.firstName}!
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.92)', maxWidth: 520 }}>
              Ready for today&apos;s quest? Earn XP, beat challenges, and climb the leaderboard.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ position: 'relative', zIndex: 1 }} flexWrap="wrap" useFlexGap>
          <Button
            component={RouterLink}
            to={quickStartTo}
            variant="contained"
            size="large"
            startIcon={<RocketLaunchIcon />}
            sx={{ bgcolor: '#FACC15', color: '#1E293B', '&:hover': { bgcolor: '#FDE047' } }}
          >
            Quick Start
          </Button>
          <Button
            component={RouterLink}
            to="/student/games"
            variant="outlined"
            size="large"
            startIcon={<SportsEsportsIcon />}
            sx={{ borderColor: '#fff', color: '#fff', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.12)' } }}
          >
            Play a Game
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <GlassStatCard
            accent
            label="Total XP"
            value={profile.xp}
            icon={<StarIcon />}
            subtitle={`+${todayXp} today`}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <GlassStatCard
            label="Badges"
            value={analytics.badges || 0}
            icon={<EmojiEventsIcon />}
            subtitle="Trophy room"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <GlassStatCard
            label="Certificates"
            value={analytics.certificates || 0}
            icon={<WorkspacePremiumIcon />}
            subtitle={rank ? `Rank #${rank}` : 'Climb the board'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: { xs: 2, md: 2.5 }, height: '100%' }}>
            <SectionHeader
              title="Learning Progress"
              subtitle="Your XP journey across recent activity"
              icon={<AutoAwesomeIcon color="secondary" />}
            />
            <XpBar xp={profile.xp} />
            <Box sx={{ mt: 3, minHeight: 180 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Recent XP Activity
              </Typography>
              {(analytics.xpTrend || []).length ? (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              ) : (
                <Typography color="text.secondary">Complete activities to see your XP trend.</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <Paper
              sx={{
                p: 2.5,
                background: 'linear-gradient(160deg, rgba(250,204,21,0.16), rgba(99,102,241,0.08))',
              }}
            >
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FlagIcon sx={{ color: '#F59E0B' }} />
                  <Typography variant="h6" fontWeight={800}>Daily Goal</Typography>
                </Stack>
                <Typography color="text.secondary">Earn {DAILY_XP_GOAL} XP today</Typography>
                <Typography variant="h4" fontWeight={800}>
                  {todayXp} / {DAILY_XP_GOAL}
                </Typography>
                <LinearProgress variant="determinate" value={dailyProgress} />
                <Chip
                  size="small"
                  label={dailyProgress >= 100 ? 'Daily challenge complete!' : `${dailyProgress}% complete`}
                  color={dailyProgress >= 100 ? 'success' : 'default'}
                  sx={{ alignSelf: 'flex-start' }}
                />
              </Stack>
            </Paper>
            <Paper sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <MilitaryTechIcon color="warning" />
                <Typography variant="h6" fontWeight={800}>Certificate Status</Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                {analytics.certificates
                  ? `You have earned ${analytics.certificates} certificate(s).`
                  : 'Complete course lessons and required quizzes to unlock certificates.'}
              </Typography>
              <Button component={RouterLink} to="/student/certificates" variant="contained" fullWidth>
                View Certificates
              </Button>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Medals" value={analytics.medals || 0} icon={<MilitaryTechIcon />} color="#F59E0B" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Quizzes Passed" value={analytics.quizzesPassed || 0} icon={<QuizIcon />} color="#8B5CF6" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Streak"
            value={`${profile.current_streak || 0} days`}
            icon={<LocalFireDepartmentIcon />}
            color="#F97316"
            subtitle={`Best ${profile.longest_streak || 0}`}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Leaderboard"
            value={rank ? `#${rank}` : '—'}
            icon={<LeaderboardIcon />}
            color="#6366F1"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
            <SectionHeader
              title="Continue Learning"
              subtitle="Pick up where you left off"
              actionLabel="My courses"
              actionTo="/student/courses"
              icon={<MenuBookIcon color="secondary" />}
            />
            {recommended.length ? (
              <Stack spacing={1.5}>
                {recommended.map((course) => (
                  <Paper key={course.id} variant="outlined" sx={{ p: 1.75 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      alignItems={{ sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography fontWeight={800} noWrap>{course.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {course.subject || 'Course'} · {Number(course.progress_percent || 0)}% lessons
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
                title="No courses in progress"
                description="Enroll in a learning module to get started."
                actionLabel="Find a course"
                to="/student/courses"
                color="#8B5CF6"
              />
            )}
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
            <SectionHeader
              title="Upcoming Quizzes"
              subtitle="Jump in and earn XP"
              actionLabel="All quizzes"
              actionTo="/student/quizzes"
              icon={<QuizIcon color="primary" />}
            />
            {upcomingQuizzes.length ? (
              <Grid container spacing={2}>
                {upcomingQuizzes.slice(0, 4).map((quiz) => (
                  <Grid key={quiz.id} size={{ xs: 12, sm: 6 }}>
                    <QuestCard
                      title={quiz.title}
                      description={quiz.course_title}
                      icon={<QuizIcon />}
                      accent="purple"
                      xpReward={quiz.xp_reward || 50}
                      difficulty="Challenge"
                      status="Ready"
                      statusColor="success"
                      to={`/student/quizzes/${quiz.id}`}
                      actionLabel="Start Quiz"
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <EmptyState
                icon={<QuizIcon sx={{ fontSize: 36 }} />}
                title="No quizzes waiting"
                description="Explore your courses to unlock new quiz challenges."
                actionLabel="Browse courses"
                to="/student/courses"
              />
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ mb: 2 }}>
            <LeaderboardCard entries={leaderboard} />
          </Box>
          <Paper sx={{ p: 2.5 }}>
            <SectionHeader
              title="Recent Achievements"
              subtitle="Celebrate your milestones"
              actionLabel="View all"
              actionTo="/student/achievements"
              icon={<EmojiEventsIcon sx={{ color: '#FACC15' }} />}
            />
            <Stack spacing={1.25}>
              <Chip
                icon={<EmojiEventsIcon />}
                label={`${analytics.badges || 0} badges earned`}
                sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(250,204,21,0.22)', fontWeight: 700 }}
              />
              <Chip
                icon={<MilitaryTechIcon />}
                label={`${analytics.medals || 0} medals`}
                color="warning"
                variant="outlined"
                sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
              />
              <Chip
                icon={<WorkspacePremiumIcon />}
                label={`${analytics.certificates || 0} certificates`}
                color="secondary"
                variant="outlined"
                sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
              />
              <Button
                component={RouterLink}
                to="/student/achievements"
                variant="contained"
                color="secondary"
                startIcon={<EmojiEventsIcon />}
              >
                Open Trophy Room
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
