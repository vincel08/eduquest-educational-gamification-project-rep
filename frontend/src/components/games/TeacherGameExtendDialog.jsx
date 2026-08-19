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
import gameService from "../../services/gameService";
import { getErrorMessage } from "../../services/api";

export default function TeacherGameExtendDialog({
  open,
  onClose,
  game,
  students = [],
  initialStudentId = "",
  onGranted,
}) {
  const [studentId, setStudentId] = useState("");
  const [extraAttempts, setExtraAttempts] = useState(1);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setStudentId(initialStudentId ? String(initialStudentId) : "");
    setExtraAttempts(1);
    setReason("");
  }, [open, initialStudentId, game]);

  async function handleSave() {
    setError("");
    if (!studentId) {
      setError("Choose a student.");
      return;
    }
    if (Number(extraAttempts) <= 0) {
      setError("Choose at least one extra attempt.");
      return;
    }
    setSaving(true);
    try {
      await gameService.grantOverride(game.id, {
        studentId: Number(studentId),
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
      <DialogTitle>Extend / reopen game access</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Games allow 3 attempts by default. Grant extra attempts for one
            student so they can play again. Reason is saved for audit.
          </Typography>
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
            select
            label="Extra attempts"
            fullWidth
            value={extraAttempts}
            onChange={(e) => setExtraAttempts(Number(e.target.value))}
            helperText="Added on top of the normal 3 attempts (max +3)"
          >
            {[1, 2, 3].map((n) => (
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
            placeholder="e.g. Absent for illness — makeup play"
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
