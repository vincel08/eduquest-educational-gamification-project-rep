import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import AiGeneratedReviewPanel from '../../components/ai-review/AiGeneratedReviewPanel';
import courseService from '../../services/courseService';
import aiReviewService from '../../services/aiReviewService';
import { getErrorMessage } from '../../services/api';

export default function TeacherAiQuizPage() {
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [form, setForm] = useState({
    courseId: '',
    lessonId: '',
    topic: '',
    difficulty: 'medium',
    questionCount: 5,
    questionType: 'multiple_choice',
  });
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    courseService.list({ limit: 50 })
      .then((response) => {
        const list = response.data.data.courses || [];
        setCourses(list);
        if (list[0]) setForm((prev) => ({ ...prev, courseId: String(list[0].id) }));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!form.courseId) {
      setLessons([]);
      return;
    }
    courseService.lessons(form.courseId)
      .then((response) => {
        const list = response.data.data || [];
        setLessons(list);
        setForm((prev) => ({
          ...prev,
          lessonId: list[0] ? String(list[0].id) : '',
        }));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [form.courseId]);

  async function handleGenerate(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setDraft(null);
    try {
      const response = await aiReviewService.createFromQuiz({
        courseId: Number(form.courseId),
        lessonId: form.lessonId ? Number(form.lessonId) : null,
        topic: form.topic,
        difficulty: form.difficulty,
        questionCount: Number(form.questionCount),
        questionType: form.questionType,
      });
      const data = response.data.data;
      setDraft(data.draft);
      setMessage(data.warning || 'Quiz generated. Review and edit below before publishing.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Quiz Generator"
        subtitle="Generate a quiz, then review and edit it before publishing."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack component="form" spacing={2} onSubmit={handleGenerate}>
          <TextField
            select
            label="Course"
            value={form.courseId}
            onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value, lessonId: '' }))}
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Lesson (optional)"
            value={form.lessonId}
            onChange={(e) => setForm((p) => ({ ...p, lessonId: e.target.value }))}
            helperText="Linking a lesson also generates objectives and summary for review."
          >
            <MenuItem value="">None</MenuItem>
            {lessons.map((lesson) => (
              <MenuItem key={lesson.id} value={String(lesson.id)}>{lesson.title}</MenuItem>
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
            <MenuItem value="identification">Identification</MenuItem>
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
            inputProps={{ min: 3, max: 15 }}
          />
          <Button type="submit" variant="contained" disabled={loading || !form.courseId || !form.topic.trim()}>
            {loading ? 'Generating...' : 'Generate Quiz'}
          </Button>
        </Stack>
      </Paper>

      {draft ? (
        <AiGeneratedReviewPanel
          key={draft.id}
          initialDraft={draft}
          mode="quiz"
          onCleared={() => {
            setDraft(null);
            setMessage('');
          }}
          onPublished={() => {
            setDraft(null);
            setMessage('Quiz published successfully.');
          }}
        />
      ) : null}
    </>
  );
}
