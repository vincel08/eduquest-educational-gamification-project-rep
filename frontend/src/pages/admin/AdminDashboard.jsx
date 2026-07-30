import { useEffect, useState } from 'react';
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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
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
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import analyticsService from '../../services/analyticsService';
import { getErrorMessage } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

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

  if (loading) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const totalUsers = data.usersByRole.reduce((sum, item) => sum + Number(item.count), 0);
  const chartData = {
    labels: data.engagement.map((item) => item.day),
    datasets: [
      {
        label: 'XP Activity',
        data: data.engagement.map((item) => Number(item.activity_count)),
        borderColor: '#2563EB',
        tension: 0.35,
      },
    ],
  };

  return (
    <>
      <PageHeader
        title="Control Center"
        subtitle="Platform health, engagement trends, and recent learning content."
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Users" value={totalUsers} icon={<PeopleIcon />} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Courses" value={data.totalCourses} icon={<MenuBookIcon />} color="#0EA5E9" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Quizzes" value={data.totalQuizzes} icon={<QuizIcon />} color="#F59E0B" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Games" value={data.totalGames || 0} icon={<SportsEsportsIcon />} color="#AB47BC" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Engagement (14 days)
        </Typography>
        <Line data={chartData} />
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Quizzes
            </Typography>
            <List dense>
              {(data.recentQuizzes || []).map((quiz) => (
                <ListItem key={quiz.id} alignItems="flex-start" disableGutters>
                  <ListItemText
                    primary={quiz.title}
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
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Educational Games
            </Typography>
            <List dense>
              {(data.recentGames || []).map((game) => (
                <ListItem key={game.id} alignItems="flex-start" disableGutters>
                  <ListItemText
                    primary={game.title}
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
    </>
  );
}
