import { useEffect, useState } from 'react';
import { Alert, Grid, Paper, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import StarIcon from '@mui/icons-material/Star';
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
        borderColor: '#0F766E',
        tension: 0.35,
      },
    ],
  };

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="System-wide engagement and platform health."
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
          <StatCard label="Avg XP" value={data.averageXp} icon={<StarIcon />} color="#AB47BC" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Engagement (14 days)
        </Typography>
        <Line data={chartData} />
      </Paper>
    </>
  );
}
