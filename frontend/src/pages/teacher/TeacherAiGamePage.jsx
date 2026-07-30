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

const GAME_TYPE_OPTIONS = [
  { value: 'auto', label: 'Auto Select Best Game' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'memory_match', label: 'Memory Match' },
  { value: 'crossword', label: 'Crossword' },
  { value: 'word_search', label: 'Word Search' },
  { value: 'quiz_show', label: 'Quiz Show' },
  { value: 'jeopardy', label: 'Jeopardy' },
  { value: 'drag_drop', label: 'Drag and Drop' },
  { value: 'spin_wheel', label: 'Spin Wheel' },
  { value: 'millionaire', label: 'Who Wants To Be A Millionaire' },
  { value: 'escape_room', label: 'Escape Room' },
  { value: 'mission_adventure', label: 'Mission Adventure' },
  { value: 'puzzle_challenge', label: 'Puzzle Challenge' },
];

export default function TeacherAiGamePage() {
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [form, setForm] = useState({
    courseId: '',
    lessonId: '',
    gameType: 'auto',
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
        if (list[0]) {
          setForm((prev) => ({ ...prev, courseId: String(list[0].id) }));
        }
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
      const response = await aiReviewService.createFromGame({
        courseId: Number(form.courseId),
        lessonId: form.lessonId ? Number(form.lessonId) : null,
        gameType: form.gameType,
      });
      const data = response.data.data;
      setDraft(data.draft);
      setMessage(data.warning || 'Game generated. Review and edit below before publishing.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Game Generator"
        subtitle="Generate an educational game, then review, preview, and publish."
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
            label="Lesson"
            value={form.lessonId}
            onChange={(e) => setForm((p) => ({ ...p, lessonId: e.target.value }))}
            required
            helperText={!lessons.length ? 'Create a lesson in this course first' : ' '}
          >
            {lessons.map((lesson) => (
              <MenuItem key={lesson.id} value={String(lesson.id)}>{lesson.title}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Game Type"
            value={form.gameType}
            onChange={(e) => setForm((p) => ({ ...p, gameType: e.target.value }))}
          >
            {GAME_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>

          <Button
            type="submit"
            variant="contained"
            disabled={loading || !form.courseId || !form.lessonId}
          >
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </Stack>
      </Paper>

      {draft ? (
        <AiGeneratedReviewPanel
          key={draft.id}
          initialDraft={draft}
          mode="game"
          onCleared={() => {
            setDraft(null);
            setMessage('');
          }}
          onPublished={() => {
            setDraft(null);
            setMessage('Game published successfully.');
          }}
        />
      ) : null}
    </>
  );
}
