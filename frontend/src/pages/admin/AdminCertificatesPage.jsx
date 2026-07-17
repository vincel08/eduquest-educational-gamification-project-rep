import { useEffect, useState } from 'react';
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
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import courseService from '../../services/courseService';
import gamificationService from '../../services/gamificationService';
import userService from '../../services/userService';
import { getErrorMessage } from '../../services/api';

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    courseId: '',
    templateStyle: 'classic',
  });
  const [issueForm, setIssueForm] = useState({
    certificateId: '',
    studentId: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [certsRes, coursesRes, usersRes] = await Promise.all([
        gamificationService.certificates(),
        courseService.list({ limit: 100 }),
        userService.list({ role: 'student', limit: 100 }),
      ]);
      setCertificates(certsRes.data.data || []);
      setCourses(coursesRes.data.data.courses || []);
      setStudents(usersRes.data.data.users || []);
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
    try {
      await gamificationService.createCertificate({
        ...createForm,
        courseId: createForm.courseId ? Number(createForm.courseId) : null,
      });
      setCreateOpen(false);
      setMessage('Certificate template created');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleIssue() {
    try {
      await gamificationService.issueCertificate({
        certificateId: Number(issueForm.certificateId),
        studentId: Number(issueForm.studentId),
      });
      setIssueOpen(false);
      setMessage('Certificate issued to student');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Certificate Management"
        subtitle="Create certificate templates and issue them to students."
        action={(
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setIssueOpen(true)}>Issue</Button>
            <Button variant="contained" onClick={() => setCreateOpen(true)}>New Template</Button>
          </Stack>
        )}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {certificates.map((certificate) => (
              <TableRow key={certificate.id}>
                <TableCell>{certificate.title}</TableCell>
                <TableCell>{certificate.course_title || '—'}</TableCell>
                <TableCell>{certificate.template_style}</TableCell>
                <TableCell>{certificate.is_active ? 'Active' : 'Inactive'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Certificate Template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} />
            <TextField label="Description" multiline minRows={3} value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} />
            <TextField select label="Course" value={createForm.courseId} onChange={(e) => setCreateForm((p) => ({ ...p, courseId: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>{course.title}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={issueOpen} onClose={() => setIssueOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Issue Certificate</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Certificate" value={issueForm.certificateId} onChange={(e) => setIssueForm((p) => ({ ...p, certificateId: e.target.value }))}>
              {certificates.map((certificate) => (
                <MenuItem key={certificate.id} value={certificate.id}>{certificate.title}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Student" value={issueForm.studentId} onChange={(e) => setIssueForm((p) => ({ ...p, studentId: e.target.value }))}>
              {students.map((student) => (
                <MenuItem key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleIssue}>Issue</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
