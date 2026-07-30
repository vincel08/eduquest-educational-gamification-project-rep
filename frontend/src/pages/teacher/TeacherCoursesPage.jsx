import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import ContentTimestampToolbar from '../../components/common/ContentTimestampToolbar';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';
import { applyTimestampControls } from '../../utils/contentTimestamps';

const emptyForm = {
  title: '',
  subject: '',
  description: '',
  gradeLevel: 'Grade 10',
  isPublished: true,
};

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState({});

  async function load() {
    setLoading(true);
    try {
      const response = await courseService.list({ limit: 50 });
      setCourses(response.data.data.courses || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    setSaving(true);
    setError('');
    try {
      await courseService.create(form);
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const visibleCourses = useMemo(
    () => applyTimestampControls(courses, { sort, filters }),
    [courses, sort, filters]
  );

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="My Courses"
        subtitle="Create courses and manage learning materials."
        action={(
          <Button variant="contained" onClick={() => setOpen(true)}>
            New Course
          </Button>
        )}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <ContentTimestampToolbar
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <Grid container spacing={2}>
        {visibleCourses.map((course) => (
          <Grid key={course.id} size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">{course.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {course.subject} · {course.grade_level}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {course.lesson_count || 0} lessons
                </Typography>
                <ContentTimestamp item={course} dense />
              </CardContent>
              <CardActions>
                <Button component={RouterLink} to={`/teacher/courses/${course.id}`}>
                  Manage
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Course</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <TextField label="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
            <TextField label="Grade Level" value={form.gradeLevel} onChange={(e) => setForm((p) => ({ ...p, gradeLevel: e.target.value }))} />
            <TextField
              label="Description"
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={form.isPublished}
                  onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
                />
              )}
              label="Publish immediately"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={handleCreate}>
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
