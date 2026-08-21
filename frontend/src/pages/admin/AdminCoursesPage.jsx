import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import ContentTimestampToolbar from '../../components/common/ContentTimestampToolbar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import courseService from '../../services/courseService';
import userService from '../../services/userService';
import { getErrorMessage } from '../../services/api';
import { applyTimestampControls } from '../../utils/contentTimestamps';
import { useAdminFilters } from '../../contexts/AdminFiltersContext';

export default function AdminCoursesPage() {
  const { toQueryParams, gradeLevel } = useAdminFilters();
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState({});
  const [reassignTarget, setReassignTarget] = useState(null);
  const [nextTeacherId, setNextTeacherId] = useState('');
  const [saving, setSaving] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishing, setPublishing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = { limit: 100 };
      const filterParams = toQueryParams();
      if (filterParams.gradeLevel) {
        params.gradeLevel = filterParams.gradeLevel;
      }
      const [coursesRes, teachersRes] = await Promise.all([
        courseService.list(params),
        userService.list({ role: 'teacher', limit: 100 }),
      ]);
      setCourses(coursesRes.data.data.courses || []);
      setTeachers(
        (teachersRes.data.data.users || []).filter((user) => user.isActive !== false),
      );
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [gradeLevel]);

  const visibleCourses = useMemo(
    () => applyTimestampControls(courses, { sort, filters }),
    [courses, sort, filters],
  );

  async function confirmTogglePublish() {
    if (!publishTarget) return;
    setPublishing(true);
    setError('');
    try {
      await courseService.update(publishTarget.id, {
        isPublished: !publishTarget.is_published,
      });
      setPublishTarget(null);
      setMessage(
        publishTarget.is_published
          ? 'Subject unpublished'
          : 'Subject published',
      );
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  async function confirmRemoveCourse() {
    if (!courseToDelete) return;
    setDeleting(true);
    setError('');
    try {
      await courseService.remove(courseToDelete.id);
      setCourseToDelete(null);
      setMessage('Subject deleted');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  function openReassign(course) {
    setError('');
    setMessage('');
    setReassignTarget(course);
    setNextTeacherId(
      course.teacher_id ? String(course.teacher_id) : '',
    );
  }

  async function handleReassign() {
    if (!reassignTarget || !nextTeacherId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await courseService.update(reassignTarget.id, {
        teacherId: Number(nextTeacherId),
      });
      setReassignTarget(null);
      setMessage('Teacher reassigned');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Subject Management"
        subtitle="Publish, unpublish, reassign teachers, and remove subjects across the platform."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <ContentTimestampToolbar
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Subject</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Timestamps</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleCourses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>{course.subject || course.title}</TableCell>
                <TableCell>{course.grade_level || '—'}</TableCell>
                <TableCell>
                  {course.teacher_first_name} {course.teacher_last_name}
                </TableCell>
                <TableCell>{course.is_published ? 'Published' : 'Draft'}</TableCell>
                <TableCell>
                  <ContentTimestamp item={course} dense />
                </TableCell>
                <TableCell align="right">
                  <Stack
                    direction="row"
                    spacing={0.5}
                    justifyContent="flex-end"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Button size="small" onClick={() => openReassign(course)}>
                      Reassign
                    </Button>
                    <Button size="small" onClick={() => setPublishTarget(course)}>
                      {course.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setCourseToDelete(course)}
                    >
                      Delete
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!visibleCourses.length ? (
              <TableRow>
                <TableCell colSpan={6}>
                  No subjects match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={Boolean(reassignTarget)}
        onClose={() => {
          if (saving) return;
          setReassignTarget(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reassign teacher</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Move{' '}
            <strong>
              {reassignTarget?.subject || reassignTarget?.title || 'this subject'}
            </strong>{' '}
            to another teacher. Lessons, quizzes, and games stay with the subject.
          </Typography>
          <TextField
            select
            fullWidth
            label="New teacher"
            value={nextTeacherId}
            onChange={(event) => setNextTeacherId(event.target.value)}
            helperText={
              teachers.length
                ? 'Only active teacher accounts are listed'
                : 'No active teachers found'
            }
            disabled={!teachers.length}
          >
            {teachers.map((teacher) => (
              <MenuItem key={teacher.id} value={String(teacher.id)}>
                {teacher.firstName} {teacher.lastName}
                {teacher.email ? ` · ${teacher.email}` : ''}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignTarget(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReassign}
            disabled={
              saving
              || !nextTeacherId
              || Number(nextTeacherId) === Number(reassignTarget?.teacher_id)
            }
          >
            {saving ? 'Saving…' : 'Reassign'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(courseToDelete)}
        title="Delete this subject?"
        description={
          <>
            You’re about to permanently delete{' '}
            <strong>
              {courseToDelete?.subject || courseToDelete?.title || 'this subject'}
            </strong>
            .
          </>
        }
        details="Lessons, quizzes, games, and enrollments tied to this subject may also be removed. This can’t be undone."
        cancelLabel="Keep subject"
        confirmLabel="Delete subject"
        confirmColor="error"
        loading={deleting}
        loadingLabel="Deleting…"
        onClose={() => setCourseToDelete(null)}
        onConfirm={confirmRemoveCourse}
      />

      <ConfirmDialog
        open={Boolean(publishTarget)}
        title={publishTarget?.is_published ? 'Unpublish subject?' : 'Publish subject?'}
        description={
          publishTarget?.is_published
            ? (
              <>
                <strong>{publishTarget?.subject || publishTarget?.title}</strong> will
                be hidden from students until you publish it again.
              </>
            )
            : (
              <>
                <strong>{publishTarget?.subject || publishTarget?.title}</strong> will
                become visible to enrolled students.
              </>
            )
        }
        cancelLabel="Cancel"
        confirmLabel={publishTarget?.is_published ? 'Unpublish' : 'Publish'}
        confirmColor={publishTarget?.is_published ? 'warning' : 'primary'}
        loading={publishing}
        loadingLabel="Saving…"
        onClose={() => setPublishTarget(null)}
        onConfirm={confirmTogglePublish}
      />
    </>
  );
}
