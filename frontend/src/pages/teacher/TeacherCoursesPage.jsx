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
import { Link as RouterLink } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import ContentTimestampToolbar from "../../components/common/ContentTimestampToolbar";
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

export default function TeacherCoursesPage() {
  const { toQueryParams, schoolYear, gradeLevel } = useTeacherFilters();
  const schoolYearOptions = listSchoolYearOptions({ includeAll: false });
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState({});

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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [schoolYear, gradeLevel]);

  async function handleCreate() {
    setSaving(true);
    setError("");
    try {
      const subject = form.subject.trim();
      await courseService.create({
        subject,
        title: subject,
        description: form.description,
        gradeLevel: form.gradeLevel,
        schoolYear: form.schoolYear,
        isPublished: form.isPublished,
      });
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
    [courses, sort, filters],
  );

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="My Subjects"
        subtitle="Create subjects and manage lessons, quizzes, and materials."
        action={
          <Button variant="contained" onClick={() => setOpen(true)}>
            New Subject
          </Button>
        }
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <ContentTimestampToolbar
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
      />

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
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Subject</DialogTitle>
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
              label="Publish immediately"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saving || !form.subject.trim()}
            onClick={handleCreate}
          >
            {saving ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
