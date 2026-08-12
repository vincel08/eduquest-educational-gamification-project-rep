import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

function blankQuestion() {
  return {
    id: newId('q'),
    questionText: '',
    questionType: 'multiple_choice',
    points: 1,
    difficulty: 'medium',
    explanation: '',
    textAnswer: '',
    options: [
      { id: newId('opt'), optionText: 'Option A', isCorrect: true },
      { id: newId('opt'), optionText: 'Option B', isCorrect: false },
    ],
  };
}

export default function QuizEditor({
  quiz,
  onChange,
  selectedIndex,
  onSelectIndex,
}) {
  if (!quiz) {
    return (
      <Typography color="text.secondary">
        No quiz in this draft yet. Use AI actions to generate one.
      </Typography>
    );
  }

  function updateQuiz(patch) {
    onChange({ ...quiz, ...patch });
  }

  function updateQuestion(index, patch) {
    const questions = quiz.questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
    updateQuiz({ questions });
  }

  function moveQuestion(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= quiz.questions.length) return;
    const questions = [...quiz.questions];
    const [item] = questions.splice(index, 1);
    questions.splice(target, 0, item);
    updateQuiz({ questions });
    onSelectIndex?.(target);
  }

  function duplicateQuestion(index) {
    const clone = {
      ...JSON.parse(JSON.stringify(quiz.questions[index])),
      id: newId('q'),
    };
    const questions = [...quiz.questions];
    questions.splice(index + 1, 0, clone);
    updateQuiz({ questions });
  }

  function deleteQuestion(index) {
    updateQuiz({ questions: quiz.questions.filter((_, i) => i !== index) });
    onSelectIndex?.(Math.max(0, index - 1));
  }

  function updateOption(qIndex, oIndex, patch) {
    const question = quiz.questions[qIndex];
    const options = question.options.map((opt, i) => {
      if (i !== oIndex) {
        if (patch.isCorrect) return { ...opt, isCorrect: false };
        return opt;
      }
      return { ...opt, ...patch };
    });
    updateQuestion(qIndex, { options });
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Quiz title"
          fullWidth
          value={quiz.title || ''}
          onChange={(e) => updateQuiz({ title: e.target.value })}
        />
        <TextField
          select
          label="Difficulty"
          value={quiz.difficulty || 'medium'}
          onChange={(e) => updateQuiz({ difficulty: e.target.value })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="easy">Easy</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="hard">Hard</MenuItem>
        </TextField>
      </Stack>
      <TextField
        label="Description"
        fullWidth
        multiline
        minRows={2}
        value={quiz.description || ''}
        onChange={(e) => updateQuiz({ description: e.target.value })}
      />
      <Stack direction="row" spacing={2}>
        <TextField
          label="Points default / XP"
          type="number"
          value={quiz.xpReward || 50}
          onChange={(e) => updateQuiz({ xpReward: Number(e.target.value) })}
        />
        <TextField
          label="Time limit (min)"
          type="number"
          value={quiz.timeLimitMinutes || 15}
          onChange={(e) => updateQuiz({ timeLimitMinutes: Number(e.target.value) })}
        />
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Questions ({quiz.questions?.length || 0})</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => updateQuiz({ questions: [...(quiz.questions || []), blankQuestion()] })}
        >
          Add question
        </Button>
      </Stack>

      {(quiz.questions || []).map((question, index) => (
        <Card
          key={question.id || index}
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
                value={question.questionText || ''}
                onChange={(e) => updateQuestion(index, { questionText: e.target.value })}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Question type"
                  value={question.questionType || 'multiple_choice'}
                  onChange={(e) => {
                    const questionType = e.target.value;
                    if (questionType === 'true_false') {
                      updateQuestion(index, {
                        questionType,
                        options: [
                          { id: newId('opt'), optionText: 'True', isCorrect: true },
                          { id: newId('opt'), optionText: 'False', isCorrect: false },
                        ],
                      });
                    } else {
                      updateQuestion(index, { questionType });
                    }
                  }}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                  <MenuItem value="true_false">True/False</MenuItem>
                  <MenuItem value="identification">Identification</MenuItem>
                </TextField>
                <TextField
                  label="Points"
                  type="number"
                  value={question.points || 1}
                  onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })}
                />
                <TextField
                  select
                  label="Difficulty"
                  value={question.difficulty || quiz.difficulty || 'medium'}
                  onChange={(e) => updateQuestion(index, { difficulty: e.target.value })}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                </TextField>
              </Stack>

              {question.questionType === 'identification' ? (
                <TextField
                  label="Correct answer"
                  fullWidth
                  value={question.textAnswer || ''}
                  onChange={(e) => updateQuestion(index, { textAnswer: e.target.value })}
                />
              ) : (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Choices</Typography>
                  <Stack spacing={1}>
                    {(question.options || []).map((option, oIndex) => (
                      <Stack key={option.id || oIndex} direction="row" spacing={1} alignItems="center">
                        <TextField
                          fullWidth
                          size="small"
                          label={`Choice ${oIndex + 1}`}
                          value={option.optionText || ''}
                          onChange={(e) => updateOption(index, oIndex, { optionText: e.target.value })}
                        />
                        <Button
                          size="small"
                          variant={option.isCorrect ? 'contained' : 'outlined'}
                          onClick={() => updateOption(index, oIndex, { isCorrect: true })}
                        >
                          Correct
                        </Button>
                        <IconButton
                          size="small"
                          disabled={(question.options || []).length <= 2}
                          onClick={() => updateQuestion(index, {
                            options: question.options.filter((_, i) => i !== oIndex),
                          })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                  {question.questionType === 'multiple_choice' ? (
                    <Button
                      sx={{ mt: 1 }}
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => updateQuestion(index, {
                        options: [
                          ...(question.options || []),
                          { id: newId('opt'), optionText: `Option ${(question.options?.length || 0) + 1}`, isCorrect: false },
                        ],
                      })}
                    >
                      Add choice
                    </Button>
                  ) : null}
                </Box>
              )}

              <TextField
                label="Explanation"
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
