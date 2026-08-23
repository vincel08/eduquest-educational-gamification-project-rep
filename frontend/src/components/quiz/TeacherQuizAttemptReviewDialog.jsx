import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import quizService from '../../services/quizService';
import { getErrorMessage } from '../../services/api';
import { buildAuthenticatedFileUrl } from '../../utils/fileUrls';

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function TeacherQuizAttemptReviewDialog({
  open,
  onClose,
  quizId,
  attemptId,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);

  useEffect(() => {
    if (!open || !quizId || !attemptId) {
      setReview(null);
      setError('');
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');
    quizService
      .attemptReview(quizId, attemptId)
      .then((response) => {
        if (!active) return;
        setReview(response.data.data);
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err));
        setReview(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, quizId, attemptId]);

  const studentName = review
    ? `${review.attempt.studentFirstName} ${review.attempt.studentLastName}`.trim()
    : '';

  const answerItems = (review?.items || []).filter((item) => item.answerStored);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
    >
      <DialogTitle>
        {review ? `${review.quiz.title} · ${studentName}` : 'Student answers'}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={32} />
          </Stack>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}

        {review ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${review.attempt.earnedPoints ?? '—'} / ${review.attempt.totalPoints ?? '—'} pts`}
                color="primary"
              />
              <Chip
                label={review.attempt.isPassed ? 'Passed' : 'Not passed'}
                color={review.attempt.isPassed ? 'success' : 'default'}
                variant={review.attempt.isPassed ? 'filled' : 'outlined'}
              />
              <Chip
                label={`${review.attempt.score != null ? Number(review.attempt.score).toFixed(1) : '—'}%`}
                variant="outlined"
              />
              <Chip label={formatWhen(review.attempt.completedAt)} variant="outlined" />
            </Stack>

            {!answerItems.length ? (
              <Alert severity="info">
                Question-by-question answers are not available for this attempt. Have the student
                retake the quiz to record each correct/wrong answer.
              </Alert>
            ) : (
              answerItems.map((item, index) => {
                const correct = item.isCorrect === true;
                const imageSrc = item.imageUrl
                  ? buildAuthenticatedFileUrl(item.imageUrl)
                  : null;

                return (
                  <Box key={`${item.questionId || 'answer'}-${index}`}>
                    {index > 0 ? <Divider sx={{ mb: 2 }} /> : null}
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                        justifyContent="space-between"
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography fontWeight={800}>
                            Q{index + 1}. {item.questionText}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.pointsEarned ?? 0}/{item.points} pts
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          icon={correct ? <CheckCircleIcon /> : <CancelIcon />}
                          label={correct ? 'Correct' : 'Wrong'}
                          color={correct ? 'success' : 'error'}
                          variant="filled"
                        />
                      </Stack>

                      {imageSrc ? (
                        <Box
                          component="img"
                          src={imageSrc}
                          alt={`Question ${index + 1}`}
                          sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 1 }}
                        />
                      ) : null}

                      <Typography variant="body2">
                        <strong>Student:</strong> {item.studentAnswer}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Correct:</strong> {item.correctAnswer}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })
            )}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
