import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import PersonIcon from '@mui/icons-material/Person';
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
import PageHeader from '../../components/common/PageHeader';
import PageContainer from '../../components/common/PageContainer';
import StatCard from '../../components/common/StatCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import SectionHeader from '../../components/common/SectionHeader';
import EmptyState from '../../components/common/EmptyState';
import analyticsService from '../../services/analyticsService';
import { getErrorMessage } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.admin()
      .then((response) => setData(response.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const roleCounts = useMemo(() => {
    const map = { student: 0, teacher: 0, administrator: 0 };
    (data?.usersByRole || []).forEach((item) => {
      map[item.role] = Number(item.count) || 0;
    });
    return map;
  }, [data]);

  if (loading) return <LoadingScreen label="Loading control center..." showCards />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const totalUsers = Object.values(roleCounts).reduce((sum, n) => sum + n, 0);
  const chartData = {
    labels: (data.engagement || []).map((item) => item.day),
    datasets: [
      {
        label: 'Student activity',
        data: (data.engagement || []).map((item) => Number(item.activity_count)),
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99,102,241,0.14)',
        tension: 0.35,
        fill: true,
      },
    ],
  };

  return (
    <PageContainer>
      <PageHeader
        title="Admin Control Center"
        subtitle="Platform health, engagement trends, and recent learning content."
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total Users" value={totalUsers} icon={<PeopleIcon />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Students" value={roleCounts.student} icon={<SchoolIcon />} color="#3B82F6" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Teachers" value={roleCounts.teacher} icon={<PersonIcon />} color="#8B5CF6" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Courses" value={data.totalCourses} icon={<MenuBookIcon />} color="#10B981" />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Quizzes" value={data.totalQuizzes} icon={<QuizIcon />} color="#F59E0B" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Games" value={data.totalGames || 0} icon={<SportsEsportsIcon />} color="#8B5CF6" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Admins"
            value={roleCounts.administrator}
            icon={<PeopleIcon />}
            color="#64748B"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Published Quizzes"
            value={(data.recentQuizzes || []).filter((q) => q.is_published).length}
            icon={<QuizIcon />}
            color="#6366F1"
            subtitle="From recent feed"
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
        <SectionHeader title="System Overview" subtitle="Engagement activity over the last 14 days" />
        {(data.engagement || []).length ? (
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
          <EmptyState
            title="No engagement data yet"
            description="Activity will appear here as students earn XP."
          />
        )}
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: '100%' }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Recent Quizzes
            </Typography>
            <List dense>
              {(data.recentQuizzes || []).map((quiz) => (
                <ListItem key={quiz.id} alignItems="flex-start" disableGutters>
                  <ListItemText
                    primary={<Typography fontWeight={700}>{quiz.title}</Typography>}
                    secondary={(
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {quiz.course_title}
                          {quiz.is_published ? ' · Published' : ' · Draft'}
                        </Typography>
                        <ContentTimestamp item={quiz} dense />
                      </Stack>
                    )}
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItem>
              ))}
            </List>
            {!data.recentQuizzes?.length ? (
              <Typography color="text.secondary">No quizzes yet.</Typography>
            ) : null}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: '100%' }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Recent Educational Games
            </Typography>
            <List dense>
              {(data.recentGames || []).map((game) => (
                <ListItem key={game.id} alignItems="flex-start" disableGutters>
                  <ListItemText
                    primary={<Typography fontWeight={700}>{game.title}</Typography>}
                    secondary={(
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {game.course_title} · {String(game.game_type || '').replace(/_/g, ' ')}
                          {game.is_published ? ' · Published' : ' · Draft'}
                        </Typography>
                        <ContentTimestamp item={game} dense />
                      </Stack>
                    )}
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItem>
              ))}
            </List>
            {!data.recentGames?.length ? (
              <Typography color="text.secondary">No games yet.</Typography>
            ) : null}
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
