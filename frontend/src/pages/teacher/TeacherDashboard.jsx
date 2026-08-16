import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import GroupsIcon from "@mui/icons-material/Groups";
import QuizIcon from "@mui/icons-material/Quiz";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Link as RouterLink } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import StatCard from "../../components/common/StatCard";
import LoadingScreen from "../../components/common/LoadingScreen";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import SectionHeader from "../../components/common/SectionHeader";
import EmptyState from "../../components/common/EmptyState";
import analyticsService from "../../services/analyticsService";
import { getErrorMessage } from "../../services/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService
      .teacher()
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
        label: "Average score",
        data: data.quizStats.map((item) => Number(item.average_score || 0)),
        backgroundColor: "#3B82F6",
        borderRadius: 10,
      },
    ],
  };

  return (
    <PageContainer>
      <PageHeader
        title="Teacher Studio"
        subtitle="Track courses, motivate learners, and launch AI content."
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              component={RouterLink}
              to="/teacher/quizzes/new"
              variant="contained"
              sx={{ bgcolor: "#FACC15", color: "#1E293B" }}
            >
              Create Quiz
            </Button>
            <Button
              component={RouterLink}
              to="/teacher/ai-quiz"
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              sx={{ borderColor: "#fff", color: "#fff" }}
            >
              AI Quiz
            </Button>
            <Button
              component={RouterLink}
              to="/teacher/ai-game"
              variant="outlined"
              startIcon={<SportsEsportsIcon />}
              sx={{ borderColor: "#fff", color: "#fff" }}
            >
              AI Game
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Subjects"
            value={data.totalCourses}
            icon={<MenuBookIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Students"
            value={data.totalStudents}
            icon={<GroupsIcon />}
            color="#8B5CF6"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Quizzes"
            value={data.quizStats.length}
            icon={<QuizIcon />}
            color="#F97316"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Avg Progress"
            value={`${Math.round(Number(data.averageProgress) || 0)}%`}
            icon={<TrendingUpIcon />}
            color="#22C55E"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <SectionHeader
              title="Quiz Performance"
              subtitle="Average scores across your quizzes"
            />
            {data.quizStats.length ? (
              <Bar data={chartData} />
            ) : (
              <EmptyState
                icon={<QuizIcon sx={{ fontSize: 36 }} />}
                title="No quiz analytics yet"
                description="Create your first AI quiz to see performance charts here."
                actionLabel="Generate Quiz"
                to="/teacher/ai-quiz"
              />
            )}
            {data.quizStats.length ? (
              <List dense sx={{ mt: 2 }}>
                {data.quizStats.slice(0, 6).map((quiz) => (
                  <ListItem
                    key={quiz.id}
                    alignItems="flex-start"
                    disableGutters
                  >
                    <ListItemText
                      primary={quiz.title}
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {quiz.attempts || 0} attempts · avg{" "}
                            {Number(quiz.average_score || 0).toFixed(1)}%
                          </Typography>
                          <ContentTimestamp item={quiz} dense />
                        </Stack>
                      }
                      secondaryTypographyProps={{ component: "div" }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : null}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" fontWeight={900} gutterBottom>
              Most Active Students
            </Typography>
            <List dense>
              {(data.activeStudents || []).map((student) => (
                <ListItem key={student.id}>
                  <ListItemText
                    primary={`${student.first_name} ${student.last_name}`}
                    secondary={`${student.activity_count} actions in 14 days`}
                    primaryTypographyProps={{ fontWeight: 800 }}
                  />
                </ListItem>
              ))}
              {!data.activeStudents?.length ? (
                <Typography color="text.secondary">
                  No recent activity yet.
                </Typography>
              ) : null}
            </List>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Quick Actions
            </Typography>
            <Stack spacing={1}>
              <Button
                component={RouterLink}
                to="/teacher/courses"
                variant="contained"
              >
                Manage Subjects
              </Button>
              <Button
                component={RouterLink}
                to="/teacher/quizzes/new"
                variant="contained"
                color="secondary"
              >
                Create Quiz
              </Button>
              <Button
                component={RouterLink}
                to="/teacher/ai-quiz"
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
              >
                Generate AI Quiz
              </Button>
              <Button
                component={RouterLink}
                to="/teacher/ai-game"
                variant="outlined"
                startIcon={<SportsEsportsIcon />}
              >
                Generate AI Game
              </Button>
              <Button
                component={RouterLink}
                to="/teacher/ai-content"
                variant="outlined"
              >
                AI Content / Upload Material
              </Button>
              <Button
                component={RouterLink}
                to="/teacher/awards"
                variant="outlined"
              >
                Award Badges
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
