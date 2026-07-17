import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import GamePreview from '../../components/games/GamePreview';
import courseService from '../../services/courseService';
import gameService from '../../services/gameService';
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
  const [warning, setWarning] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setWarning('');
    setMessage('');
    setDraft(null);

    try {
      const response = await gameService.generate({
        courseId: Number(form.courseId),
        lessonId: form.lessonId ? Number(form.lessonId) : null,
        gameType: form.gameType,
      });
      const data = response.data.data;
      setDraft(data);
      if (data.warning || data.source === 'fallback') {
        setWarning(data.warning || 'Sample fallback game content was used.');
      } else {
        setMessage('Game generated. Preview below, then save to publish.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await gameService.create({
        courseId: draft.courseId,
        lessonId: draft.lessonId,
        title: draft.title,
        description: draft.description,
        gameType: draft.gameType,
        difficulty: draft.difficulty,
        estimatedTime: draft.estimatedTime,
        xpReward: draft.xpReward,
        gameData: draft.gameData,
        isAiGenerated: true,
        isPublished: true,
      });
      setMessage(`Saved "${response.data.data.title}" to the course games library.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Game Generator"
        subtitle="Generate educational games from lesson content, then preview and save."
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
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
            <Chip label={draft.gameType} />
            <Chip label={draft.difficulty || 'medium'} />
            <Chip label={`${draft.estimatedTime || 10} min`} />
            <Chip label={`${draft.xpReward || 100} XP`} color="secondary" />
          </Stack>
          <Typography variant="h6">{draft.title}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {draft.description}
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Live Preview</Typography>
          <GamePreview
            gameType={draft.gameType}
            gameData={draft.gameData}
            onComplete={(score) => setMessage(`Preview finished with score ${score}.`)}
          />

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Game'}
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </>
  );
}
