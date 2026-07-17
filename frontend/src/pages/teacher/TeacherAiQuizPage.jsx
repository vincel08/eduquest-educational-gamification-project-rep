import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import courseService from '../../services/courseService';
import quizService from '../../services/quizService';
import { getErrorMessage } from '../../services/api';

const TYPE_LABELS = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True or False',
  matching: 'Matching Type',
  identification: 'Identification',
  image_question: 'Image Questions',
};

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:4000';

export default function TeacherAiQuizPage() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    courseId: '',
    topic: '',
    difficulty: 'medium',
    questionCount: 5,
    questionType: 'multiple_choice',
    isPublished: true,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    courseService.list({ limit: 50 })
      .then((response) => {
        const list = response.data.data.courses || [];
        setCourses(list);
        if (list[0]) setForm((prev) => ({ ...prev, courseId: list[0].id }));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function handleGenerate(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setWarning('');
    setMessage('');
    setResult(null);
    try {
      const response = await quizService.generate({
        ...form,
        courseId: Number(form.courseId),
        questionCount: Number(form.questionCount),
      });
      const data = response.data.data;
      setResult(data);
      if (data.warning || data.source === 'fallback') {
        setWarning(data.warning || 'Sample fallback questions were used.');
      } else {
        setMessage('Quiz generated successfully.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(questionId, file) {
    if (!file) return;
    setUploadingId(questionId);
    setError('');
    try {
      const response = await quizService.attachImage(questionId, file);
      const updated = response.data.data;
      setResult((prev) => ({
        ...prev,
        questions: (prev.questions || []).map((question) => (
          question.id === questionId
            ? { ...question, image_url: updated.image_url }
            : question
        )),
      }));
      setMessage('Image attached to question.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingId(null);
    }
  }

  function renderQuestionPreview(question, index) {
    const type = question.question_type || question.questionType || 'multiple_choice';
    const options = question.options || [];
    const imageUrl = question.image_url || question.imageUrl;

    return (
      <Box key={question.id || index} sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography fontWeight={700}>
            {index + 1}. {question.question_text || question.questionText}
          </Typography>
          <Chip size="small" label={TYPE_LABELS[type] || type} />
        </Stack>

        {type === 'image_question' ? (
          <Box sx={{ my: 1 }}>
            {imageUrl ? (
              <Box
                component="img"
                src={imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`}
                alt="Question"
                sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 2, display: 'block', mb: 1 }}
              />
            ) : (
              <Alert severity="info" sx={{ mb: 1 }}>
                No image yet. Upload one below for students to see.
              </Alert>
            )}
            <Button variant="outlined" component="label" size="small" disabled={uploadingId === question.id}>
              {uploadingId === question.id ? 'Uploading...' : 'Upload image'}
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(event) => handleImageUpload(question.id, event.target.files?.[0])}
              />
            </Button>
          </Box>
        ) : null}

        {type === 'matching' ? (
          <Stack spacing={0.5} sx={{ pl: 2 }}>
            {options.filter((option) => option.side === 'left').map((left) => {
              const right = options.find(
                (option) => option.side === 'right' && option.match_key === left.match_key
              );
              return (
                <Typography key={left.id || left.option_text} variant="body2" color="text.secondary">
                  {left.option_text || left.optionText}
                  {' → '}
                  {right?.option_text || right?.optionText || '—'}
                </Typography>
              );
            })}
          </Stack>
        ) : null}

        {type === 'identification' ? (
          <Stack spacing={0.5} sx={{ pl: 2 }}>
            <Typography variant="caption" color="text.secondary">Accepted answers:</Typography>
            {options.map((option) => (
              <Typography key={option.id || option.option_text} variant="body2" color="success.main">
                ✓ {option.option_text || option.optionText}
              </Typography>
            ))}
          </Stack>
        ) : null}

        {(type === 'multiple_choice' || type === 'true_false' || type === 'image_question') ? (
          options.map((option) => {
            const text = option.option_text || option.optionText;
            const isCorrect = Boolean(option.is_correct ?? option.isCorrect);
            return (
              <Typography
                key={option.id || text}
                variant="body2"
                color={isCorrect ? 'success.main' : 'text.secondary'}
                sx={{ pl: 2 }}
              >
                {isCorrect ? '✓ ' : '• '}
                {text}
              </Typography>
            );
          })
        ) : null}
      </Box>
    );
  }

  return (
    <>
      <PageHeader
        title="AI Quiz Generator"
        subtitle="Generate Multiple Choice, True/False, Matching, Identification, or Image quizzes."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {warning ? <Alert severity="warning" sx={{ mb: 2 }}>{warning}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack component="form" spacing={2} onSubmit={handleGenerate}>
          <TextField
            select
            label="Course"
            value={form.courseId}
            onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>{course.title}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Topic"
            required
            value={form.topic}
            onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
          />
          <TextField
            select
            label="Question type"
            value={form.questionType}
            onChange={(e) => setForm((p) => ({ ...p, questionType: e.target.value }))}
          >
            <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
            <MenuItem value="true_false">True or False</MenuItem>
            <MenuItem value="matching">Matching Type</MenuItem>
            <MenuItem value="identification">Identification</MenuItem>
            <MenuItem value="image_question">Image Questions</MenuItem>
          </TextField>
          <TextField
            select
            label="Difficulty"
            value={form.difficulty}
            onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
          >
            <MenuItem value="easy">Easy</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="hard">Hard</MenuItem>
          </TextField>
          <TextField
            label="Question count"
            type="number"
            value={form.questionCount}
            onChange={(e) => setForm((p) => ({ ...p, questionCount: e.target.value }))}
          />
          <Button type="submit" variant="contained" disabled={loading || !form.courseId}>
            {loading ? 'Generating...' : 'Generate Quiz'}
          </Button>
        </Stack>
      </Paper>

      {result ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {result.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {result.description}
          </Typography>
          {(result.questions || []).map((question, index) => renderQuestionPreview(question, index))}
        </Paper>
      ) : null}
    </>
  );
}
