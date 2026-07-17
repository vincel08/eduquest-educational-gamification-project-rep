import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import quizService from '../../services/quizService';
import { getErrorMessage } from '../../services/api';
import { celebrate, celebrateAchievement } from '../../utils/confetti';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:4000';

export default function StudentQuizPage() {
  const { quizId } = useParams();
  const { updateProfile } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await quizService.start(quizId);
        setQuiz(response.data.data.quiz);
        setQuestions(response.data.data.questions);
        setAttemptId(response.data.data.attempt.id);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [quizId]);

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
      setResult(response.data.data);
      if (response.data.data.xpAward?.profile) {
        updateProfile(response.data.data.xpAward.profile);
      }
      if (response.data.data.isPassed) celebrate();
      if (response.data.data.perfect) celebrateAchievement();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(question, index) {
    const type = question.question_type || 'multiple_choice';
    const answer = answers[question.id] || {};

    if (type === 'identification') {
      return (
        <Paper key={question.id} sx={{ p: 3 }}>
          <Typography fontWeight={800} gutterBottom>
            {index + 1}. {question.question_text}
          </Typography>
          <TextField
            fullWidth
            label="Your answer"
            value={answer.textAnswer || ''}
            onChange={(event) => setTextAnswer(question.id, event.target.value)}
            sx={{ mb: 1 }}
          />
          <Button size="small" onClick={() => handleHint(question)}>
            Get AI Hint
          </Button>
        </Paper>
      );
    }

    if (type === 'matching') {
      const leftOptions = question.options.filter((option) => option.side === 'left');
      const rightOptions = question.options.filter((option) => option.side === 'right');
      const payload = answer.answerPayload || {};

      return (
        <Paper key={question.id} sx={{ p: 3 }}>
          <Typography fontWeight={800} gutterBottom>
            {index + 1}. {question.question_text}
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 1 }}>
            {leftOptions.map((left) => (
              <Stack
                key={left.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: { sm: 'center' } }}
              >
                <Typography sx={{ minWidth: { sm: 180 } }}>{left.option_text}</Typography>
                <TextField
                  select
                  size="small"
                  label="Match with"
                  value={payload[String(left.id)] || ''}
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
          <Button size="small" onClick={() => handleHint(question)}>
            Get AI Hint
          </Button>
        </Paper>
      );
    }

    return (
      <Paper key={question.id} sx={{ p: 3 }}>
        <Typography fontWeight={800} gutterBottom>
          {index + 1}. {question.question_text}
        </Typography>

        {type === 'image_question' ? (
          question.image_url ? (
            <Box
              component="img"
              src={
                question.image_url.startsWith('http')
                  ? question.image_url
                  : `${API_BASE}${question.image_url}`
              }
              alt="Question visual"
              sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: 2, display: 'block', mb: 2 }}
            />
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
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
              control={<Radio />}
              label={option.option_text}
            />
          ))}
        </RadioGroup>
        <Button size="small" onClick={() => handleHint(question)}>
          Get AI Hint
        </Button>
      </Paper>
    );
  }

  if (loading) return <LoadingScreen />;
  if (error && !quiz) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <PageHeader title={quiz.title} subtitle={quiz.description} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {hint ? <Alert severity="info" sx={{ mb: 2 }}>{hint}</Alert> : null}

      {result ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Score: {result.score}%
          </Typography>
          <Typography>
            {result.isPassed ? 'You passed!' : 'Keep practicing and try again.'}
          </Typography>
          {result.attempt?.xp_earned ? (
            <Typography sx={{ mt: 1 }}>
              XP earned: {result.attempt.xp_earned}
            </Typography>
          ) : null}
        </Paper>
      ) : (
        <Stack spacing={2}>
          {questions.map((question, index) => renderQuestion(question, index))}
          <Button
            variant="contained"
            size="large"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </Stack>
      )}
    </>
  );
}
