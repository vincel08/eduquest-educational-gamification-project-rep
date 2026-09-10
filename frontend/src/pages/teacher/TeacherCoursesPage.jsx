import { useEffect, useMemo, useState } from "react";
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
  IconButton,
  Stack,
  Switch,
  FormControlLabel,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PublishIcon from "@mui/icons-material/Publish";
import UnpublishedOutlinedIcon from "@mui/icons-material/UnpublishedOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { Link as RouterLink } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import ContentTimestampToolbar from "../../components/common/ContentTimestampToolbar";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { applyTimestampControls } from "../../utils/contentTimestamps";
import { GRADE_LEVELS } from "../../utils/gradeLevels";
import {
  defaultSchoolYearValue,
  listSchoolYearOptions,
} from "../../utils/schoolYears";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";

const emptyForm = {
  subject: "",
  description: "",
  gradeLevel: "Grade 10",
  schoolYear: defaultSchoolYearValue(),
  isPublished: true,
};

function courseToForm(course) {
  return {
    subject: course.subject || course.title || "",
    description: course.description || "",
    gradeLevel: course.grade_level || "Grade 10",
    schoolYear: course.school_year || defaultSchoolYearValue(),
    isPublished: Boolean(course.is_published),
  };
}

export default function TeacherCoursesPage() {
  const { toQueryParams, schoolYear, gradeLevel } = useTeacherFilters();
  const schoolYearOptions = listSchoolYearOptions({ includeAll: false });
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState({});
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = { limit: 50 };
      const filterParams = toQueryParams();
      if (filterParams.gradeLevel) {
        params.gradeLevel = filterParams.gradeLevel;
      }
      if (filterParams.schoolYear) {
        params.schoolYear = filterParams.schoolYear;
      }
      const response = await courseService.list(params);
      setCourses(response.data.data.courses || []);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [schoolYear, gradeLevel]);

  function openCreate() {
    setEditingCourse(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEdit(course) {
    setEditingCourse(course);
    setForm(courseToForm(course));
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    if (saving) return;
    setOpen(false);
    setEditingCourse(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const subject = form.subject.trim();
      const payload = {
        subject,
        title: subject,
        description: form.description,
        gradeLevel: form.gradeLevel,
        schoolYear: form.schoolYear,
        isPublished: form.isPublished,
      };
      if (editingCourse) {
        await courseService.update(editingCourse.id, payload);
        setMessage("Subject updated");
      } else {
        await courseService.create(payload);
        setMessage("Subject created");
      }
      setOpen(false);
      setEditingCourse(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmTogglePublish() {
    if (!publishTarget) return;
    setPublishing(true);
    setError("");
    setMessage("");
    try {
      await courseService.update(publishTarget.id, {
        isPublished: !publishTarget.is_published,
      });
      setMessage(
        publishTarget.is_published
          ? "Subject unpublished"
          : "Subject published",
      );
      setPublishTarget(null);
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
    setError("");
    setMessage("");
    try {
      await courseService.remove(courseToDelete.id);
      setMessage("Subject deleted");
      setCourseToDelete(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const visibleCourses = useMemo(
    () => applyTimestampControls(courses, { sort, filters }),
    [courses, sort, filters],
  );

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="My Subjects"
        subtitle="Create subjects and manage lessons, quizzes, and materials."
        action={
          <Button variant="contained" onClick={openCreate}>
            New Subject
          </Button>
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

      <ContentTimestampToolbar
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {!visibleCourses.length ? (
        <EmptyState
          title="No subjects yet"
          description="Create a subject for your grade and school year, then add lessons, quizzes, and games."
          actionLabel="New Subject"
          onAction={openCreate}
        />
      ) : (
        <Grid container spacing={2}>
          {visibleCourses.map((course) => (
            <Grid key={course.id} size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6">
                    {course.subject || course.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {course.grade_level || "Grade not set"}
                    {course.school_year ? ` · SY ${course.school_year}` : ""}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {course.is_published ? "Published" : "Unpublished"}
                    {course.ends_at
                      ? ` · ends ${new Date(course.ends_at).toLocaleDateString()}`
                      : ""}
                  </Typography>
                  {course.description ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      {course.description}
                    </Typography>
                  ) : null}
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {course.lesson_count || 0} lessons
                  </Typography>
                  <ContentTimestamp item={course} dense />
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 1.5 }}>
                  <Tooltip
                    title={course.is_published ? "Unpublish" : "Publish"}
                  >
                    <IconButton
                      size="small"
                      aria-label={
                        course.is_published
                          ? `Unpublish ${course.subject || course.title}`
                          : `Publish ${course.subject || course.title}`
                      }
                      onClick={() => setPublishTarget(course)}
                    >
                      {course.is_published ? (
                        <UnpublishedOutlinedIcon fontSize="small" />
                      ) : (
                        <PublishIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit subject">
                    <IconButton
                      size="small"
                      aria-label={`Edit ${course.subject || course.title}`}
                      onClick={() => openEdit(course)}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Manage subject">
                    <IconButton
                      component={RouterLink}
                      to={`/teacher/courses/${course.id}`}
                      size="small"
                      aria-label={`Manage ${course.subject || course.title}`}
                    >
                      <SettingsOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Delete ${course.subject || course.title}`}
                      onClick={() => setCourseToDelete(course)}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingCourse ? "Edit Subject" : "Create Subject"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Subject"
              required
              value={form.subject}
              onChange={(e) =>
                setForm((p) => ({ ...p, subject: e.target.value }))
              }
              helperText="Example: English, Science, Mathematics"
            />
            <TextField
              select
              label="Grade Level"
              value={form.gradeLevel}
              onChange={(e) =>
                setForm((p) => ({ ...p, gradeLevel: e.target.value }))
              }
              helperText="Junior high only (Grades 7–10)"
            >
              {GRADE_LEVELS.map((grade) => (
                <MenuItem key={grade} value={grade}>
                  {grade}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="School Year"
              value={form.schoolYear}
              onChange={(e) =>
                setForm((p) => ({ ...p, schoolYear: e.target.value }))
              }
              helperText="Subject auto-deactivates when this school year ends (May 1)"
            >
              {schoolYearOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Overview"
              multiline
              minRows={3}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              helperText="Optional short overview of this subject offering"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, isPublished: e.target.checked }))
                  }
                />
              }
              label={
                editingCourse ? "Published for students" : "Publish immediately"
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving || !form.subject.trim()}
            onClick={handleSave}
          >
            {saving
              ? editingCourse
                ? "Saving..."
                : "Creating..."
              : editingCourse
                ? "Save"
                : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(publishTarget)}
        title={
          publishTarget?.is_published
            ? "Unpublish this subject?"
            : "Publish this subject?"
        }
        description={
          publishTarget?.is_published
            ? "Students will no longer see this subject in the catalog until you publish it again."
            : "Students matching this grade and school year will be able to enroll."
        }
        details={
          publishTarget
            ? `${publishTarget.subject || publishTarget.title}${
                publishTarget.grade_level
                  ? ` · ${publishTarget.grade_level}`
                  : ""
              }`
            : undefined
        }
        cancelLabel="Cancel"
        confirmLabel={publishTarget?.is_published ? "Unpublish" : "Publish"}
        loading={publishing}
        onClose={() => {
          if (!publishing) setPublishTarget(null);
        }}
        onConfirm={confirmTogglePublish}
      />

      <ConfirmDialog
        open={Boolean(courseToDelete)}
        title="Delete this subject?"
        description="Lessons, materials, and enrollments for this subject will be removed. This can’t be undone."
        details={
          courseToDelete
            ? `${courseToDelete.subject || courseToDelete.title}${
                courseToDelete.grade_level
                  ? ` · ${courseToDelete.grade_level}`
                  : ""
              }`
            : undefined
        }
        cancelLabel="Keep subject"
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        onClose={() => {
          if (!deleting) setCourseToDelete(null);
        }}
        onConfirm={confirmRemoveCourse}
      />
    </>
  );
}
