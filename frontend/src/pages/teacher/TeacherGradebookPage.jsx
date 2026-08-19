import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import TeacherQuizAttemptReviewDialog from "../../components/quiz/TeacherQuizAttemptReviewDialog";
import TeacherQuizExtendDialog from "../../components/quiz/TeacherQuizExtendDialog";
import TeacherGameScoreReviewDialog from "../../components/games/TeacherGameScoreReviewDialog";
import TeacherGameExtendDialog from "../../components/games/TeacherGameExtendDialog";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";

function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatPoints(earned, total) {
  const earnedLabel = earned == null || earned === "" ? "—" : Number(earned);
  const totalLabel = total == null || total === "" ? "—" : Number(total);
  return `${earnedLabel} / ${totalLabel}`;
}

function sameId(a, b) {
  if (a == null || b == null || a === "" || b === "") return false;
  return Number(a) === Number(b);
}

export default function TeacherGradebookPage() {
  const { courseId } = useParams();
  const { toQueryParams, schoolYear, gradeLevel, section } = useTeacherFilters();
  const [gradebook, setGradebook] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendStudentId, setExtendStudentId] = useState("");
  const [gameReviewTarget, setGameReviewTarget] = useState(null);
  const [gameExtendOpen, setGameExtendOpen] = useState(false);
  const [gameExtendStudentId, setGameExtendStudentId] = useState("");

  function applyGradebook(data) {
    setGradebook(data);
    setSelectedQuizId((prev) => {
      if (prev !== "" && data.quizzes.some((quiz) => sameId(quiz.id, prev))) {
        return String(Number(prev));
      }
      return data.quizzes[0] != null ? String(Number(data.quizzes[0].id)) : "";
    });
    setSelectedGameId((prev) => {
      if (prev !== "" && data.games.some((game) => sameId(game.id, prev))) {
        return String(Number(prev));
      }
      return data.games[0] != null ? String(Number(data.games[0].id)) : "";
    });
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const filterParams = toQueryParams();
    Promise.all([
      courseService.gradebook(courseId, filterParams),
      courseService.enrollments(courseId, filterParams),
    ])
      .then(([gradebookRes, enrollRes]) => {
        if (!active) return;
        applyGradebook(gradebookRes.data.data);
        const list = enrollRes.data.data || [];
        setEnrollments(
          list.map((row) => ({
            id: row.student_id || row.studentId || row.id,
            firstName: row.first_name || row.firstName,
            lastName: row.last_name || row.lastName,
          })),
        );
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, schoolYear, gradeLevel, section, toQueryParams]);

  const selectedQuiz = useMemo(
    () =>
      gradebook?.quizzes?.find((quiz) => sameId(quiz.id, selectedQuizId)) ||
      null,
    [gradebook, selectedQuizId],
  );
  const selectedGame = useMemo(
    () =>
      gradebook?.games?.find((game) => sameId(game.id, selectedGameId)) || null,
    [gradebook, selectedGameId],
  );

  const quizResults = selectedQuiz?.results || [];
  const gameResults = selectedGame?.results || [];

  const title = useMemo(() => {
    if (!gradebook) return "Class Scores";
    return `${gradebook.course.subject || gradebook.course.title} · Scores`;
  }, [gradebook]);

  function downloadCsvReport() {
    if (!gradebook) return;
    const rows = [
      [
        "Type",
        "Assessment",
        "Student",
        "Email",
        "Score %",
        "Points",
        "Passed",
        "Submitted",
      ],
    ];

    for (const quiz of gradebook.quizzes || []) {
      for (const result of quiz.results || []) {
        rows.push([
          "Quiz",
          quiz.title,
          `${result.firstName || ""} ${result.lastName || ""}`.trim(),
          result.email || result.username || "",
          result.score ?? "",
          formatPoints(result.earnedPoints, result.totalPoints),
          result.passed ? "Yes" : "No",
          formatWhen(result.completedAt),
        ]);
      }
    }

    for (const game of gradebook.games || []) {
      for (const result of game.results || []) {
        rows.push([
          "Game",
          game.title,
          `${result.firstName || ""} ${result.lastName || ""}`.trim(),
          result.email || result.username || "",
          result.score ?? "",
          formatPoints(result.earnedPoints, result.totalPoints || 100),
          Number(result.score) >= 70 ? "Yes" : "No",
          formatWhen(result.playedAt || result.completedAt),
        ]);
      }
    }

    const csv = rows
      .map((cols) =>
        cols
          .map((value) => {
            const cell = String(value ?? "");
            if (/[",\n]/.test(cell)) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const subject =
      gradebook.course?.subject || gradebook.course?.title || "subject";
    anchor.href = url;
    anchor.download = `${subject.replace(/\s+/g, "-").toLowerCase()}-outcomes.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingScreen />;

  return (
    <PageContainer>
      <PageHeader
        title={title}
        subtitle="Choose a quiz or game to view scores. Open View answers to see each student’s responses."
        action={
          <Button
            component={RouterLink}
            to={`/teacher/courses/${courseId}`}
            startIcon={<ArrowBackIcon />}
            variant="outlined"
          >
            Back to Manage
          </Button>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {!gradebook ? null : (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${gradebook.summary.enrolledCount} enrolled`} />
            <Chip
              label={`${gradebook.summary.quizCount} quizzes`}
              variant="outlined"
            />
            <Chip
              label={`${gradebook.summary.gameCount} games`}
              variant="outlined"
            />
            <Button size="small" variant="outlined" onClick={downloadCsvReport}>
              Download CSV report
            </Button>
          </Stack>

          <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              sx={{ mb: 2 }}
            >
              <Tab label="Quizzes" />
              <Tab label="Games" />
            </Tabs>

            {tab === 0 ? (
              !gradebook.quizzes.length ? (
                <Typography color="text.secondary">
                  No quizzes in this subject yet.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="gradebook-quiz-label">Quiz</InputLabel>
                    <Select
                      labelId="gradebook-quiz-label"
                      label="Quiz"
                      value={selectedQuizId}
                      onChange={(event) =>
                        setSelectedQuizId(String(event.target.value))
                      }
                    >
                      {gradebook.quizzes.map((quiz) => (
                        <MenuItem key={quiz.id} value={String(Number(quiz.id))}>
                          {quiz.title}
                          {" · "}
                          {quiz.resultCount ?? (quiz.results || []).length}
                          {" student"}
                          {(quiz.resultCount ?? (quiz.results || []).length) ===
                          1
                            ? ""
                            : "s"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {!selectedQuiz ? (
                    <Typography color="text.secondary">
                      Choose a quiz to view scores.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      <Box>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "stretch", sm: "flex-start" }}
                          spacing={1}
                        >
                          <Box>
                            <Typography
                              variant="h6"
                              fontWeight={800}
                              color="text.primary"
                            >
                              {selectedQuiz.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Pass {selectedQuiz.passingScore}% · best attempt
                              per student
                              {selectedQuiz.dueAt || selectedQuiz.due_at
                                ? ` · Class due ${formatWhen(selectedQuiz.dueAt || selectedQuiz.due_at)}`
                                : ""}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={!enrollments.length}
                            onClick={() => {
                              setExtendStudentId("");
                              setExtendOpen(true);
                            }}
                          >
                            Extend / reopen
                          </Button>
                        </Stack>
                      </Box>

                      {!quizResults.length ? (
                        <Alert severity="info">
                          No students have taken this quiz yet. Use Extend /
                          reopen to grant makeup access.
                        </Alert>
                      ) : (
                        <TableContainer sx={{ overflowX: "auto" }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 800 }}>
                                  Student
                                </TableCell>
                                <TableCell
                                  sx={{ fontWeight: 800 }}
                                  align="center"
                                >
                                  Grade score
                                </TableCell>
                                <TableCell
                                  sx={{ fontWeight: 800 }}
                                  align="center"
                                >
                                  Status
                                </TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>
                                  Completed
                                </TableCell>
                                <TableCell
                                  sx={{ fontWeight: 800 }}
                                  align="right"
                                >
                                  Actions
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {quizResults.map((result) => (
                                <TableRow key={result.studentId} hover>
                                  <TableCell>
                                    <Typography fontWeight={700}>
                                      {result.firstName} {result.lastName}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {result.attemptCount} attempt
                                      {result.attemptCount === 1 ? "" : "s"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography fontWeight={800}>
                                      {formatPoints(
                                        result.earnedPoints,
                                        result.totalPoints ||
                                          selectedQuiz.maxPoints,
                                      )}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                    >
                                      {result.score != null
                                        ? `${Number(result.score).toFixed(1)}%`
                                        : "—"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      size="small"
                                      label={
                                        result.passed ? "Passed" : "Not passed"
                                      }
                                      color={
                                        result.passed ? "success" : "default"
                                      }
                                      variant={
                                        result.passed ? "filled" : "outlined"
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {formatWhen(result.completedAt)}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      justifyContent="flex-end"
                                      flexWrap="wrap"
                                      useFlexGap
                                    >
                                      {result.attemptId ? (
                                        <Link
                                          component="button"
                                          type="button"
                                          underline="hover"
                                          onClick={() =>
                                            setReviewTarget({
                                              quizId: selectedQuiz.id,
                                              attemptId: result.attemptId,
                                            })
                                          }
                                        >
                                          View answers
                                        </Link>
                                      ) : null}
                                      <Link
                                        component="button"
                                        type="button"
                                        underline="hover"
                                        onClick={() => {
                                          setExtendStudentId(
                                            String(result.studentId),
                                          );
                                          setExtendOpen(true);
                                        }}
                                      >
                                        Extend
                                      </Link>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Stack>
                  )}
                </Stack>
              )
            ) : null}

            {tab === 1 ? (
              !gradebook.games.length ? (
                <Typography color="text.secondary">
                  No games in this subject yet.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="gradebook-game-label">Game</InputLabel>
                    <Select
                      labelId="gradebook-game-label"
                      label="Game"
                      value={selectedGameId}
                      onChange={(event) =>
                        setSelectedGameId(String(event.target.value))
                      }
                    >
                      {gradebook.games.map((game) => (
                        <MenuItem key={game.id} value={String(Number(game.id))}>
                          {game.title}
                          {" · "}
                          {game.resultCount ?? (game.results || []).length}
                          {" student"}
                          {(game.resultCount ?? (game.results || []).length) ===
                          1
                            ? ""
                            : "s"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {!selectedGame ? (
                    <Typography color="text.secondary">
                      Choose a game to view scores.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      <Box>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "stretch", sm: "flex-start" }}
                          spacing={1}
                        >
                          <Box>
                            <Typography
                              variant="h6"
                              fontWeight={800}
                              color="text.primary"
                            >
                              {selectedGame.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Pass 70% · best score per student · 3 attempts
                              default
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={!enrollments.length}
                            onClick={() => {
                              setGameExtendStudentId("");
                              setGameExtendOpen(true);
                            }}
                          >
                            Extend / reopen
                          </Button>
                        </Stack>
                      </Box>

                      {!gameResults.length ? (
                        <Alert severity="info">
                          No students have played this game yet. Use Extend /
                          reopen to grant extra attempts.
                        </Alert>
                      ) : (
                        <TableContainer sx={{ overflowX: "auto" }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 800 }}>
                                  Student
                                </TableCell>
                                <TableCell
                                  sx={{ fontWeight: 800 }}
                                  align="center"
                                >
                                  Grade score
                                </TableCell>
                                <TableCell
                                  sx={{ fontWeight: 800 }}
                                  align="center"
                                >
                                  Status
                                </TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>
                                  Played
                                </TableCell>
                                <TableCell
                                  sx={{ fontWeight: 800 }}
                                  align="right"
                                >
                                  Actions
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {gameResults.map((result) => {
                                const passed = Number(result.score) >= 70;
                                return (
                                  <TableRow key={result.studentId} hover>
                                    <TableCell>
                                      <Typography fontWeight={700}>
                                        {result.firstName} {result.lastName}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {result.playCount} play
                                        {result.playCount === 1 ? "" : "s"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography fontWeight={800}>
                                        {formatPoints(
                                          result.earnedPoints,
                                          result.totalPoints || 100,
                                        )}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        display="block"
                                      >
                                        {result.score != null
                                          ? `${Number(result.score).toFixed(1)}%`
                                          : "—"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        size="small"
                                        label={
                                          passed ? "Passed" : "Not passed"
                                        }
                                        color={passed ? "success" : "default"}
                                        variant={
                                          passed ? "filled" : "outlined"
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {formatWhen(result.playedAt)}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        justifyContent="flex-end"
                                        flexWrap="wrap"
                                        useFlexGap
                                      >
                                        {result.scoreId ? (
                                          <Link
                                            component="button"
                                            type="button"
                                            underline="hover"
                                            onClick={() =>
                                              setGameReviewTarget({
                                                gameId: selectedGame.id,
                                                scoreId: result.scoreId,
                                              })
                                            }
                                          >
                                            View answers
                                          </Link>
                                        ) : null}
                                        <Link
                                          component="button"
                                          type="button"
                                          underline="hover"
                                          onClick={() => {
                                            setGameExtendStudentId(
                                              String(result.studentId),
                                            );
                                            setGameExtendOpen(true);
                                          }}
                                        >
                                          Extend
                                        </Link>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Stack>
                  )}
                </Stack>
              )
            ) : null}
          </Paper>
        </Stack>
      )}

      <TeacherQuizAttemptReviewDialog
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        quizId={reviewTarget?.quizId}
        attemptId={reviewTarget?.attemptId}
      />

      <TeacherQuizExtendDialog
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        quiz={selectedQuiz}
        students={enrollments}
        initialStudentId={extendStudentId}
        onGranted={() => setError("")}
      />

      <TeacherGameScoreReviewDialog
        open={Boolean(gameReviewTarget)}
        onClose={() => setGameReviewTarget(null)}
        gameId={gameReviewTarget?.gameId}
        scoreId={gameReviewTarget?.scoreId}
      />

      <TeacherGameExtendDialog
        open={gameExtendOpen}
        onClose={() => setGameExtendOpen(false)}
        game={selectedGame}
        students={enrollments}
        initialStudentId={gameExtendStudentId}
        onGranted={() => setError("")}
      />
    </PageContainer>
  );
}
