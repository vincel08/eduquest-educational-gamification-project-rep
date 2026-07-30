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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import GroupsIcon from '@mui/icons-material/Groups';
import QuizIcon from '@mui/icons-material/Quiz';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import analyticsService from '../../services/analyticsService';
import { getErrorMessage } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.teacher()
      .then((response) => setData(response.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const chartData = {
    labels: data.quizStats.map((item) => item.title),
    datasets: [
      {
        label: 'Average Score',
        data: data.quizStats.map((item) => Number(item.average_score || 0)),
        backgroundColor: '#7C3AED',
      },
    ],
  };

  return (
    <>
      <PageHeader
        title="Teacher Dashboard"
        subtitle="Monitor course performance and student engagement."
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Courses" value={data.totalCourses} icon={<MenuBookIcon />} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Students" value={data.totalStudents} icon={<GroupsIcon />} color="#0EA5E9" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Avg Progress" value={`${data.averageProgress}%`} icon={<TrendingUpIcon />} color="#22C55E" />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <StatCard label="Quizzes Tracked" value={data.quizStats.length} icon={<QuizIcon />} color="#F59E0B" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quiz Performance
            </Typography>
            {data.quizStats.length ? <Bar data={chartData} /> : (
              <Typography color="text.secondary">Create quizzes to see analytics here.</Typography>
            )}
            {data.quizStats.length ? (
              <List dense sx={{ mt: 2 }}>
                {data.quizStats.slice(0, 6).map((quiz) => (
                  <ListItem key={quiz.id} alignItems="flex-start" disableGutters>
                    <ListItemText
                      primary={quiz.title}
                      secondary={(
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {quiz.attempts || 0} attempts · avg {Number(quiz.average_score || 0).toFixed(1)}%
                          </Typography>
                          <ContentTimestamp item={quiz} dense />
                        </Stack>
                      )}
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : null}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Most Active Students</Typography>
            <List dense>
              {(data.activeStudents || []).map((student) => (
                <ListItem key={student.id}>
                  <ListItemText
                    primary={`${student.first_name} ${student.last_name}`}
                    secondary={`${student.activity_count} actions in 14 days`}
                  />
                </ListItem>
              ))}
              {!data.activeStudents?.length ? (
                <Typography color="text.secondary">No recent activity yet.</Typography>
              ) : null}
            </List>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Most Difficult Questions</Typography>
            <List dense>
              {(data.difficultQuestions || []).map((item) => (
                <ListItem key={item.id} alignItems="flex-start">
                  <ListItemText
                    primary={item.question_text}
                    secondary={`${item.quiz_title} · Miss rate ${item.miss_rate || 0}%`}
                  />
                </ListItem>
              ))}
              {!data.difficultQuestions?.length ? (
                <Typography color="text.secondary">Not enough quiz answers yet.</Typography>
              ) : null}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
