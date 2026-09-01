import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import quizService from "../../services/quizService";
import { getErrorMessage } from "../../services/api";

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultExtendedDue(classDueAt) {
  const base = classDueAt ? new Date(classDueAt) : new Date();
  if (Number.isNaN(base.getTime()) || base.getTime() < Date.now()) {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    return toDatetimeLocalValue(next);
  }
  const extended = new Date(base);
  extended.setDate(extended.getDate() + 7);
  return toDatetimeLocalValue(extended);
}

export default function TeacherQuizExtendDialog({
  open,
  onClose,
  quiz,
  students = [],
  initialStudentId = "",
  onGranted,
}) {
  const [studentId, setStudentId] = useState("");
  const [extendedDueAt, setExtendedDueAt] = useState("");
  const [extraAttempts, setExtraAttempts] = useState(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setStudentId(initialStudentId ? String(initialStudentId) : "");
    setExtendedDueAt(defaultExtendedDue(quiz?.due_at || quiz?.dueAt));
    setExtraAttempts(1);
    setReason("");
  }, [open, initialStudentId, quiz]);

  async function handleSave() {
    setError("");
    if (!studentId) {
      setError("Choose a student.");
      return;
    }
    if (!extendedDueAt && Number(extraAttempts) <= 0) {
      setError("Set an extended due date and/or extra attempts.");
      return;
    }
    setSaving(true);
    try {
      await quizService.grantOverride(quiz.id, {
        studentId: Number(studentId),
        extendedDueAt: extendedDueAt
          ? new Date(extendedDueAt).toISOString()
          : null,
        extraAttempts: Number(extraAttempts) || 0,
        reason: reason.trim() || null,
      });
      onGranted?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Extend / reopen quiz access</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Class due stays the same for everyone. This only extends access for
            one student (new due date and/or extra attempts). Reason is saved
            for audit.
          </Typography>
          {quiz?.due_at || quiz?.dueAt ? (
            <Typography variant="body2">
              Class due: {new Date(quiz.due_at || quiz.dueAt).toLocaleString()}
            </Typography>
          ) : (
            <Typography variant="body2">No class due date set.</Typography>
          )}
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            label="Student"
            fullWidth
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.map((student) => (
              <MenuItem
                key={student.id || student.studentId}
                value={String(student.id || student.studentId)}
              >
                {student.firstName || student.first_name}{" "}
                {student.lastName || student.last_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Extended due date"
            type="datetime-local"
            fullWidth
            value={extendedDueAt}
            onChange={(e) => setExtendedDueAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                "aria-label": "Extended due date",
              },
            }}
            helperText="Required if the class due date has already passed"
          />
          <TextField
            select
            label="Extra attempts"
            fullWidth
            value={extraAttempts}
            onChange={(e) => setExtraAttempts(Number(e.target.value))}
            helperText="Added on top of the normal 3 attempts (max +3)"
          >
            {[0, 1, 2, 3].map((n) => (
              <MenuItem key={n} value={n}>
                +{n}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Reason (optional)"
            fullWidth
            multiline
            minRows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Absent for illness — makeup week"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Grant extension"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
