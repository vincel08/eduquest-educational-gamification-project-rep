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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
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

            {review.items.map((item, index) => {
              const imageSrc = item.imageUrl
                ? buildAuthenticatedFileUrl(item.imageUrl)
                : null;
              return (
                <Box key={item.questionId}>
                  {index > 0 ? <Divider sx={{ mb: 2 }} /> : null}
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {item.isCorrect ? (
                        <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.35 }} />
                      ) : (
                        <CancelIcon color="error" fontSize="small" sx={{ mt: 0.35 }} />
                      )}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography fontWeight={800}>
                          Q{index + 1}. {item.questionText}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.questionType.replaceAll('_', ' ')} · {item.pointsEarned}/{item.points} pts
                        </Typography>
                      </Box>
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
                      <strong>Student answer:</strong> {item.studentAnswer}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Correct answer:</strong> {item.correctAnswer}
                    </Typography>
                    {item.explanation ? (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Explanation:</strong> {item.explanation}
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
