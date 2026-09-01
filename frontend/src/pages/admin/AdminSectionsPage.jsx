import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import classSectionService from "../../services/classSectionService";
import userService from "../../services/userService";
import { getErrorMessage } from "../../services/api";
import { GRADE_LEVELS } from "../../utils/gradeLevels";
import { listSchoolYearOptions } from "../../utils/schoolYears";
import { notifyClassSectionsChanged } from "../../utils/classSectionsEvents";
import { useAdminFilters } from "../../contexts/AdminFiltersContext";

export default function AdminSectionsPage() {
  const {
    toQueryParams,
    schoolYear,
    gradeLevel,
    section: sectionFilter,
    setSchoolYear,
    setGradeLevel,
    setSection,
  } = useAdminFilters();

  const schoolYearOptions = useMemo(
    () => listSchoolYearOptions({ includeAll: false }),
    [],
  );

  const defaultForm = useCallback(
    () => ({
      schoolYear:
        schoolYear && schoolYear !== "all"
          ? schoolYear
          : schoolYearOptions[0]?.value || "",
      gradeLevel: gradeLevel && gradeLevel !== "all" ? gradeLevel : "Grade 7",
      name: "",
      adviserId: "",
    }),
    [schoolYear, gradeLevel, schoolYearOptions],
  );

  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(() => defaultForm());
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (overrides = {}) => {
      const filterParams = { ...toQueryParams(), ...overrides };
      const listParams = { limit: 200 };
      if (filterParams.schoolYear && filterParams.schoolYear !== "all") {
        listParams.schoolYear = filterParams.schoolYear;
      }
      if (filterParams.gradeLevel && filterParams.gradeLevel !== "all") {
        listParams.gradeLevel = filterParams.gradeLevel;
      }

      const [sectionsRes, teachersRes] = await Promise.all([
        classSectionService.list(listParams),
        userService.list({ role: "teacher", limit: 100 }),
      ]);

      let nextSections = sectionsRes.data.data.sections || [];
      if (filterParams.section && filterParams.section !== "all") {
        const wanted = String(filterParams.section).trim().toLowerCase();
        nextSections = nextSections.filter(
          (item) =>
            String(item.name || "")
              .trim()
              .toLowerCase() === wanted,
        );
      }

      setSections(nextSections);
      setTeachers(teachersRes.data.data.users || []);
    },
    [toQueryParams],
  );

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [load, schoolYear, gradeLevel, sectionFilter]);

  // Keep create form aligned with sidebar school year / grade when not editing.
  useEffect(() => {
    if (editingId) return;
    setForm(defaultForm());
  }, [defaultForm, editingId]);

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm());
  }

  function startEdit(section) {
    setEditingId(section.id);
    setForm({
      schoolYear: section.schoolYear,
      gradeLevel: section.gradeLevel,
      name: section.name,
      adviserId: section.adviserId ? String(section.adviserId) : "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        schoolYear: form.schoolYear,
        gradeLevel: form.gradeLevel,
        name: form.name.trim(),
        adviserId: form.adviserId ? Number(form.adviserId) : null,
      };
      if (!payload.name) {
        throw new Error("Section name is required.");
      }
      if (editingId) {
        await classSectionService.update(editingId, payload);
        setMessage("Section updated");
      } else {
        await classSectionService.create(payload);
        setMessage("Section created");
      }

      // Align sidebar so the new/updated section is visible system-wide selectors refresh.
      setSchoolYear(payload.schoolYear);
      setGradeLevel(payload.gradeLevel);
      setSection("all");
      setEditingId(null);
      setForm({
        schoolYear: payload.schoolYear,
        gradeLevel: payload.gradeLevel,
        name: "",
        adviserId: "",
      });
      notifyClassSectionsChanged();
      await load({
        schoolYear: payload.schoolYear,
        gradeLevel: payload.gradeLevel,
        section: "all",
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!sectionToDelete) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      await classSectionService.remove(sectionToDelete.id);
      setMessage(`Deleted section ${sectionToDelete.name}`);
      if (editingId === sectionToDelete.id) resetForm();
      setSectionToDelete(null);
      setSection("all");
      notifyClassSectionsChanged();
      await load({ section: "all" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Class Sections"
        subtitle="Manage section names by school year and grade, and assign an adviser teacher."
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

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              required
              label="School Year"
              value={form.schoolYear}
              onChange={(e) =>
                setForm((p) => ({ ...p, schoolYear: e.target.value }))
              }
              fullWidth
            >
              {schoolYearOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              required
              label="Grade"
              value={form.gradeLevel}
              onChange={(e) =>
                setForm((p) => ({ ...p, gradeLevel: e.target.value }))
              }
              fullWidth
            >
              {GRADE_LEVELS.map((grade) => (
                <MenuItem key={grade} value={grade}>
                  {grade}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              label="Section name"
              placeholder="e.g. Faith, Newton, A"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Adviser"
              value={form.adviserId}
              onChange={(e) =>
                setForm((p) => ({ ...p, adviserId: e.target.value }))
              }
              fullWidth
            >
              <MenuItem value="">No adviser</MenuItem>
              {teachers.map((teacher) => (
                <MenuItem key={teacher.id} value={String(teacher.id)}>
                  {teacher.firstName} {teacher.lastName}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={saving}>
              {editingId ? "Update section" : "Add section"}
            </Button>
            {editingId ? (
              <Button type="button" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ResponsiveTableContainer>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>School Year</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Section</TableCell>
                <TableCell>Adviser</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sections.map((section) => (
                <TableRow key={section.id}>
                  <TableCell>SY {section.schoolYear}</TableCell>
                  <TableCell>{section.gradeLevel}</TableCell>
                  <TableCell>{section.name}</TableCell>
                  <TableCell>{section.adviserName || "—"}</TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={0.25}
                      justifyContent="flex-end"
                    >
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit section ${section.name}`}
                          onClick={() => startEdit(section)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete section ${section.name}`}
                          onClick={() => setSectionToDelete(section)}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!sections.length ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    No class sections match the current sidebar filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ResponsiveTableContainer>
      </Paper>

      <ConfirmDialog
        open={Boolean(sectionToDelete)}
        title="Delete this class section?"
        description={
          <>
            You’re about to delete{" "}
            <strong>
              {sectionToDelete
                ? `${sectionToDelete.gradeLevel} · ${sectionToDelete.name}`
                : "this section"}
            </strong>
            .
          </>
        }
        details="Students assigned to this section may need to be reassigned. This can’t be undone."
        cancelLabel="Keep section"
        confirmLabel="Delete section"
        confirmColor="error"
        loading={deleting}
        loadingLabel="Deleting…"
        onClose={() => setSectionToDelete(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
