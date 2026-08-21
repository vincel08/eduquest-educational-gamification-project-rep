import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { getErrorMessage } from "../../services/api";
import {
  computeLearningProgressPercent,
  summarizeLessonStatuses,
} from "../../utils/courseProgressDisplay";
import { formatGameTypeLabel } from "../../utils/gameTypes";

export default function StudentCourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [games, setGames] = useState([]);
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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const lessonSummary = useMemo(
    () => summarizeLessonStatuses(lessons),
    [lessons],
  );

  const learningProgressPercent = useMemo(() => {
    if (!enrolled) return 0;
    if (lessons.length) return computeLearningProgressPercent(lessons);
    return Number(enrolledProgress || 0);
  }, [enrolled, lessons, enrolledProgress]);

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
        title={course.subject || course.title}
        subtitle={course.description || "Subject overview"}
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
          This subject is not available for enrollment.
        </Alert>
      ) : null}

      <Stack spacing={2}>
        {enrolled ? (
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Learning Progress
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Based on completed lessons.{" "}
              {lessonSummary.total
                ? `${lessonSummary.completed} of ${lessonSummary.total} lessons completed.`
                : "No lessons yet."}
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
        ) : canEnroll ? (
          <Alert severity="info">
            Enroll in this subject to track learning progress and access lessons,
            quizzes, and games.
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
                      {lesson.competency ? (
                        <Typography variant="body2" color="text.secondary">
                          Competency: {lesson.competency}
                        </Typography>
                      ) : null}
                      <Typography variant="body2" color="text.secondary">
                        XP reward: {lesson.xp_reward || 25} (student progress)
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
                    label={String(lesson.status || "not_started").replace(
                      /_/g,
                      " ",
                    )}
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
            Finish the required lesson(s) first. Quizzes unlock after lesson
            completion.
          </Typography>
          <List>
            {quizzes.map((quiz) => {
              const locked = Boolean(quiz.locked);
              const closed = Boolean(quiz.isClosed);
              const outOfAttempts = Boolean(quiz.outOfAttempts);
              const gradeReleased = Boolean(quiz.gradeReleased);
              const blocked =
                locked ||
                closed ||
                outOfAttempts ||
                gradeReleased ||
                Boolean(quiz.unavailable);
              let actionChip = null;
              if (!enrolled) {
                actionChip = <Chip size="small" label="Enroll to take" />;
              } else if (locked) {
                actionChip = (
                  <Chip size="small" color="warning" label="Locked" />
                );
              } else if (closed) {
                actionChip = (
                  <Chip size="small" color="warning" label="Closed" />
                );
              } else if (gradeReleased) {
                actionChip = (
                  <Chip size="small" color="success" label="Submitted" />
                );
              } else if (outOfAttempts) {
                actionChip = (
                  <Chip size="small" color="warning" label="No attempts" />
                );
              }
              return (
                <ListItem
                  key={quiz.id}
                  alignItems="flex-start"
                  secondaryAction={
                    actionChip || (
                      <Button
                        component={RouterLink}
                        to={`/student/quizzes/${quiz.id}`}
                      >
                        {quiz.hasAttempted
                          ? quiz.attemptsRemaining > 0
                            ? "Retake"
                            : "View"
                          : "Take Quiz"}
                      </Button>
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
                        {quiz.hasPassed ? (
                          <Chip
                            size="small"
                            color="success"
                            label={
                              quiz.bestScore != null
                                ? `Passed · ${Number(quiz.bestScore).toFixed(0)}%`
                                : "Passed"
                            }
                          />
                        ) : null}
                        {quiz.attemptsRemaining != null && !blocked ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${quiz.attemptsRemaining} attempt(s) left`}
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
                          {quiz.question_count || 0} questions · {quiz.xp_reward}{" "}
                          XP
                          {quiz.dueAt || quiz.due_at
                            ? ` · Due ${new Date(quiz.dueAt || quiz.due_at).toLocaleString()}`
                            : ""}
                        </Typography>
                        {locked && quiz.unlockMessage ? (
                          <Typography variant="body2" color="warning.main">
                            {quiz.unlockMessage}
                          </Typography>
                        ) : null}
                        {closed ? (
                          <Typography variant="body2" color="warning.main">
                            This quiz is closed (past due date or school year
                            ended).
                          </Typography>
                        ) : null}
                        {outOfAttempts ? (
                          <Typography variant="body2" color="warning.main">
                            You used all attempts for this quiz.
                          </Typography>
                        ) : null}
                        {gradeReleased ? (
                          <Typography variant="body2" color="success.main">
                            Grade submitted — this quiz is no longer available.
                          </Typography>
                        ) : null}
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
              No quizzes published for this subject.
            </Typography>
          ) : null}
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>
            Games
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Games unlock after you finish the required lessons.
          </Typography>
          <List>
            {games.map((game) => {
              const locked = Boolean(game.locked);
              const outOfAttempts = Boolean(game.outOfAttempts);
              const gradeReleased = Boolean(game.gradeReleased);
              const blocked =
                locked ||
                outOfAttempts ||
                gradeReleased ||
                Boolean(game.unavailable);
              let actionChip = null;
              if (!enrolled) {
                actionChip = <Chip size="small" label="Enroll to play" />;
              } else if (locked) {
                actionChip = (
                  <Chip size="small" color="warning" label="Locked" />
                );
              } else if (gradeReleased) {
                actionChip = (
                  <Chip size="small" color="success" label="Submitted" />
                );
              } else if (outOfAttempts) {
                actionChip = (
                  <Chip size="small" color="warning" label="No attempts" />
                );
              }
              return (
                <ListItem
                  key={game.id}
                  alignItems="flex-start"
                  secondaryAction={
                    actionChip || (
                      <Button
                        component={RouterLink}
                        to={`/student/games/${game.id}`}
                      >
                        {game.hasAttempted
                          ? game.attemptsRemaining > 0
                            ? "Play again"
                            : "View"
                          : "Play"}
                      </Button>
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
                        >
                          {formatGameTypeLabel(game.game_type)}
                          {game.attemptsRemaining != null
                            ? ` · ${game.attemptsRemaining} attempt(s) left`
                            : ""}
                          {game.hasPassed
                            ? ` · Passed${game.bestScore != null ? ` (${Number(game.bestScore).toFixed(0)}%)` : ""}`
                            : game.bestScore != null
                              ? ` · Best ${Number(game.bestScore).toFixed(0)}%`
                              : ""}
                        </Typography>
                        {locked && game.unlockMessage ? (
                          <Typography variant="body2" color="warning.main">
                            {game.unlockMessage}
                          </Typography>
                        ) : null}
                        {outOfAttempts ? (
                          <Typography variant="body2" color="warning.main">
                            You used all attempts for this game.
                          </Typography>
                        ) : null}
                        {gradeReleased ? (
                          <Typography variant="body2" color="success.main">
                            Grade submitted — this game is no longer available.
                          </Typography>
                        ) : null}
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
              );
            })}
          </List>
        </Paper>
      </Stack>
    </PageContainer>
  );
}
