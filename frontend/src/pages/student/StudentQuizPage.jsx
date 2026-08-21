import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import BoltIcon from "@mui/icons-material/Bolt";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import quizService from "../../services/quizService";
import { getErrorMessage } from "../../services/api";
import { celebrateAchievement } from "../../utils/confetti";
import { pickMotivationalMessage } from "../../utils/feedbackMessages";
import { playSound, SOUND_KEYS, unlockAudio } from "../../utils/soundEffects";
import SoundToggle from "../../components/games/SoundToggle";
import SessionTimerBar from "../../components/games/SessionTimerBar";
import useSessionCountdown from "../../hooks/useSessionCountdown";
import { useAuth } from "../../contexts/AuthContext";
import { buildAuthenticatedFileUrl } from "../../utils/fileUrls";
import { useRewards } from "../../contexts/RewardsContext";

export default function StudentQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const { notifyReward } = useRewards();
  const [quiz, setQuiz] = useState(null);
  const [motivation, setMotivation] = useState("");
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [releasingGrade, setReleasingGrade] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [attemptMeta, setAttemptMeta] = useState({
    attemptsUsed: 0,
    attemptsRemaining: 3,
    maxAttempts: 3,
    dueAt: null,
    isClosed: false,
    outOfAttempts: false,
    hasOverride: false,
    extraAttempts: 0,
  });
  const submitOnceRef = useRef(false);
  const handleSubmitRef = useRef(null);

  function applyStartPayload(data) {
    setQuiz(data.quiz);
    setQuestions(data.questions);
    setAttemptId(data.attempt.id);
    setStartedAt(Date.now());
    setReviewMode(false);
    submitOnceRef.current = false;
    setAttemptMeta({
      attemptsUsed: data.attemptsUsed ?? 0,
      attemptsRemaining: data.attemptsRemaining ?? 3,
      maxAttempts: data.maxAttempts ?? 3,
      dueAt: data.dueAt ?? data.quiz?.due_at ?? null,
      isClosed: Boolean(data.isClosed),
      outOfAttempts: Boolean(data.outOfAttempts),
      hasOverride: Boolean(data.hasOverride),
      extraAttempts: Number(data.extraAttempts || 0),
    });
  }

  useEffect(() => {
    async function load() {
      try {
        const response = await quizService.start(quizId);
        applyStartPayload(response.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [quizId]);

  function formatDuration(ms) {
    if (!ms || ms < 0) return "—";
    const totalSec = Math.round(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins <= 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  }

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round(((currentIndex + 1) / questions.length) * 100);
  }, [currentIndex, questions.length]);

  function setOptionAnswer(questionId, optionId) {
    unlockAudio();
    playSound(SOUND_KEYS.click);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selectedOptionId: Number(optionId) },
    }));
  }

  function setTextAnswer(questionId, textAnswer) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { textAnswer },
    }));
  }

  function setMatchingAnswer(questionId, leftOptionId, rightOptionId) {
    setAnswers((prev) => {
      const current = prev[questionId]?.answerPayload || {};
      return {
        ...prev,
        [questionId]: {
          answerPayload: {
            ...current,
            [String(leftOptionId)]: Number(rightOptionId),
          },
        },
      };
    });
  }

  async function handleSubmit() {
    if (submitting || result) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = questions.map((question) => {
        const answer = answers[question.id] || {};
        return {
          questionId: question.id,
          selectedOptionId: answer.selectedOptionId || null,
          textAnswer: answer.textAnswer || null,
          answerPayload: answer.answerPayload || null,
        };
      });
      const response = await quizService.submit(attemptId, payload);
      const data = response.data.data;
      const timeTakenMs = startedAt ? Date.now() - startedAt : null;
      setResult({ ...data, timeTakenMs });
      setAttemptMeta({
        attemptsUsed: data.attemptsUsed ?? attemptMeta.attemptsUsed + 1,
        attemptsRemaining: data.attemptsRemaining ?? 0,
        maxAttempts: data.maxAttempts ?? 3,
        dueAt: data.dueAt ?? attemptMeta.dueAt ?? null,
        isClosed: Boolean(data.isClosed),
        outOfAttempts: Boolean(data.outOfAttempts),
        hasOverride: Boolean(data.hasOverride),
        extraAttempts: Number(data.extraAttempts || 0),
      });
      setMotivation(data.isPassed ? pickMotivationalMessage() : "");
      playSound(SOUND_KEYS.quizComplete);
      if (data.xpAward?.profile) {
        updateProfile(data.xpAward.profile);
      }
      notifyReward({
        xpEarned: data.isPassed
          ? data.attempt?.xp_earned || data.xpAward?.amount || 0
          : 0,
        badges: data.isPassed
          ? data.xpAward?.newlyUnlocked?.badges || []
          : [],
        medals: data.isPassed
          ? data.xpAward?.newlyUnlocked?.medals || []
          : [],
        celebrateWin: Boolean(data.isPassed),
      });
      if (data.isPassed && data.perfect) celebrateAchievement();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }
  handleSubmitRef.current = handleSubmit;

  async function handleKeepScore() {
    setReleasingGrade(true);
    setError("");
    try {
      if (!result?.releasedToGradebook) {
        await quizService.releaseGrade(quizId);
        setResult((prev) =>
          prev ? { ...prev, releasedToGradebook: true } : prev,
        );
        setAttemptMeta((prev) => ({
          ...prev,
          gradeReleased: true,
          unavailable: true,
        }));
      }
      navigate("/student/quizzes");
    } catch (err) {
      setError(getErrorMessage(err));
      setReleasingGrade(false);
    }
  }

  function renderQuestion(question, index) {
    const type = question.question_type || "multiple_choice";
    const answer = answers[question.id] || {};
    const locked = Boolean(reviewMode);

    if (type === "identification") {
      return (
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={900}>
            {index + 1}. {question.question_text}
          </Typography>
          <TextField
            fullWidth
            label="Your answer"
            value={answer.textAnswer || ""}
            disabled={locked}
            onChange={(event) => setTextAnswer(question.id, event.target.value)}
          />
        </Stack>
      );
    }

    if (type === "matching") {
      const leftOptions = question.options.filter(
        (option) => option.side === "left",
      );
      const rightOptions = question.options.filter(
        (option) => option.side === "right",
      );
      const payload = answer.answerPayload || {};

      return (
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={900}>
            {index + 1}. {question.question_text}
          </Typography>
          <Stack spacing={1.5}>
            {leftOptions.map((left) => (
              <Stack
                key={left.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ alignItems: { sm: "center" } }}
              >
                <Typography sx={{ minWidth: { sm: 180 } }} fontWeight={700}>
                  {left.option_text}
                </Typography>
                <TextField
                  select
                  size="small"
                  label="Match with"
                  value={payload[String(left.id)] || ""}
                  disabled={locked}
                  onChange={(event) =>
                    setMatchingAnswer(question.id, left.id, event.target.value)
                  }
                  sx={{ minWidth: 220 }}
                >
                  {rightOptions.map((right) => (
                    <MenuItem key={right.id} value={right.id}>
                      {right.option_text}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            ))}
          </Stack>
        </Stack>
      );
    }

    return (
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={900}>
          {index + 1}. {question.question_text}
        </Typography>

        {type === "image_question" ? (
          question.image_url ? (
            <Box
              component="img"
              src={buildAuthenticatedFileUrl(question.image_url)}
              alt="Question visual"
              sx={{
                maxWidth: "100%",
                maxHeight: 260,
                borderRadius: 3,
                display: "block",
              }}
            />
          ) : (
            <Alert severity="info">
              Image not attached yet. Answer based on the question text.
            </Alert>
          )
        ) : null}

        <RadioGroup
          value={answer.selectedOptionId || ""}
          onChange={(event) => setOptionAnswer(question.id, event.target.value)}
        >
          {question.options.map((option) => (
            <FormControlLabel
              key={option.id}
              value={option.id}
              className="answer-choice"
              disabled={locked}
              control={<Radio />}
              label={
                <Typography fontWeight={800}>{option.option_text}</Typography>
              }
              sx={{ mx: 0, width: "100%" }}
            />
          ))}
        </RadioGroup>
      </Stack>
    );
  }

  const question = questions[currentIndex];
  const startBlocked =
    Boolean(attemptMeta.isClosed) || Boolean(attemptMeta.outOfAttempts);
  const quizActive = Boolean(
    quiz && questions.length && !result && !reviewMode && !startBlocked && !loading,
  );
  const countdown = useSessionCountdown(quiz?.time_limit_minutes, {
    enabled: quizActive && !submitting,
    onExpire: () => {
      if (submitOnceRef.current) return;
      submitOnceRef.current = true;
      handleSubmitRef.current?.();
    },
    fallbackMinutes: 15,
  });

  if (loading) return <LoadingScreen />;
  if (error && !quiz) {
    return (
      <Stack spacing={2}>
        <PageHeader
          title="Quiz unavailable"
          subtitle="This quiz may be locked, closed, or out of attempts."
        />
        <Alert severity="warning">{error}</Alert>
        <Button component={RouterLink} to="/student/courses" variant="contained">
          Back to subjects
        </Button>
      </Stack>
    );
  }

  return (
    <>
      <PageHeader title={quiz.title} subtitle={quiz.description} />
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
        <SoundToggle gameType="quiz_show" />
      </Stack>
      <ContentTimestamp
        item={quiz}
        variant="date"
        showUpdated={false}
        sx={{ mb: 2, mt: 0 }}
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 2 }}
      >
        <Chip
          size="small"
          label={`Attempts ${attemptMeta.attemptsUsed}/${attemptMeta.maxAttempts}`}
          variant="outlined"
        />
        {attemptMeta.hasOverride ? (
          <Chip size="small" color="info" label="Extended access" />
        ) : null}
        {attemptMeta.extraAttempts > 0 ? (
          <Chip
            size="small"
            variant="outlined"
            label={`+${attemptMeta.extraAttempts} extra`}
          />
        ) : null}
        {attemptMeta.dueAt ? (
          <Chip
            size="small"
            color={attemptMeta.isClosed ? "warning" : "default"}
            label={
              attemptMeta.isClosed
                ? "Closed"
                : `Due ${new Date(attemptMeta.dueAt).toLocaleString()}`
            }
          />
        ) : null}
        {attemptMeta.outOfAttempts ? (
          <Chip size="small" color="warning" label="No attempts left" />
        ) : null}
      </Stack>

      {result && !reviewMode ? (
        <Paper
          component={motion.div}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="eq-fade-in"
          sx={{
            p: { xs: 3, md: 4 },
            textAlign: "center",
            background: result.isPassed
              ? "linear-gradient(145deg, rgba(59,130,246,0.1), rgba(139,92,246,0.12))"
              : "linear-gradient(145deg, rgba(239,68,68,0.08), rgba(245,158,11,0.1))",
            borderRadius: 4,
          }}
        >
          {result.isPassed ? (
            <CheckCircleIcon
              sx={{ fontSize: 72, color: "success.main", mb: 1 }}
            />
          ) : (
            <CancelIcon sx={{ fontSize: 72, color: "error.main", mb: 1 }} />
          )}
          <Typography variant="h3" fontWeight={800} gutterBottom>
            {result.isPassed ? "Quest Complete!" : "Not Passed"}
          </Typography>
          {result.isPassed ? (
            <Typography
              variant="h6"
              color="secondary.main"
              fontWeight={700}
              sx={{ mb: 1 }}
            >
              {motivation || "Excellent work!"}
            </Typography>
          ) : (
            <Typography
              variant="h6"
              color="error.main"
              fontWeight={700}
              sx={{ mb: 1 }}
            >
              Keep practicing — you can retry if attempts remain.
            </Typography>
          )}
          <Typography
            variant="h2"
            fontWeight={800}
            color="primary.main"
            sx={{ mb: 0.5, fontSize: { xs: "2.4rem", md: "3rem" } }}
          >
            {result.attempt?.earned_points ?? "—"} /{" "}
            {result.attempt?.total_points ?? "—"}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Grade score · {result.score}% · {formatDuration(result.timeTakenMs)}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 2 }}
          >
            <Chip
              label={result.isPassed ? "Passed" : "Failed"}
              color={result.isPassed ? "success" : "error"}
            />
            {result.isPassed && result.attempt?.xp_earned ? (
              <Chip
                icon={<BoltIcon />}
                label={`+${result.attempt.xp_earned} XP`}
                sx={{ bgcolor: "rgba(250,204,21,0.28)", fontWeight: 800 }}
              />
            ) : null}
            {result.isPassed && result.xpAlreadyAwarded ? (
              <Chip label="XP already earned earlier" variant="outlined" />
            ) : null}
            {!result.isPassed ? (
              <Chip label="No XP awarded" variant="outlined" color="default" />
            ) : null}
            {(result.xpAward?.newlyUnlocked?.badges || []).length ? (
              <Chip
                color="secondary"
                label={`${result.xpAward.newlyUnlocked.badges.length} badge(s) unlocked`}
              />
            ) : null}
            {result.perfectMedalAwarded ? (
              <Chip color="warning" label="Perfect score medal!" />
            ) : null}
          </Stack>
          <Typography
            color="text.secondary"
            sx={{ mb: 2, maxWidth: 520, mx: "auto" }}
          >
            {result.releasedToGradebook
              ? "Your result is now visible to your teacher (best score counts)."
              : result.isPassed
                ? attemptMeta.attemptsRemaining > 0
                  ? "You passed. Submit this grade to your teacher now, or use a remaining attempt first. Teachers only see a result after you submit or use all attempts."
                  : "Amazing work — your result was sent to your teacher because no attempts remain."
                : attemptMeta.attemptsRemaining > 0
                  ? "Not passed yet. Retry with a remaining attempt, or submit this grade to your teacher now. Teachers only see a result after you submit or use all attempts."
                  : "No attempts left — your best result was sent to your teacher."}
          </Typography>
          {!result.isPassed && (result.reviewItems || []).length ? (
            <Stack
              spacing={1}
              sx={{ textAlign: "left", maxWidth: 560, mx: "auto", mb: 3 }}
            >
              <Typography fontWeight={800}>Study pointers</Typography>
              {result.reviewItems.map((item) => (
                <Alert
                  key={item.questionId}
                  severity="info"
                  sx={{ textAlign: "left" }}
                >
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                    {item.questionText}
                  </Typography>
                  <Typography variant="body2">{item.pointer}</Typography>
                </Alert>
              ))}
            </Stack>
          ) : null}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Attempts used: {attemptMeta.attemptsUsed}/{attemptMeta.maxAttempts}
            {attemptMeta.attemptsRemaining === 0
              ? " · No retries left"
              : ` · ${attemptMeta.attemptsRemaining} left`}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="center"
          >
            <Button
              variant="outlined"
              onClick={() => {
                setReviewMode(true);
                setCurrentIndex(0);
              }}
            >
              Review Answers
            </Button>
            {attemptMeta.attemptsRemaining > 0 &&
            !attemptMeta.isClosed &&
            !result.releasedToGradebook ? (
              <Button
                variant="contained"
                color={result.isPassed ? "secondary" : "primary"}
                disabled={releasingGrade}
                onClick={() => {
                  setResult(null);
                  setReviewMode(false);
                  setAnswers({});
                  setCurrentIndex(0);
                  setMotivation("");
                  setLoading(true);
                  quizService
                    .start(quizId)
                    .then((response) => applyStartPayload(response.data.data))
                    .catch((err) => setError(getErrorMessage(err)))
                    .finally(() => setLoading(false));
                }}
              >
                {result.isPassed
                  ? `Use another attempt (${attemptMeta.attemptsRemaining} left)`
                  : `Retry quiz (${attemptMeta.attemptsRemaining} left)`}
              </Button>
            ) : null}
            <Button
              variant={
                attemptMeta.attemptsRemaining > 0 && !attemptMeta.isClosed
                  ? "outlined"
                  : "contained"
              }
              disabled={releasingGrade}
              onClick={handleKeepScore}
            >
              {releasingGrade
                ? "Submitting…"
                : result.releasedToGradebook
                  ? "Back to quizzes"
                  : result.isPassed
                    ? "Submit grade to teacher"
                    : "Submit this score to teacher"}
            </Button>
          </Stack>
        </Paper>
      ) : result && reviewMode ? (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              spacing={1}
            >
              <Typography fontWeight={900}>
                Review · Question {currentIndex + 1} of {questions.length}
              </Typography>
              <Button size="small" onClick={() => setReviewMode(false)}>
                Back to Results
              </Button>
            </Stack>
          </Paper>
          <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
            {questions[currentIndex]
              ? renderQuestion(questions[currentIndex], currentIndex)
              : null}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Your submitted answers are shown above. Correct answer keys stay
              hidden so retries stay fair.
            </Typography>
            {(result.reviewItems || [])
              .filter(
                (item) =>
                  Number(item.questionId) ===
                  Number(questions[currentIndex]?.id),
              )
              .map((item) => (
                <Alert key={item.questionId} severity="info" sx={{ mt: 2 }}>
                  {item.pointer}
                </Alert>
              ))}
          </Paper>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button
                variant="contained"
                onClick={() =>
                  setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
                }
              >
                Next
              </Button>
            ) : (
              <Button variant="contained" onClick={() => setReviewMode(false)}>
                Done Reviewing
              </Button>
            )}
          </Stack>
        </Stack>
      ) : startBlocked ? (
        <Alert severity="warning">
          {attemptMeta.isClosed
            ? "This quiz is closed (past due date or school year ended). Ask your teacher if you need an extension."
            : "You have used all attempts for this quiz. Ask your teacher if you need more."}
        </Alert>
      ) : (
        <Stack spacing={2} className="eq-page">
          <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
              flexWrap="wrap"
              useFlexGap
              spacing={1}
            >
              <Typography fontWeight={800}>
                Question {currentIndex + 1} of {questions.length}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  size="small"
                  variant="outlined"
                  color={countdown.isUrgent ? "error" : "default"}
                  label={`Time ${countdown.formatted}`}
                />
                <Chip size="small" label={`${progress}%`} color="primary" />
              </Stack>
            </Stack>
            <SessionTimerBar
              formatted={countdown.formatted}
              limitFormatted={countdown.limitFormatted}
              progress={countdown.progress}
              isUrgent={countdown.isUrgent}
            />
            <LinearProgress variant="determinate" value={progress} />
          </Paper>

          <AnimatePresence mode="wait">
            <Paper
              key={question?.id || currentIndex}
              component={motion.div}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              sx={{ p: { xs: 2.5, md: 3.5 } }}
            >
              {question ? renderQuestion(question, currentIndex) : null}
            </Paper>
          </AnimatePresence>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              disabled={currentIndex === 0}
              onClick={() => {
                setCurrentIndex((i) => Math.max(0, i - 1));
              }}
            >
              Previous
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => {
                  setCurrentIndex((i) =>
                    Math.min(questions.length - 1, i + 1),
                  );
                }}
              >
                Next Question
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                size="large"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            )}
          </Stack>
        </Stack>
      )}
    </>
  );
}
