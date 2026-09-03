import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
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
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ClassIcon from "@mui/icons-material/Class";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useTheme } from "@mui/material/styles";
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
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MAX_CHART_QUIZZES = 8;

function truncateLabel(text, max = 28) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function scoreBarColor(score) {
  const value = Number(score) || 0;
  if (value >= 70) return "#10B981";
  if (value >= 50) return "#F59E0B";
  if (value > 0) return "#F97316";
  return "#94A3B8";
}

export default function TeacherDashboard() {
  const theme = useTheme();
  const { toQueryParams, schoolYear, gradeLevel, section } = useTeacherFilters();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsService
      .teacher(toQueryParams())
      .then((response) => setData(response.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [schoolYear, gradeLevel, section, toQueryParams]);

  const quizRows = useMemo(() => {
    const rows = Array.isArray(data?.quizStats) ? data.quizStats : [];
    return [...rows]
      .map((quiz) => ({
        ...quiz,
        average_score: Number(quiz.average_score || 0),
        attempts: Number(quiz.attempts || 0),
      }))
      .sort((a, b) => {
        if (b.average_score !== a.average_score) {
          return b.average_score - a.average_score;
        }
        return b.attempts - a.attempts;
      })
      .slice(0, MAX_CHART_QUIZZES);
  }, [data]);

  const chartData = useMemo(
    () => ({
      labels: quizRows.map((item) => truncateLabel(item.title)),
      datasets: [
        {
          label: "Average score (%)",
          data: quizRows.map((item) =>
            Number(Math.min(100, Math.max(0, item.average_score)).toFixed(1)),
          ),
          backgroundColor: quizRows.map((item) => scoreBarColor(item.average_score)),
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 22,
          maxBarThickness: 28,
        },
      ],
    }),
    [quizRows],
  );

  const chartOptions = useMemo(
    () => ({
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) {
              const index = items?.[0]?.dataIndex;
              return quizRows[index]?.title || "";
            },
            label(context) {
              const quiz = quizRows[context.dataIndex];
              const score = Number(context.parsed.x || 0).toFixed(1);
              const attempts = quiz?.attempts || 0;
              if (!attempts) return "No completed attempts yet";
              return `Avg ${score}% · ${attempts} attempt${attempts === 1 ? "" : "s"}`;
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: theme.palette.text.secondary,
            callback: (value) => `${value}%`,
          },
          grid: {
            color:
              theme.palette.mode === "dark"
                ? "rgba(148,163,184,0.12)"
                : "rgba(148,163,184,0.2)",
          },
          title: {
            display: true,
            text: "Average score",
            color: theme.palette.text.secondary,
            font: { weight: 700, size: 12 },
          },
        },
        y: {
          ticks: {
            color: theme.palette.text.primary,
            font: { weight: 600, size: 11 },
            autoSkip: false,
          },
          grid: { display: false },
        },
      },
    }),
    [quizRows, theme],
  );

  if (loading) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const chartHeight = Math.max(220, quizRows.length * 48 + 72);
  const showSectionsStat = !section || section === "all";
  const topStatSize = showSectionsStat
    ? { xs: 12, sm: 6, md: 4 }
    : { xs: 12, sm: 6, md: 3 };

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
            >
              AI Quiz
            </Button>
            <Button
              component={RouterLink}
              to="/teacher/ai-game"
              variant="outlined"
              startIcon={<SportsEsportsIcon />}
            >
              AI Game
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={topStatSize}>
          <StatCard
            label="Subjects"
            value={data.totalCourses}
            icon={<MenuBookIcon />}
            to="/teacher/courses"
          />
        </Grid>
        <Grid size={topStatSize}>
          <StatCard
            label="Students"
            value={data.totalStudents}
            icon={<GroupsIcon />}
            color="#8B5CF6"
            to="/teacher/students"
          />
        </Grid>
        {showSectionsStat ? (
          <Grid size={topStatSize}>
            <StatCard
              label="Sections"
              value={data.totalSections || 0}
              icon={<ClassIcon />}
              color="#0EA5E9"
              to="/teacher/sections"
            />
          </Grid>
        ) : null}
        <Grid size={showSectionsStat ? { xs: 12, sm: 6, md: 6 } : topStatSize}>
          <StatCard
            label="Quizzes"
            value={data.quizStats.length}
            icon={<QuizIcon />}
            color="#F97316"
            to="/teacher/quizzes"
          />
        </Grid>
        <Grid size={showSectionsStat ? { xs: 12, sm: 6, md: 6 } : topStatSize}>
          <StatCard
            label="Games"
            value={data.totalGames || 0}
            icon={<SportsEsportsIcon />}
            color="#22C55E"
            to="/teacher/games"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
            <SectionHeader
              title="Quiz Performance"
              subtitle="Average score (%) — green ≥70%, amber ≥50%"
            />
            {quizRows.length ? (
              <Box sx={{ width: "100%", height: chartHeight, mt: 1 }}>
                <Bar data={chartData} options={chartOptions} />
              </Box>
            ) : (
              <EmptyState
                icon={<QuizIcon sx={{ fontSize: 36 }} />}
                title="No quiz analytics yet"
                description="Create your first AI quiz to see performance charts here."
                actionLabel="Generate Quiz"
                to="/teacher/ai-quiz"
              />
            )}
            {quizRows.length ? (
              <List dense sx={{ mt: 2 }}>
                {quizRows.map((quiz) => (
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
                            {quiz.attempts || 0} attempt
                            {quiz.attempts === 1 ? "" : "s"} · avg{" "}
                            {Number(quiz.average_score || 0).toFixed(1)}%
                            {!quiz.attempts ? " · no submissions yet" : ""}
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
