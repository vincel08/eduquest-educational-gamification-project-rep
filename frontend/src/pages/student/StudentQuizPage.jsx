import { useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BoltIcon from '@mui/icons-material/Bolt';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import quizService from '../../services/quizService';
import { getErrorMessage } from '../../services/api';
import { celebrateAchievement } from '../../utils/confetti';
import { pickMotivationalMessage } from '../../utils/feedbackMessages';
import { playSound, SOUND_KEYS } from '../../utils/soundEffects';
import { useAuth } from '../../contexts/AuthContext';
import { buildAuthenticatedFileUrl } from '../../utils/fileUrls';
import { useRewards } from '../../contexts/RewardsContext';

export default function StudentQuizPage() {
  const { quizId } = useParams();
  const { updateProfile } = useAuth();
  const { notifyReward } = useRewards();
  const [quiz, setQuiz] = useState(null);
  const [motivation, setMotivation] = useState('');
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await quizService.start(quizId);
        setQuiz(response.data.data.quiz);
        setQuestions(response.data.data.questions);
        setAttemptId(response.data.data.attempt.id);
        setStartedAt(Date.now());
        setReviewMode(false);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [quizId]);

  function formatDuration(ms) {
    if (!ms || ms < 0) return '—';
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

  async function handleHint(question) {
    try {
      const response = await quizService.hint({
        questionText: question.question_text,
        topic: quiz.title,
      });
      setHint(response.data.data.hint);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function setOptionAnswer(questionId, optionId) {
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
    setSubmitting(true);
    setError('');
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
      setMotivation(pickMotivationalMessage());
      playSound(SOUND_KEYS.quizComplete);
      if (data.xpAward?.profile) {
        updateProfile(data.xpAward.profile);
      }
      notifyReward({
        xpEarned: data.attempt?.xp_earned || data.xpAward?.amount || 0,
        badges: data.xpAward?.newlyUnlocked?.badges || [],
        medals: data.xpAward?.newlyUnlocked?.medals || [],
        certificate: data.certificate || null,
        celebrateWin: Boolean(data.isPassed),
      });
      if (data.perfect) celebrateAchievement();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(question, index) {
    const type = question.question_type || 'multiple_choice';
    const answer = answers[question.id] || {};
    const locked = Boolean(reviewMode);

    if (type === 'identification') {
      return (
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={900}>
            {index + 1}. {question.question_text}
          </Typography>
          <TextField
            fullWidth
            label="Your answer"
            value={answer.textAnswer || ''}
            disabled={locked}
            onChange={(event) => setTextAnswer(question.id, event.target.value)}
          />
        </Stack>
      );
    }

    if (type === 'matching') {
      const leftOptions = question.options.filter((option) => option.side === 'left');
      const rightOptions = question.options.filter((option) => option.side === 'right');
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
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: { sm: 'center' } }}
              >
                <Typography sx={{ minWidth: { sm: 180 } }} fontWeight={700}>{left.option_text}</Typography>
                <TextField
                  select
                  size="small"
                  label="Match with"
                  value={payload[String(left.id)] || ''}
                  disabled={locked}
                  onChange={(event) => setMatchingAnswer(question.id, left.id, event.target.value)}
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

        {type === 'image_question' ? (
          question.image_url ? (
            <Box
              component="img"
              src={buildAuthenticatedFileUrl(question.image_url)}
              alt="Question visual"
              sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: 3, display: 'block' }}
            />
          ) : (
            <Alert severity="info">
              Image not attached yet. Answer based on the question text.
            </Alert>
          )
        ) : null}

        <RadioGroup
          value={answer.selectedOptionId || ''}
          onChange={(event) => setOptionAnswer(question.id, event.target.value)}
        >
          {question.options.map((option) => (
            <FormControlLabel
              key={option.id}
              value={option.id}
              className="answer-choice"
              disabled={locked}
              control={<Radio />}
              label={<Typography fontWeight={800}>{option.option_text}</Typography>}
              sx={{ mx: 0, width: '100%' }}
            />
          ))}
        </RadioGroup>
      </Stack>
    );
  }

  if (loading) return <LoadingScreen />;
  if (error && !quiz) return <Alert severity="error">{error}</Alert>;

  const question = questions[currentIndex];

  return (
    <>
      <PageHeader title={quiz.title} subtitle={quiz.description} />
      <ContentTimestamp item={quiz} variant="date" showUpdated={false} sx={{ mb: 2, mt: 0 }} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {hint ? (
        <Alert severity="info" icon={<LightbulbIcon />} sx={{ mb: 2 }}>
          {hint}
        </Alert>
      ) : null}

      {result && !reviewMode ? (
        <Paper
          component={motion.div}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="eq-fade-in"
          sx={{
            p: { xs: 3, md: 4 },
            textAlign: 'center',
            background: 'linear-gradient(145deg, rgba(59,130,246,0.1), rgba(139,92,246,0.12))',
            borderRadius: 4,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 72, color: result.isPassed ? 'success.main' : 'warning.main', mb: 1 }} />
          <Typography variant="h3" fontWeight={800} gutterBottom>
            {result.isPassed ? 'Quest Complete!' : 'Keep Going!'}
          </Typography>
          <Typography variant="h6" color="secondary.main" fontWeight={700} sx={{ mb: 1 }}>
            {motivation || 'Excellent work!'}
          </Typography>
          <Typography variant="h2" fontWeight={800} color="primary.main" sx={{ mb: 0.5, fontSize: { xs: '2.4rem', md: '3rem' } }}>
            {result.score}%
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {result.attempt?.earned_points ?? '—'} / {result.attempt?.total_points ?? '—'} points · {formatDuration(result.timeTakenMs)}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip label={result.isPassed ? 'Passed' : 'Not passed yet'} color={result.isPassed ? 'success' : 'warning'} />
            {result.attempt?.xp_earned ? (
              <Chip icon={<BoltIcon />} label={`+${result.attempt.xp_earned} XP`} sx={{ bgcolor: 'rgba(250,204,21,0.28)', fontWeight: 800 }} />
            ) : result.xpAlreadyAwarded ? (
              <Chip label="XP already earned earlier" variant="outlined" />
            ) : null}
            {(result.xpAward?.newlyUnlocked?.badges || []).length ? (
              <Chip color="secondary" label={`${result.xpAward.newlyUnlocked.badges.length} badge(s) unlocked`} />
            ) : null}
            {result.perfectMedalAwarded ? (
              <Chip color="warning" label="Perfect score medal!" />
            ) : null}
          </Stack>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
            {result.isPassed
              ? 'Amazing work — rewards are saved to your profile.'
              : 'Review the material and try again to pass. Friendly tip: focus on the missed questions.'}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center">
            <Button variant="outlined" onClick={() => { setReviewMode(true); setCurrentIndex(0); }}>
              Review Answers
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setResult(null);
                setReviewMode(false);
                setAnswers({});
                setCurrentIndex(0);
                setHint('');
                setMotivation('');
                setLoading(true);
                quizService.start(quizId)
                  .then((response) => {
                    setQuiz(response.data.data.quiz);
                    setQuestions(response.data.data.questions);
                    setAttemptId(response.data.data.attempt.id);
                    setStartedAt(Date.now());
                  })
                  .catch((err) => setError(getErrorMessage(err)))
                  .finally(() => setLoading(false));
              }}
            >
              Retry Quiz
            </Button>
            <Button component={RouterLink} to="/student/quizzes" variant="contained">
              Continue Learning
            </Button>
          </Stack>
        </Paper>
      ) : result && reviewMode ? (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
              <Typography fontWeight={900}>
                Review · Question {currentIndex + 1} of {questions.length}
              </Typography>
              <Button size="small" onClick={() => setReviewMode(false)}>Back to Results</Button>
            </Stack>
          </Paper>
          <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
            {questions[currentIndex] ? renderQuestion(questions[currentIndex], currentIndex) : null}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Your submitted answers are shown above. Correct keys stay hidden until your teacher reviews them.
            </Typography>
          </Paper>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
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
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
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
      ) : (
        <Stack spacing={2} className="eq-page">
          <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap spacing={1}>
              <Typography fontWeight={800}>
                Question {currentIndex + 1} of {questions.length}
              </Typography>
              <Stack direction="row" spacing={1}>
                {quiz.time_limit_minutes ? (
                  <Chip size="small" variant="outlined" label={`${quiz.time_limit_minutes} min limit`} />
                ) : null}
                <Chip size="small" label={`${progress}%`} color="primary" />
              </Stack>
            </Stack>
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
              <Button
                sx={{ mt: 2 }}
                size="small"
                startIcon={<LightbulbIcon />}
                onClick={() => handleHint(question)}
              >
                Get AI Hint
              </Button>
            </Paper>
          </AnimatePresence>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="outlined"
              disabled={currentIndex === 0}
              onClick={() => {
                setHint('');
                setCurrentIndex((i) => Math.max(0, i - 1));
              }}
            >
              Previous
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => {
                  setHint('');
                  setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
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
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            )}
          </Stack>
        </Stack>
      )}
    </>
  );
}
