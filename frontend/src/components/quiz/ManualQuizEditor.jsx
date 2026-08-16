import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { blankQuestion, newId } from '../../utils/manualQuizHelpers';
import { buildAuthenticatedFileUrl } from '../../utils/fileUrls';

export default function ManualQuizEditor({
  form,
  setForm,
  questions,
  setQuestions,
  courses,
  lessons,
  selectedIndex,
  onSelectIndex,
  courseLocked = false,
}) {
  function updateQuestion(index, patch) {
    setQuestions((prev) => prev.map((question, i) => (
      i === index ? { ...question, ...patch } : question
    )));
  }

  function updateOption(qIndex, oIndex, patch) {
    setQuestions((prev) => prev.map((question, i) => {
      if (i !== qIndex) return question;
      const options = (question.options || []).map((option, oi) => {
        if (oi !== oIndex) {
          return patch.isCorrect ? { ...option, isCorrect: false } : option;
        }
        return { ...option, ...patch };
      });
      return { ...question, options };
    }));
  }

  function updatePair(qIndex, pIndex, patch) {
    setQuestions((prev) => prev.map((question, i) => {
      if (i !== qIndex) return question;
      const pairs = (question.pairs || []).map((pair, pi) => (
        pi === pIndex ? { ...pair, ...patch } : pair
      ));
      return { ...question, pairs };
    }));
  }

  function moveQuestion(index, delta) {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    if (onSelectIndex) onSelectIndex(Math.max(0, Math.min(questions.length - 1, index + delta)));
  }

  function duplicateQuestion(index) {
    setQuestions((prev) => {
      const source = prev[index];
      const copy = {
        ...structuredClone(source),
        clientId: newId('q'),
        id: undefined,
        imageFile: null,
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function deleteQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function changeQuestionType(index, questionType) {
    const next = blankQuestion(questionType);
    setQuestions((prev) => prev.map((question, i) => {
      if (i !== index) return question;
      return {
        ...next,
        clientId: question.clientId,
        id: question.id,
        questionText: question.questionText,
        points: question.points,
        explanation: question.explanation,
        difficulty: question.difficulty,
      };
    }));
  }

  function handleImagePick(index, file) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    updateQuestion(index, {
      imageFile: file,
      imagePreviewUrl: preview,
    });
  }

  const selectedCourse = courses.find((course) => String(course.id) === String(form.courseId));

  return (
    <Stack spacing={3}>
      {questions.length ? (
        <PaperlessQuestionNav
          questions={questions}
          selectedIndex={selectedIndex}
          onSelectIndex={onSelectIndex}
        />
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={800}>Quiz Information</Typography>
            <TextField
              label="Quiz title"
              fullWidth
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label="Subject"
                fullWidth
                required
                disabled={courseLocked}
                value={form.courseId}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  courseId: e.target.value,
                  lessonId: '',
                }))}
                helperText={courseLocked ? 'Subject cannot be changed after the quiz is created' : undefined}
              >
                {courses.map((course) => (
                  <MenuItem key={course.id} value={String(course.id)}>
                    {course.subject || course.title}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Lesson (optional)"
                fullWidth
                value={form.lessonId}
                onChange={(e) => setForm((prev) => ({ ...prev, lessonId: e.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {lessons.map((lesson) => (
                  <MenuItem key={lesson.id} value={String(lesson.id)}>
                    {lesson.title}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Grade level"
                fullWidth
                value={selectedCourse?.grade_level || 'From selected course'}
                InputProps={{ readOnly: true }}
                helperText="Taken from the selected course"
              />
              <TextField
                select
                label="Default difficulty"
                fullWidth
                value={form.difficulty}
                onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
              >
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Passing score (%)"
                type="number"
                fullWidth
                value={form.passingScore}
                onChange={(e) => setForm((prev) => ({ ...prev, passingScore: Number(e.target.value) }))}
              />
              <TextField
                label="Time limit (minutes)"
                type="number"
                fullWidth
                value={form.timeLimitMinutes}
                onChange={(e) => setForm((prev) => ({ ...prev, timeLimitMinutes: Number(e.target.value) }))}
              />
              <TextField
                label="XP reward"
                type="number"
                fullWidth
                value={form.xpReward}
                onChange={(e) => setForm((prev) => ({ ...prev, xpReward: Number(e.target.value) }))}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={800}>
          Questions ({questions.length})
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => setQuestions((prev) => [...prev, blankQuestion('multiple_choice')])}
        >
          Add Question
        </Button>
      </Stack>

      {questions.map((question, index) => (
        <Card
          key={question.clientId || question.id || index}
          variant="outlined"
          onClick={() => onSelectIndex?.(index)}
          sx={{
            borderColor: selectedIndex === index ? 'primary.main' : 'divider',
            borderWidth: selectedIndex === index ? 2 : 1,
          }}
        >
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={800}>Question {index + 1}</Typography>
                <Stack direction="row">
                  <IconButton size="small" onClick={() => moveQuestion(index, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => moveQuestion(index, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => duplicateQuestion(index)}><ContentCopyIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => deleteQuestion(index)}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Stack>

              <TextField
                label="Question text"
                fullWidth
                multiline
                required
                value={question.questionText || ''}
                onChange={(e) => updateQuestion(index, { questionText: e.target.value })}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Question type"
                  value={question.questionType || 'multiple_choice'}
                  onChange={(e) => changeQuestionType(index, e.target.value)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                  <MenuItem value="true_false">True / False</MenuItem>
                  <MenuItem value="identification">Identification</MenuItem>
                  <MenuItem value="matching">Matching Type</MenuItem>
                  <MenuItem value="image_question">Image Question</MenuItem>
                </TextField>
                <TextField
                  label="Points"
                  type="number"
                  value={question.points || 1}
                  onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })}
                />
              </Stack>

              {question.questionType === 'identification' ? (
                <Stack spacing={1.5}>
                  <TextField
                    label="Correct answer"
                    fullWidth
                    required
                    value={question.textAnswer || ''}
                    onChange={(e) => updateQuestion(index, { textAnswer: e.target.value })}
                  />
                  <TextField
                    label="Optional accepted answers (comma-separated)"
                    fullWidth
                    value={question.acceptedAnswers || ''}
                    onChange={(e) => updateQuestion(index, { acceptedAnswers: e.target.value })}
                    helperText="Additional answers students may enter that still count as correct"
                  />
                </Stack>
              ) : null}

              {question.questionType === 'matching' ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Matching pairs</Typography>
                  <Stack spacing={1}>
                    {(question.pairs || []).map((pair, pIndex) => (
                      <Stack key={pair.clientId || pIndex} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <TextField
                          fullWidth
                          size="small"
                          label={`Left ${pIndex + 1}`}
                          value={pair.left || ''}
                          onChange={(e) => updatePair(index, pIndex, { left: e.target.value })}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label={`Right ${pIndex + 1}`}
                          value={pair.right || ''}
                          onChange={(e) => updatePair(index, pIndex, { right: e.target.value })}
                        />
                        <IconButton
                          size="small"
                          disabled={(question.pairs || []).length <= 2}
                          onClick={() => updateQuestion(index, {
                            pairs: question.pairs.filter((_, i) => i !== pIndex),
                          })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                  <Button
                    sx={{ mt: 1 }}
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => updateQuestion(index, {
                      pairs: [...(question.pairs || []), { clientId: newId('pair'), left: '', right: '' }],
                    })}
                  >
                    Add pair
                  </Button>
                </Box>
              ) : null}

              {['multiple_choice', 'true_false', 'image_question'].includes(question.questionType) ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Choices</Typography>
                  <Stack spacing={1}>
                    {(question.options || []).map((option, oIndex) => (
                      <Stack key={option.clientId || oIndex} direction="row" spacing={1} alignItems="center">
                        <TextField
                          fullWidth
                          size="small"
                          label={`Choice ${String.fromCharCode(65 + oIndex)}`}
                          value={option.optionText || ''}
                          onChange={(e) => updateOption(index, oIndex, { optionText: e.target.value })}
                          disabled={question.questionType === 'true_false'}
                        />
                        <Button
                          size="small"
                          variant={option.isCorrect ? 'contained' : 'outlined'}
                          onClick={() => updateOption(index, oIndex, { isCorrect: true })}
                        >
                          Correct
                        </Button>
                        {question.questionType === 'multiple_choice' || question.questionType === 'image_question' ? (
                          <IconButton
                            size="small"
                            disabled={(question.options || []).length <= 2}
                            onClick={() => updateQuestion(index, {
                              options: question.options.filter((_, i) => i !== oIndex),
                            })}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        ) : null}
                      </Stack>
                    ))}
                  </Stack>
                  {question.questionType !== 'true_false' ? (
                    <Button
                      sx={{ mt: 1 }}
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => updateQuestion(index, {
                        options: [
                          ...(question.options || []),
                          { clientId: newId('opt'), optionText: '', isCorrect: false },
                        ],
                      })}
                    >
                      Add choice
                    </Button>
                  ) : null}
                </Box>
              ) : null}

              {question.questionType === 'image_question' ? (
                <Stack spacing={1}>
                  <Button variant="outlined" component="label">
                    Upload question image
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImagePick(index, e.target.files?.[0])}
                    />
                  </Button>
                  {question.imagePreviewUrl ? (
                    <Box
                      component="img"
                      src={
                        String(question.imagePreviewUrl).startsWith('blob:')
                          ? question.imagePreviewUrl
                          : buildAuthenticatedFileUrl(question.imagePreviewUrl)
                      }
                      alt={`Question ${index + 1}`}
                      sx={{ maxWidth: 320, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                    />
                  ) : null}
                </Stack>
              ) : null}

              <TextField
                label="Explanation (optional)"
                fullWidth
                multiline
                minRows={2}
                value={question.explanation || ''}
                onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
              />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function PaperlessQuestionNav({ questions, selectedIndex, onSelectIndex }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mr: 0.5 }}>
            Questions
          </Typography>
          {questions.map((question, index) => (
            <Chip
              key={question.clientId || question.id || index}
              clickable
              color={selectedIndex === index ? 'primary' : 'default'}
              variant={selectedIndex === index ? 'filled' : 'outlined'}
              label={`Q${index + 1}`}
              onClick={() => onSelectIndex?.(index)}
              sx={{ fontWeight: 800 }}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
