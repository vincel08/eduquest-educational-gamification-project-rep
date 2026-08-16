import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import StyleIcon from '@mui/icons-material/Style';
import ExtensionIcon from '@mui/icons-material/Extension';
import CasinoIcon from '@mui/icons-material/Casino';
import QuizIcon from '@mui/icons-material/Quiz';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageHeader from '../../components/common/PageHeader';
import PageContainer from '../../components/common/PageContainer';
import AiGeneratedReviewPanel from '../../components/ai-review/AiGeneratedReviewPanel';
import courseService from '../../services/courseService';
import aiReviewService from '../../services/aiReviewService';
import { getErrorMessage } from '../../services/api';

const GAME_TYPE_OPTIONS = [
  { value: 'auto', label: 'Auto Select', icon: <AutoAwesomeIcon />, color: '#6366F1' },
  { value: 'flashcards', label: 'Flashcards', icon: <StyleIcon />, color: '#3B82F6' },
  { value: 'memory_match', label: 'Memory Match', icon: <ExtensionIcon />, color: '#8B5CF6' },
  { value: 'crossword', label: 'Crossword', icon: <QuizIcon />, color: '#10B981' },
  { value: 'word_search', label: 'Word Search', icon: <QuizIcon />, color: '#F59E0B' },
  { value: 'quiz_show', label: 'Quiz Show', icon: <SportsEsportsIcon />, color: '#EF4444' },
  { value: 'jeopardy', label: 'Jeopardy', icon: <SportsEsportsIcon />, color: '#7C3AED' },
  { value: 'drag_drop', label: 'Drag and Drop', icon: <ExtensionIcon />, color: '#0EA5E9' },
  { value: 'spin_wheel', label: 'Spin Wheel', icon: <CasinoIcon />, color: '#F97316' },
  { value: 'millionaire', label: 'Millionaire', icon: <SportsEsportsIcon />, color: '#FACC15' },
  { value: 'escape_room', label: 'Escape Room', icon: <ExtensionIcon />, color: '#64748B' },
  { value: 'mission_adventure', label: 'Mission Adventure', icon: <SportsEsportsIcon />, color: '#22C55E' },
  { value: 'puzzle_challenge', label: 'Puzzle Challenge', icon: <ExtensionIcon />, color: '#EC4899' },
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
      if (data.source === 'fallback') {
        setDraft(null);
        setError(data.warning || 'AI generation failed. Please configure GEMINI_API_KEY and try again.');
        return;
      }
      setDraft(data.draft);
      setMessage(data.warning || 'Game generated. Review and edit below before publishing.');
    } catch (err) {
      setDraft(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="AI Game Generator"
        subtitle="Choose a game template, generate content, then review and publish."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
        Game templates
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {GAME_TYPE_OPTIONS.map((option) => {
          const selected = form.gameType === option.value;
          return (
            <Grid key={option.value} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderColor: selected ? 'secondary.main' : 'divider',
                  borderWidth: selected ? 2 : 1,
                  bgcolor: selected ? 'rgba(139,92,246,0.06)' : 'background.paper',
                }}
              >
                <CardActionArea
                  onClick={() => setForm((prev) => ({ ...prev, gameType: option.value }))}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        mx: 'auto',
                        mb: 1,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: option.color,
                        color: option.value === 'millionaire' ? '#1E293B' : '#fff',
                      }}
                    >
                      {option.icon}
                    </Box>
                    <Typography variant="body2" fontWeight={800}>
                      {option.label}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
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

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !form.courseId || !form.lessonId}
          >
            {loading ? 'Generating...' : 'Generate Game'}
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
    </PageContainer>
  );
}
