import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import ContentTimestampToolbar from '../../components/common/ContentTimestampToolbar';
import courseService from '../../services/courseService';
import lessonService from '../../services/lessonService';
import { getErrorMessage } from '../../services/api';
import { applyTimestampControls } from '../../utils/contentTimestamps';

export default function TeacherCourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [games, setGames] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    orderIndex: 1,
    xpReward: 25,
    generateAiExtras: true,
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState({});

  async function load() {
    try {
      const [courseRes, lessonsRes, quizzesRes, gamesRes, enrollmentsRes] = await Promise.all([
        courseService.getById(courseId),
        courseService.lessons(courseId),
        courseService.quizzes(courseId),
        courseService.games(courseId),
        courseService.enrollments(courseId),
      ]);
      setCourse(courseRes.data.data);
      setLessons(lessonsRes.data.data || []);
      setQuizzes(quizzesRes.data.data || []);
      setGames(gamesRes.data.data || []);
      setEnrollments(enrollmentsRes.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [courseId]);

  const visibleLessons = useMemo(
    () => applyTimestampControls(lessons, { sort, filters }),
    [lessons, sort, filters]
  );
  const visibleQuizzes = useMemo(
    () => applyTimestampControls(quizzes, { sort, filters }),
    [quizzes, sort, filters]
  );
  const visibleGames = useMemo(
    () => applyTimestampControls(games, { sort, filters }),
    [games, sort, filters]
  );

  async function handleCreateLesson() {
    setError('');
    try {
      await lessonService.create(courseId, form);
      setOpen(false);
      setMessage('Lesson created');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleUpload(lessonId, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await lessonService.uploadMaterial(lessonId, file);
      setMessage('Material uploaded');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <LoadingScreen />;
  if (!course) return <Alert severity="error">{error || 'Course not found'}</Alert>;

  return (
    <>
      <PageHeader
        title={course.title}
        subtitle="Manage lessons, quizzes, games, and enrollments."
        action={(
          <Button variant="contained" onClick={() => setOpen(true)}>
            Add Lesson
          </Button>
        )}
      />
      <ContentTimestamp item={course} dense sx={{ mb: 2, mt: 0 }} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <ContentTimestampToolbar
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Lessons
          </Typography>
          <List>
            {visibleLessons.map((lesson) => (
              <ListItem
                key={lesson.id}
                alignItems="flex-start"
                secondaryAction={(
                  <Button component="label" size="small">
                    Upload Material
                    <input
                      hidden
                      type="file"
                      onChange={(event) => handleUpload(lesson.id, event)}
                    />
                  </Button>
                )}
              >
                <ListItemText
                  primary={`${lesson.order_index}. ${lesson.title}`}
                  secondary={(
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {lesson.xp_reward} XP
                        {lesson.is_published ? ' · Published' : ' · Draft'}
                      </Typography>
                      <ContentTimestamp item={lesson} dense />
                    </Stack>
                  )}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
          {!visibleLessons.length ? (
            <Typography color="text.secondary">No lessons match the current filters.</Typography>
          ) : null}
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quizzes
          </Typography>
          <List>
            {visibleQuizzes.map((quiz) => (
              <ListItem key={quiz.id} alignItems="flex-start">
                <ListItemText
                  primary={(
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography fontWeight={700}>{quiz.title}</Typography>
                      <Chip size="small" label={quiz.is_published ? 'Published' : 'Draft'} />
                      {quiz.is_ai_generated ? <Chip size="small" label="AI" color="secondary" variant="outlined" /> : null}
                    </Stack>
                  )}
                  secondary={(
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {quiz.question_count || 0} questions · {quiz.xp_reward} XP
                      </Typography>
                      <ContentTimestamp item={quiz} dense />
                    </Stack>
                  )}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
          {!visibleQuizzes.length ? (
            <Typography color="text.secondary">No quizzes match the current filters.</Typography>
          ) : null}
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Educational Games
          </Typography>
          <List>
            {visibleGames.map((game) => (
              <ListItem key={game.id} alignItems="flex-start">
                <ListItemText
                  primary={(
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography fontWeight={700}>{game.title}</Typography>
                      <Chip size="small" label={game.is_published ? 'Published' : 'Draft'} />
                      {game.is_ai_generated ? <Chip size="small" label="AI" color="secondary" variant="outlined" /> : null}
                    </Stack>
                  )}
                  secondary={(
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {(game.game_type || '').replace(/_/g, ' ')} · {game.xp_reward} XP
                      </Typography>
                      <ContentTimestamp item={game} dense />
                    </Stack>
                  )}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
          {!visibleGames.length ? (
            <Typography color="text.secondary">No games match the current filters.</Typography>
          ) : null}
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Enrolled Students ({enrollments.length})
          </Typography>
          <List>
            {enrollments.map((student) => (
              <ListItem key={student.id}>
                <ListItemText
                  primary={`${student.first_name} ${student.last_name}`}
                  secondary={`Progress ${Number(student.progress_percent)}% · Level ${student.level || 1}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Lesson</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <TextField
              label="Content"
              multiline
              minRows={5}
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            />
            <TextField
              label="Order"
              type="number"
              value={form.orderIndex}
              onChange={(e) => setForm((p) => ({ ...p, orderIndex: Number(e.target.value) }))}
            />
            <TextField
              label="XP Reward"
              type="number"
              value={form.xpReward}
              onChange={(e) => setForm((p) => ({ ...p, xpReward: Number(e.target.value) }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateLesson}>Create</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
