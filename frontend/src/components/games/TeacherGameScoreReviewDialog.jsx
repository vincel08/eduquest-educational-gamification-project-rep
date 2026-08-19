import { useEffect, useState } from "react";
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
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import gameService from "../../services/gameService";
import { getErrorMessage } from "../../services/api";

function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function TeacherGameScoreReviewDialog({
  open,
  onClose,
  gameId,
  scoreId,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);

  useEffect(() => {
    if (!open || !gameId || !scoreId) {
      setReview(null);
      setError("");
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");
    gameService
      .scoreReview(gameId, scoreId)
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
  }, [open, gameId, scoreId]);

  const studentName = review
    ? `${review.score.studentFirstName} ${review.score.studentLastName}`.trim()
    : "";

  const answerItems = (review?.items || []).filter((item) => item.answerStored);
  const passed = Number(review?.score?.score) >= 70;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {review ? `${review.game.title} · ${studentName}` : "Student answers"}
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
                label={`${review.score.earnedPoints ?? "—"} / ${review.score.totalPoints ?? "—"} pts`}
                color="primary"
              />
              <Chip
                label={passed ? "Passed" : "Not passed"}
                color={passed ? "success" : "default"}
                variant={passed ? "filled" : "outlined"}
              />
              <Chip
                label={`${review.score.score != null ? Number(review.score.score).toFixed(1) : "—"}%`}
                variant="outlined"
              />
              <Chip
                label={formatWhen(review.score.playedAt)}
                variant="outlined"
              />
            </Stack>

            {!review.answersAvailable ? (
              <Alert severity="info">
                Answers were not stored for this play. New game submissions
                record answers so you can review them here.
              </Alert>
            ) : !answerItems.length ? (
              <Alert severity="info">
                No item-level answers are available for this play.
              </Alert>
            ) : (
              answerItems.map((item, index) => {
                const correct = item.isCorrect === true;

                return (
                  <Box key={`game-answer-${index}`}>
                    {index > 0 ? <Divider sx={{ mb: 2 }} /> : null}
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                        justifyContent="space-between"
                      >
                        <Typography fontWeight={800} sx={{ minWidth: 0, flex: 1 }}>
                          {index + 1}. {item.prompt}
                        </Typography>
                        {item.isCorrect == null ? null : (
                          <Chip
                            size="small"
                            icon={
                              correct ? <CheckCircleIcon /> : <CancelIcon />
                            }
                            label={correct ? "Correct" : "Wrong"}
                            color={correct ? "success" : "error"}
                            variant="filled"
                          />
                        )}
                      </Stack>

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
