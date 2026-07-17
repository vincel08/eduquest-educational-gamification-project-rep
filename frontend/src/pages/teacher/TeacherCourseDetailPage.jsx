import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
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
import courseService from '../../services/courseService';
import lessonService from '../../services/lessonService';
import { getErrorMessage } from '../../services/api';

export default function TeacherCourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
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

  async function load() {
    try {
      const [courseRes, lessonsRes, enrollmentsRes] = await Promise.all([
        courseService.getById(courseId),
        courseService.lessons(courseId),
        courseService.enrollments(courseId),
      ]);
      setCourse(courseRes.data.data);
      setLessons(lessonsRes.data.data || []);
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
        subtitle="Manage lessons, materials, and enrollments."
        action={(
          <Button variant="contained" onClick={() => setOpen(true)}>
            Add Lesson
          </Button>
        )}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Lessons
          </Typography>
          <List>
            {lessons.map((lesson) => (
              <ListItem
                key={lesson.id}
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
                  secondary={`${lesson.xp_reward} XP`}
                />
              </ListItem>
            ))}
          </List>
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
