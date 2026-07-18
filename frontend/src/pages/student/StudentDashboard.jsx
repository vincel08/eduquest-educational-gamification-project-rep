import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QuizIcon from '@mui/icons-material/Quiz';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import XpBar from '../../components/gamification/XpBar';
import LeaderboardCard from '../../components/gamification/LeaderboardCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import analyticsService from '../../services/analyticsService';
import gamificationService from '../../services/gamificationService';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function StudentDashboard() {
  const { user, updateProfile } = useAuth();
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

  if (loading) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const profile = data.gamification.profile;
  const analytics = data.analytics;
  const rank = data.gamification.rank;
  const completedCourses = (Array.isArray(courses) ? courses : [])
    .filter((course) => Number(course.progress_percent) >= 100).length;
  const upcomingQuizzes = analytics.upcomingQuizzes || [];

  const chartData = {
    labels: analytics.xpTrend.map((item) => item.day),
    datasets: [
      {
        label: 'XP earned',
        data: analytics.xpTrend.map((item) => Number(item.xp)),
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37,99,235,0.2)',
        tension: 0.35,
      },
    ],
  };

  return (
    <>
      <div className="page-hero" style={{ marginBottom: 24 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.firstName}!
        </Typography>
        <Typography color="text.secondary">
          Keep your {profile.current_streak || 0}-day streak going and climb the leaderboard.
        </Typography>
      </div>

      <PageHeader title="Student Dashboard" subtitle="Your learning progress at a glance" />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="XP" value={profile.xp} icon={<StarIcon />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Level" value={profile.level} icon={<SchoolIcon />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Badges" value={analytics.badges} icon={<EmojiEventsIcon />} color="#FACC15" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Quizzes Passed" value={analytics.quizzesPassed} icon={<QuizIcon />} color="#7C3AED" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Medals" value={analytics.medals} icon={<WorkspacePremiumIcon />} color="#FACC15" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Certificates" value={analytics.certificates} icon={<WorkspacePremiumIcon />} color="#FACC15" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Daily Streak"
            value={`${profile.current_streak || 0} days`}
            icon={<LocalFireDepartmentIcon />}
            color="#F59E0B"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Leaderboard Rank" value={rank ? `#${rank}` : '—'} icon={<EmojiEventsIcon />} color="#7C3AED" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography fontWeight={700}>Overall Progress</Typography>
          <Typography>{analytics.averageProgress || 0}%</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Number(analytics.averageProgress) || 0)}
          sx={{ height: 12, borderRadius: 999 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Completed courses: {completedCourses} · Enrolled: {analytics.enrolledCourses}
        </Typography>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <XpBar xp={profile.xp} level={profile.level} />
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>XP Trend (14 days)</Typography>
            <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" gutterBottom>Achievement Profile</Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Longest streak: {profile.longest_streak || 0} days
            </Typography>
            <Button component={RouterLink} to="/student/achievements" variant="outlined" size="small">
              View full achievements
            </Button>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Upcoming Quizzes</Typography>
            {upcomingQuizzes.length ? (
              <Stack spacing={1}>
                {upcomingQuizzes.map((quiz) => (
                  <Button
                    key={quiz.id}
                    component={RouterLink}
                    to={`/student/quizzes/${quiz.id}`}
                    variant="text"
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {quiz.title}
                  </Button>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">
                No upcoming quizzes. Explore your courses to continue learning.
              </Typography>
            )}
          </Paper>
          <LeaderboardCard entries={leaderboard} />
        </Grid>
      </Grid>
    </>
  );
}
