import { useEffect, useState } from "react";
import { Alert, Grid, Tab, Tabs, Typography } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import QuizIcon from "@mui/icons-material/Quiz";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import QuestCard from "../../components/common/QuestCard";
import EmptyState from "../../components/common/EmptyState";
import SectionHeader from "../../components/common/SectionHeader";
import StudentQuizzesPage from "./StudentQuizzesPage";
import StudentGamesPage from "./StudentGamesPage";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";

function courseAdviserName(course) {
  const name =
    `${course?.teacher_first_name || ""} ${course?.teacher_last_name || ""}`.trim();
  return name || null;
}

export default function StudentCoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const view =
    requestedView === "quizzes" || requestedView === "games"
      ? requestedView
      : "subjects";

  function changeView(_event, next) {
    if (next === "subjects") {
      setSearchParams({});
      return;
    }
    setSearchParams({ view: next });
  }

  return (
    <>
      <PageHeader
        title="My Subjects"
        subtitle="Open a subject, then take its quizzes and games from here."
      />
      <Tabs
        value={view}
        onChange={changeView}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab icon={<MenuBookIcon />} iconPosition="start" value="subjects" label="Subjects" />
        <Tab icon={<QuizIcon />} iconPosition="start" value="quizzes" label="Quizzes" />
        <Tab icon={<SportsEsportsIcon />} iconPosition="start" value="games" label="Games" />
      </Tabs>
      {view === "quizzes" ? <StudentQuizzesPage embedded /> : null}
      {view === "games" ? <StudentGamesPage embedded /> : null}
      {view === "subjects" ? <SubjectsPanel /> : null}
    </>
  );
}

function SubjectsPanel() {
  const [catalog, setCatalog] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [catalogRes, enrolledRes] = await Promise.all([
        courseService.list({ limit: 50 }),
        courseService.myCourses(),
      ]);
      setCatalog(catalogRes.data.data.courses || []);
      setEnrolled(enrolledRes.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingScreen label="Loading subjects..." showCards />;

  const enrolledIds = new Set(enrolled.map((course) => course.id));
  const availableCatalog = catalog.filter(
    (course) => !enrolledIds.has(course.id),
  );

  return (
    <>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <SectionHeader
        title="My Subjects"
        subtitle="Pick up where you left off"
        icon={<SchoolIcon color="primary" />}
      />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {enrolled.length ? (
          enrolled.map((course) => {
            const adviser = courseAdviserName(course);
            return (
              <Grid key={course.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <QuestCard
                  title={course.subject || course.title}
                  description={
                    `${course.grade_level || ""}${course.description ? ` · ${course.description}` : ""}`.trim() ||
                    "Subject overview"
                  }
                  meta={adviser ? `Teacher: ${adviser}` : undefined}
                  icon={<SchoolIcon />}
                  accent="blue"
                  status={`${Number(course.progress_percent || 0)}% lessons`}
                  statusColor={
                    Number(course.progress_percent || 0) >= 100
                      ? "success"
                      : "primary"
                  }
                  showTimestamp
                  item={course}
                  to={`/student/courses/${course.id}`}
                  actionLabel="Continue Quest"
                />
              </Grid>
            );
          })
        ) : (
          <Grid size={12}>
            <EmptyState
              icon={<MenuBookIcon sx={{ fontSize: 36 }} />}
              title="No enrolled subjects yet"
              description="Browse the catalog below and join your first learning quest!"
              color="#3B82F6"
            />
          </Grid>
        )}
      </Grid>

      <SectionHeader
        title="Subject Catalog"
        subtitle="Discover new subjects to master"
        icon={<MenuBookIcon color="secondary" />}
      />
      <Grid container spacing={2}>
        {availableCatalog.length ? (
          availableCatalog.map((course) => {
            const adviser = courseAdviserName(course);
            return (
              <Grid key={course.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <QuestCard
                  title={course.subject || course.title}
                  description={course.description || "Subject overview"}
                  meta={adviser ? `Teacher: ${adviser}` : undefined}
                  icon={<MenuBookIcon />}
                  accent="purple"
                  difficulty={course.grade_level}
                  status="Available"
                  statusColor="secondary"
                  showTimestamp
                  item={course}
                  to={`/student/courses/${course.id}`}
                  actionLabel="View Subject"
                />
              </Grid>
            );
          })
        ) : (
          <Grid size={12}>
            <Typography color="text.secondary">
              {enrolled.length
                ? "You're enrolled in every available subject."
                : "No subjects published yet."}
            </Typography>
          </Grid>
        )}
      </Grid>
    </>
  );
}
