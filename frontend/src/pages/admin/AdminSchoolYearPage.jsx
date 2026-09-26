import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import schoolYearService from "../../services/schoolYearService";
import { getErrorMessage } from "../../services/api";
import { useSchoolYear } from "../../contexts/SchoolYearContext";

function formatDate(value) {
  const parsed =
    value instanceof Date
      ? value
      : new Date(String(value || "").replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function inclusiveEnd(value) {
  if (!value) return "";
  const parsed = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setDate(parsed.getDate() - 1);
  return formatDate(parsed);
}

export default function AdminSchoolYearPage() {
  const {
    schoolYear,
    calendarSchoolYear,
    nextSchoolYear,
    start,
    endExclusive,
    settableYears,
    applySnapshot,
  } = useSchoolYear();
  const [selected, setSelected] = useState(schoolYear);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSelected(schoolYear);
  }, [schoolYear]);

  const choices = settableYears.length
    ? settableYears
    : [{ value: schoolYear, label: `SY ${schoolYear}` }];
  const advancing = selected && schoolYear && selected > schoolYear;
  const reverting = selected && schoolYear && selected < schoolYear;
  const unchanged = selected === schoolYear;

  async function saveSchoolYear() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await schoolYearService.update(selected);
      const data = response.data.data || {};
      applySnapshot(data, { notify: true });
      setSelected(data.schoolYear || selected);
      setMessage(response.data.message || `School year is now SY ${selected}.`);
      setConfirmOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update the school year"));
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!selected || unchanged) return;
    if (advancing || reverting) {
      setConfirmOpen(true);
      return;
    }
    saveSchoolYear();
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="School Year"
        subtitle="Set the school year used for registration, subjects, and class sections."
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <Typography>
            Current school year is <strong>SY {schoolYear}</strong>
            {start && endExclusive
              ? `, ${formatDate(start)} through ${inclusiveEnd(endExclusive)}`
              : ""}
            .
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The system school year is{" "}
            <strong>SY {calendarSchoolYear || schoolYear}</strong>. A school
            year can be set only after that year has started on June 1.
            {nextSchoolYear
              ? ` SY ${nextSchoolYear} becomes available on June 1, ${nextSchoolYear.slice(0, 4)}.`
              : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Moving to a later school year closes that year's subjects, quizzes,
            and games for new work, copies class sections, and moves students
            onto the new year. Setting an earlier school year moves students
            back and reopens the subjects, quizzes, and games closed for that
            year. Lessons, scores, and gradebook records stay available.
          </Typography>
          <TextField
            select
            label="School year"
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setMessage("");
            }}
            fullWidth
          >
            {choices.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
                {option.value === schoolYear ? " (current)" : ""}
              </MenuItem>
            ))}
          </TextField>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || unchanged || !selected}
            sx={{ alignSelf: { sm: "flex-start" } }}
          >
            {saving ? "Updating school year..." : "Update school year"}
          </Button>
        </Stack>
      </Paper>
      <ConfirmDialog
        open={confirmOpen}
        title={
          reverting
            ? `Move back to SY ${selected}?`
            : `Move to SY ${selected}?`
        }
        description={
          reverting
            ? `Students on SY ${schoolYear} will move back to SY ${selected}. Subjects, quizzes, and games that were closed for SY ${selected} will be available again. Lessons, scores, and gradebook records stay in place.`
            : `Subjects, quizzes, and games for SY ${schoolYear} will be closed for new work. Class sections will be copied to SY ${selected}, and students on SY ${schoolYear} will move to the new school year. Their lessons, scores, and gradebook records from SY ${schoolYear} stay available.`
        }
        confirmLabel="Update school year"
        loading={saving}
        loadingLabel="Updating..."
        onClose={() => {
          if (!saving) setConfirmOpen(false);
        }}
        onConfirm={saveSchoolYear}
      />
    </Stack>
  );
}
