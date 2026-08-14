import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LockIcon from "@mui/icons-material/Lock";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import { Link as RouterLink, useParams } from "react-router-dom";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import QuizIcon from "@mui/icons-material/Quiz";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import courseService from "../../services/courseService";
import gamificationService from "../../services/gamificationService";
import { getErrorMessage } from "../../services/api";
import {
  buildCertificateRequirementRows,
  computeLearningProgressPercent,
  getCertificateStatus,
} from "../../utils/courseProgressDisplay";

export default function StudentCourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [games, setGames] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolledProgress, setEnrolledProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    try {
      const [courseRes, lessonsRes, quizzesRes, gamesRes, myCoursesRes] =
        await Promise.all([
          courseService.getById(courseId),
          courseService.lessons(courseId),
          courseService.quizzes(courseId),
          courseService.games(courseId),
          courseService.myCourses(),
        ]);

      setCourse(courseRes.data.data);
      setLessons(lessonsRes.data.data || []);
      setQuizzes(quizzesRes.data.data || []);
      setGames(gamesRes.data.data || []);

      const mine = (myCoursesRes.data.data || []).find(
        (item) => Number(item.id) === Number(courseId),
      );
      const isEnrolled = Boolean(mine);
      setEnrolled(isEnrolled);
      setEnrolledProgress(Number(mine?.progress_percent || 0));

      if (isEnrolled) {
        try {
          const eligibilityRes =
            await gamificationService.getCourseCertificateEligibility(courseId);
          setEligibility(eligibilityRes.data.data);
        } catch {
          setEligibility(null);
        }
      } else {
        setEligibility(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const learningProgressPercent = useMemo(() => {
    if (!enrolled) return 0;
    if (lessons.length) return computeLearningProgressPercent(lessons);
    return Number(enrolledProgress || 0);
  }, [enrolled, lessons, enrolledProgress]);

  const requirementRows = useMemo(
    () => buildCertificateRequirementRows(eligibility),
    [eligibility],
  );
  const certificateStatus = useMemo(
    () => getCertificateStatus(eligibility),
    [eligibility],
  );

  const canEnroll = Boolean(course?.is_published) && !enrolled;

  async function handleEnroll() {
    if (!canEnroll || enrolling) return;
    setEnrolling(true);
    setError("");
    setMessage("");
    try {
      await courseService.enroll(courseId);
      setMessage(
        "Enrolled successfully. You can now start lessons and quizzes.",
      );
      setLoading(true);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error && !course) return <Alert severity="error">{error}</Alert>;

  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        subtitle={course.description}
        action={
          canEnroll ? (
            <Button
              variant="contained"
              size="large"
              startIcon={<HowToRegIcon />}
              disabled={enrolling}
              onClick={handleEnroll}
              sx={{
                bgcolor: "#FACC15",
                color: "#1E293B",
                "&:hover": { bgcolor: "#FDE047" },
              }}
            >
              {enrolling ? "Enrolling..." : "Enroll Now"}
            </Button>
          ) : enrolled ? (
            <Chip
              color="success"
              icon={<CheckCircleIcon />}
              label="Enrolled"
              sx={{ fontWeight: 800, bgcolor: "rgba(255,255,255,0.92)" }}
            />
          ) : null
        }
      />
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 2 }}
      >
        {course.grade_level ? (
          <Chip
            size="small"
            label={course.grade_level}
            color="secondary"
            variant="outlined"
          />
        ) : null}
        {course.subject ? (
          <Chip size="small" label={course.subject} variant="outlined" />
        ) : null}
        <Chip
          size="small"
          icon={<MenuBookIcon />}
          label={`${lessons.length} lessons`}
        />
        <Chip
          size="small"
          icon={<QuizIcon />}
          label={`${quizzes.length} quizzes`}
        />
        <Chip
          size="small"
          icon={<SportsEsportsIcon />}
          label={`${games.length} games`}
        />
      </Stack>
      <ContentTimestamp
        item={course}
        variant="date"
        showUpdated={false}
        sx={{ mb: 2, mt: 0 }}
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      ) : null}

      {!course.is_published ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This course is not available for enrollment.
        </Alert>
      ) : null}

      <Stack spacing={2}>
        {enrolled ? (
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Learning Progress
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Based on completed lessons only. Reaching 100% does not mean your
              certificate is ready.
            </Typography>
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mb: 0.75 }}
            >
              <Typography variant="body2" fontWeight={700}>
                Lessons completed
              </Typography>
              <Typography variant="body2" fontWeight={800}>
                {learningProgressPercent}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, learningProgressPercent))}
              sx={{ height: 10, borderRadius: 999 }}
            />
          </Paper>
        ) : null}

        {enrolled ? (
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Certificate Requirements
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Certificate eligibility is separate from learning progress. Games
              are optional.
            </Typography>

            <Stack spacing={1} sx={{ mb: 2.5 }}>
              {requirementRows.map((row) => (
                <RequirementRow key={row.key} ok={row.ok} label={row.label} />
              ))}
            </Stack>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "action.hover",
                mb: 2,
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.75 }}
              >
                {certificateStatus.locked ? (
                  <LockIcon color="action" />
                ) : (
                  <WorkspacePremiumIcon color="secondary" />
                )}
                <Typography fontWeight={800}>
                  Certificate
                  {" · "}
                  {certificateStatus.locked
                    ? "🔒 Complete required items"
                    : "✓ Available"}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {certificateStatus.message}
              </Typography>
            </Box>

            {certificateStatus.certificateId ? (
              <Button
                component={RouterLink}
                to={`/student/certificates/${certificateStatus.certificateId}`}
                variant="contained"
              >
                View Certificate
              </Button>
            ) : null}
          </Paper>
        ) : canEnroll ? (
          <Alert severity="info">
            Enroll in this course to track learning progress and unlock
            certificate requirements.
          </Alert>
        ) : null}

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>
            Lessons
          </Typography>
          <List>
            {lessons.map((lesson) => (
              <ListItem
                key={lesson.id}
                alignItems="flex-start"
                secondaryAction={
                  enrolled ? (
                    <Button
                      component={RouterLink}
                      to={`/student/lessons/${lesson.id}`}
                    >
                      Open
                    </Button>
                  ) : (
                    <Chip size="small" label="Enroll to open" />
                  )
                }
              >
                <ListItemText
                  primary={lesson.title}
                  secondary={
                    <Stack
                      spacing={0.5}
                      sx={{ mt: 0.5, pr: { xs: 0, sm: 12 } }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        XP reward: {lesson.xp_reward || 25}
                      </Typography>
                      <ContentTimestamp
                        item={lesson}
                        variant="date"
                        showUpdated={false}
                        dense
                      />
                    </Stack>
                  }
                  secondaryTypographyProps={{ component: "div" }}
                />
                {enrolled ? (
                  <Chip
                    size="small"
                    label={String(lesson.status || "not_started").replace(/_/g, " ")}
                    sx={{ mr: { xs: 0, sm: 10 }, textTransform: "capitalize" }}
                  />
                ) : null}
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>
            Quizzes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Required quizzes count toward certificate eligibility, not the
            lesson progress bar.
          </Typography>
          <List>
            {quizzes.map((quiz) => {
              const quizStatus = eligibility?.quizzes?.items?.find(
                (item) => Number(item.id) === Number(quiz.id),
              );
              return (
                <ListItem
                  key={quiz.id}
                  alignItems="flex-start"
                  secondaryAction={
                    enrolled ? (
                      <Button
                        component={RouterLink}
                        to={`/student/quizzes/${quiz.id}`}
                      >
                        Take Quiz
                      </Button>
                    ) : (
                      <Chip size="small" label="Enroll to take" />
                    )
                  }
                >
                  <ListItemText
                    primary={
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Typography fontWeight={700}>{quiz.title}</Typography>
                        {quizStatus ? (
                          <Chip
                            size="small"
                            color={quizStatus.passed ? "success" : "warning"}
                            label={quizStatus.passed ? "Passed" : "Required"}
                          />
                        ) : null}
                      </Stack>
                    }
                    secondary={
                      <Stack
                        spacing={0.5}
                        sx={{ mt: 0.5, pr: { xs: 0, sm: 12 } }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {quiz.question_count || 0} questions ·{" "}
                          {quiz.xp_reward} XP
                        </Typography>
                        <ContentTimestamp
                          item={quiz}
                          variant="date"
                          showUpdated={false}
                          dense
                        />
                      </Stack>
                    }
                    secondaryTypographyProps={{ component: "div" }}
                  />
                </ListItem>
              );
            })}
          </List>
          {!quizzes.length ? (
            <Typography color="text.secondary">
              No quizzes published for this course.
            </Typography>
          ) : null}
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>
            Games
          </Typography>
          <List>
            {games.map((game) => (
              <ListItem
                key={game.id}
                alignItems="flex-start"
                secondaryAction={
                  enrolled ? (
                    <Button
                      component={RouterLink}
                      to={`/student/games/${game.id}`}
                    >
                      Play
                    </Button>
                  ) : (
                    <Chip size="small" label="Enroll to play" />
                  )
                }
              >
                <ListItemText
                  primary={game.title}
                  secondary={
                    <Stack
                      spacing={0.5}
                      sx={{ mt: 0.5, pr: { xs: 0, sm: 12 } }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textTransform: "capitalize" }}
                      >
                        {String(game.game_type || "").replace(/_/g, " ")}
                      </Typography>
                      <ContentTimestamp
                        item={game}
                        variant="date"
                        showUpdated={false}
                        dense
                      />
                    </Stack>
                  }
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Stack>
    </PageContainer>
  );
}

function RequirementRow({ ok, label }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {ok ? (
        <CheckCircleIcon color="success" fontSize="small" />
      ) : (
        <CancelIcon color="error" fontSize="small" />
      )}
      <Typography variant="body2" fontWeight={700}>
        {label}
      </Typography>
    </Stack>
  );
}
