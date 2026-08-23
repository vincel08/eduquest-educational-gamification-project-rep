import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import classSectionService from "../../services/classSectionService";
import userService from "../../services/userService";
import { getErrorMessage } from "../../services/api";
import { GRADE_LEVELS } from "../../utils/gradeLevels";
import {
  defaultSchoolYearValue,
  listSchoolYearOptions,
} from "../../utils/schoolYears";
import { notifyClassSectionsChanged } from "../../utils/classSectionsEvents";

const emptyForm = {
  schoolYear: defaultSchoolYearValue(),
  gradeLevel: "Grade 7",
  name: "",
  adviserId: "",
};

export default function AdminSectionsPage() {
  const schoolYearOptions = useMemo(
    () => listSchoolYearOptions({ includeAll: false }),
    [],
  );
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const [sectionsRes, teachersRes] = await Promise.all([
      classSectionService.list({ limit: 200 }),
      userService.list({ role: "teacher", limit: 100 }),
    ]);
    setSections(sectionsRes.data.data.sections || []);
    setTeachers(teachersRes.data.data.users || []);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
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
      if (editingId) {
        await classSectionService.update(editingId, payload);
        setMessage("Section updated");
      } else {
        await classSectionService.create(payload);
        setMessage("Section created");
      }
      resetForm();
      await load();
      notifyClassSectionsChanged();
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
      await load();
      notifyClassSectionsChanged();
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
              label="School Year"
              required
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
              label="Grade Level"
              required
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
              label="Section name"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. A, Newton"
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
                <TableCell align="right">Actions</TableCell>
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
                    <Button size="small" onClick={() => startEdit(section)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setSectionToDelete(section)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!sections.length ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    No class sections yet. Add one above.
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
