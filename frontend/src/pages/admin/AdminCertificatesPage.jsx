import { useEffect, useState } from "react";
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
} from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import courseService from "../../services/courseService";
import gamificationService from "../../services/gamificationService";
import userService from "../../services/userService";
import { getErrorMessage } from "../../services/api";

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    courseId: "",
    templateStyle: "classic",
  });
  const [createError, setCreateError] = useState("");
  const [assignForm, setAssignForm] = useState({
    certificateId: "",
    courseId: "",
  });
  const [assignError, setAssignError] = useState("");
  const [issueForm, setIssueForm] = useState({
    certificateId: "",
    studentId: "",
    forceOverride: false,
    overrideReason: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [certsRes, coursesRes, usersRes] = await Promise.all([
        gamificationService.certificates(),
        courseService.list({ limit: 100 }),
        userService.list({ role: "student", limit: 100 }),
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

  function openCreate() {
    setCreateError("");
    setCreateForm({
      title: "",
      description: "",
      courseId: "",
      templateStyle: "classic",
    });
    setCreateOpen(true);
  }

  async function handleCreate() {
    setCreateError("");
    if (!createForm.title.trim()) {
      setCreateError("Title is required.");
      return;
    }
    if (!createForm.courseId) {
      setCreateError("Please select a subject for this certificate template.");
      return;
    }

    try {
      await gamificationService.createCertificate({
        ...createForm,
        courseId: Number(createForm.courseId),
      });
      setCreateOpen(false);
      setMessage("Certificate template created");
      await load();
    } catch (err) {
      setCreateError(getErrorMessage(err));
    }
  }

  function openAssign(certificate) {
    setAssignError("");
    setAssignForm({
      certificateId: certificate.id,
      courseId: certificate.course_id || "",
    });
    setAssignOpen(true);
  }

  async function handleAssign() {
    setAssignError("");
    if (!assignForm.courseId) {
      setAssignError("Please select a subject for this certificate template.");
      return;
    }

    try {
      await gamificationService.updateCertificate(assignForm.certificateId, {
        courseId: Number(assignForm.courseId),
      });
      setAssignOpen(false);
      setMessage("Certificate template linked to subject");
      await load();
    } catch (err) {
      setAssignError(getErrorMessage(err));
    }
  }

  async function handleIssue() {
    try {
      await gamificationService.issueCertificate({
        certificateId: Number(issueForm.certificateId),
        studentId: Number(issueForm.studentId),
        forceOverride: Boolean(issueForm.forceOverride),
        overrideReason: issueForm.overrideReason || undefined,
      });
      setIssueOpen(false);
      setIssueForm({
        certificateId: "",
        studentId: "",
        forceOverride: false,
        overrideReason: "",
      });
      setMessage("Certificate issued to student");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <LoadingScreen />;

  const issueableCertificates = certificates.filter(
    (certificate) => certificate.course_id,
  );

  return (
    <>
      <PageHeader
        title="Certificate Management"
        subtitle="Create subject-linked certificate templates and issue them to students."
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setIssueOpen(true)}>
              Issue
            </Button>
            <Button variant="contained" onClick={openCreate}>
              New Template
            </Button>
          </Stack>
        }
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2, overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {certificates.map((certificate) => {
              const unassigned = !certificate.course_id;
              return (
                <TableRow key={certificate.id}>
                  <TableCell>{certificate.title}</TableCell>
                  <TableCell>
                    {unassigned ? (
                      <Typography color="warning.main" fontWeight={700}>
                        Unassigned
                      </Typography>
                    ) : (
                      certificate.course_title ||
                      `Subject #${certificate.course_id}`
                    )}
                  </TableCell>
                  <TableCell>{certificate.template_style}</TableCell>
                  <TableCell>
                    {certificate.is_active ? "Active" : "Inactive"}
                  </TableCell>
                  <TableCell align="right">
                    {unassigned ? (
                      <Button
                        size="small"
                        onClick={() => openAssign(certificate)}
                      >
                        Link Subject
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Certificate Template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {createError ? <Alert severity="error">{createError}</Alert> : null}
            <TextField
              label="Title"
              required
              value={createForm.title}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, title: e.target.value }))
              }
            />
            <TextField
              label="Description"
              multiline
              minRows={3}
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, description: e.target.value }))
              }
            />
            <TextField
              select
              required
              label="Subject"
              value={createForm.courseId}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, courseId: e.target.value }))
              }
              error={!createForm.courseId && Boolean(createError)}
              helperText="Subject is required for subject completion certificates."
            >
              <MenuItem value="" disabled>
                Select a subject
              </MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.subject || course.title}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Link Certificate Template to Subject</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {assignError ? <Alert severity="error">{assignError}</Alert> : null}
            <Typography variant="body2" color="text.secondary">
              This template is currently unassigned and cannot be issued until a
              subject is selected.
            </Typography>
            <TextField
              select
              required
              label="Subject"
              value={assignForm.courseId}
              onChange={(e) =>
                setAssignForm((p) => ({ ...p, courseId: e.target.value }))
              }
              helperText="Please select a subject for this certificate template."
            >
              <MenuItem value="" disabled>
                Select a subject
              </MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.subject || course.title}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Issue Certificate</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Certificate"
              value={issueForm.certificateId}
              onChange={(e) =>
                setIssueForm((p) => ({ ...p, certificateId: e.target.value }))
              }
              helperText="Only subject-linked templates can be issued."
            >
              {issueableCertificates.map((certificate) => (
                <MenuItem key={certificate.id} value={certificate.id}>
                  {certificate.title}
                  {certificate.course_title
                    ? ` (${certificate.course_title})`
                    : ""}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Student"
              value={issueForm.studentId}
              onChange={(e) =>
                setIssueForm((p) => ({ ...p, studentId: e.target.value }))
              }
            >
              {students.map((student) => (
                <MenuItem key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Eligibility mode"
              value={issueForm.forceOverride ? "override" : "strict"}
              onChange={(e) =>
                setIssueForm((p) => ({
                  ...p,
                  forceOverride: e.target.value === "override",
                }))
              }
              helperText="Strict mode requires enrollment, all published lessons, and all published quizzes passed."
            >
              <MenuItem value="strict">Require eligibility</MenuItem>
              <MenuItem value="override">Admin override</MenuItem>
            </TextField>
            {issueForm.forceOverride ? (
              <TextField
                label="Override reason"
                required
                multiline
                minRows={2}
                value={issueForm.overrideReason}
                onChange={(e) =>
                  setIssueForm((p) => ({
                    ...p,
                    overrideReason: e.target.value,
                  }))
                }
                helperText="Required for administrative override (min 5 characters)."
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleIssue}>
            Issue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
