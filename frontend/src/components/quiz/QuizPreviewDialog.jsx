import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { buildAuthenticatedFileUrl } from "../../utils/fileUrls";

export default function QuizPreviewDialog({ open, onClose, quiz }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  if (!quiz) return null;

  const questions = quiz.questions || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
    >
      <DialogTitle>
        Preview · {quiz.title}
        <Typography variant="body2" color="text.secondary">
          Read-only teacher preview. No XP, attempts, badges, or medals are
          awarded.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={quiz.is_published ? "Published" : "Draft"}
            />
            <Chip size="small" label={`${quiz.passing_score}% to pass`} />
            <Chip size="small" label={`${quiz.xp_reward} XP`} />
            {quiz.time_limit_minutes ? (
              <Chip size="small" label={`${quiz.time_limit_minutes} min`} />
            ) : null}
            {quiz.due_at || quiz.dueAt ? (
              <Chip
                size="small"
                variant="outlined"
                label={`Due ${new Date(quiz.due_at || quiz.dueAt).toLocaleString()}`}
              />
            ) : null}
          </Stack>
          {quiz.description ? (
            <Typography color="text.secondary">{quiz.description}</Typography>
          ) : null}
        </Stack>

        <Stack spacing={2.5}>
          {questions.map((question, index) => {
            const type = question.question_type || question.questionType;
            const options = question.options || [];
            const left = options.filter((option) => option.side === "left");
            const right = options.filter((option) => option.side === "right");

            return (
              <Box
                key={question.id || index}
                sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}
              >
                <Typography fontWeight={800} gutterBottom>
                  Question {index + 1}
                  <Chip
                    size="small"
                    label={String(type || "").replace(/_/g, " ")}
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography sx={{ mb: 1.5 }}>
                  {question.question_text || question.questionText}
                </Typography>

                {question.image_url || question.imageUrl ? (
                  <Box
                    component="img"
                    src={buildAuthenticatedFileUrl(
                      question.image_url || question.imageUrl,
                    )}
                    alt={`Preview ${index + 1}`}
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 220,
                      borderRadius: 2,
                      mb: 1.5,
                    }}
                  />
                ) : null}

                {type === "identification" ? (
                  <TextField
                    fullWidth
                    size="small"
                    label="Student answer"
                    placeholder="Students type their answer here"
                    disabled
                  />
                ) : null}

                {type === "matching" ? (
                  <Stack spacing={1}>
                    {left.map((leftOption) => (
                      <Stack
                        key={leftOption.id}
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems="center"
                      >
                        <Typography sx={{ minWidth: 160 }}>
                          {leftOption.option_text}
                        </Typography>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          disabled
                          value=""
                          label="Match"
                        >
                          <MenuItem value="">Select match</MenuItem>
                          {right.map((rightOption) => (
                            <MenuItem
                              key={rightOption.id}
                              value={rightOption.id}
                            >
                              {rightOption.option_text}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>
                    ))}
                  </Stack>
                ) : null}

                {["multiple_choice", "true_false", "image_question"].includes(
                  type,
                ) ? (
                  <Stack spacing={0.75}>
                    {options.map((option, oIndex) => (
                      <Typography key={option.id || oIndex} variant="body2">
                        {String.fromCharCode(65 + oIndex)}.{" "}
                        {option.option_text || option.optionText}
                        {option.is_correct || option.isCorrect ? " ✓" : ""}
                      </Typography>
                    ))}
                  </Stack>
                ) : null}

                {type === "identification" ? (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Accepted answers (teacher view):{" "}
                      {options
                        .map(
                          (option) => option.option_text || option.optionText,
                        )
                        .join(", ")}
                    </Typography>
                  </>
                ) : null}
              </Box>
            );
          })}
          {!questions.length ? (
            <Typography color="text.secondary">
              No questions to preview yet.
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
