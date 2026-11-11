import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Chip,
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
import ConfirmDialog from "../../components/common/ConfirmDialog";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import schoolYearService from "../../services/schoolYearService";
import { getErrorMessage } from "../../services/api";
import { useSchoolYear } from "../../contexts/SchoolYearContext";
import {
  managedSchoolYearError,
  normalizeManagedSchoolYear,
  parseSchoolYearLabel,
  schoolYearChoiceMissing,
  schoolYearTiming,
} from "../../utils/schoolYears";

const TIMING_LABEL = {
  previous: "Previous",
  current: "Current",
  future: "Future",
};

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

function yearSpan(startYear) {
  return `June 1, ${startYear} – April 30, ${startYear + 1}`;
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
  const [years, setYears] = useState([]);
  const [yearsError, setYearsError] = useState("");
  const [yearsLoading, setYearsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addMessage, setAddMessage] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const listRequest = useRef(0);

  useEffect(() => {
    setSelected(schoolYear);
  }, [schoolYear]);

  async function loadYears() {
    const requestId = listRequest.current + 1;
    listRequest.current = requestId;
    setYearsError("");
    try {
      const response = await schoolYearService.listYears();
      if (listRequest.current !== requestId) return;
      setYears(response.data.data?.years || []);
    } catch (err) {
      if (listRequest.current !== requestId) return;
      setYearsError(getErrorMessage(err, "Unable to load school years"));
    } finally {
      if (listRequest.current === requestId) setYearsLoading(false);
    }
  }

  useEffect(() => {
    loadYears();
  }, [schoolYear]);

  const choices = settableYears.length
    ? settableYears
    : [{ value: schoolYear, label: `SY ${schoolYear}` }];
  const advancing = selected && schoolYear && selected > schoolYear;
  const reverting = selected && schoolYear && selected < schoolYear;
  const unchanged = selected === schoolYear;
  const normalizedDraft = normalizeManagedSchoolYear(draft);
  const draftError = draft.trim() ? managedSchoolYearError(normalizedDraft) : "";
  const draftTiming = schoolYearTiming(normalizedDraft);
  const knownYears = useMemo(
    () => new Set(years.map((year) => year.schoolYear)),
    [years],
  );

  const suggestions = useMemo(() => {
    const starts = years
      .map((year) => Number(year.startYear))
      .filter((year) => Number.isInteger(year));
    const calendarStart = parseSchoolYearLabel(calendarSchoolYear);
    const earliest = starts.length ? Math.min(...starts) : calendarStart;
    const latest = starts.length ? Math.max(...starts) : calendarStart;
    const rows = [
      { kind: "previous", startYear: earliest != null ? earliest - 1 : null },
      { kind: "current", startYear: calendarStart },
      { kind: "future", startYear: latest != null ? latest + 1 : null },
    ];
    return rows.map((row) => {
      const label =
        row.startYear != null
          ? `${row.startYear}-${row.startYear + 1}`
          : "";
      return {
        ...row,
        label,
        disabled: !label || Boolean(managedSchoolYearError(label)) || knownYears.has(label),
      };
    });
  }, [years, calendarSchoolYear, knownYears]);

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

  async function addSchoolYear(event) {
    event.preventDefault();
    setAddError("");
    setAddMessage("");
    if (!normalizedDraft || draftError) {
      setAddError(draftError || "Use a school year like 2026-2027.");
      return;
    }
    setAdding(true);
    try {
      const response = await schoolYearService.addYear(normalizedDraft);
      const data = response.data.data || {};
      applySnapshot(data, { notify: false });
      setDraft("");
      setAddMessage(
        response.data.message ||
          `Added SY ${normalizedDraft}. The current school year is still SY ${data.schoolYear || schoolYear}.`,
      );
      await loadYears();
    } catch (err) {
      setAddError(getErrorMessage(err, "Unable to add the school year"));
    } finally {
      setAdding(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    setAddError("");
    setAddMessage("");
    try {
      const response = await schoolYearService.removeYear(removeTarget.startYear);
      const data = response.data.data || {};
      applySnapshot(data, { notify: false });
      setAddMessage(
        response.data.message ||
          `Removed SY ${removeTarget.schoolYear}. The current school year is still SY ${data.schoolYear || schoolYear}.`,
      );
      setRemoveTarget(null);
      await loadYears();
    } catch (err) {
      setAddError(getErrorMessage(err, "Unable to remove the school year"));
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="School Years"
        subtitle="Add previous, current, and future school years. The current school year setting stays until you change it."
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <Typography variant="h6" fontWeight={800}>
            Current school year
          </Typography>
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
            {schoolYearChoiceMissing(choices, selected) ? (
              <MenuItem value={selected}>SY {selected}</MenuItem>
            ) : null}
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

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack component="form" spacing={2} onSubmit={addSchoolYear}>
          <Typography variant="h6" fontWeight={800}>
            Add a school year
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Previous years keep older records. The current year matches the
            system school year. Future years can be used for subjects and
            sections before June 1. Adding a year does not move students or
            change the current school year.
          </Typography>
          {addError ? <Alert severity="error">{addError}</Alert> : null}
          {addMessage ? <Alert severity="success">{addMessage}</Alert> : null}
          {yearsError ? <Alert severity="error">{yearsError}</Alert> : null}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.kind}
                type="button"
                variant="outlined"
                disabled={yearsLoading || suggestion.disabled || adding}
                onClick={() => {
                  setDraft(suggestion.label);
                  setAddError("");
                  setAddMessage("");
                }}
              >
                {TIMING_LABEL[suggestion.kind]}
                {suggestion.label ? ` · SY ${suggestion.label}` : ""}
              </Button>
            ))}
          </Stack>
          <TextField
            label="School year"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setAddError("");
              setAddMessage("");
            }}
            placeholder="2027-2028"
            helperText={
              draftError ||
              (draftTiming
                ? `${TIMING_LABEL[draftTiming]} school year. The current setting stays SY ${schoolYear}.`
                : "Use a label like 2025-2026, or the starting year 2025.")
            }
            error={Boolean(draftError)}
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            disabled={adding || !draft.trim() || Boolean(draftError)}
            sx={{ alignSelf: { sm: "flex-start" } }}
          >
            {adding ? "Adding school year..." : "Add school year"}
          </Button>
        </Stack>

        <ResponsiveTableContainer sx={{ mt: 2 }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>School year</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Dates</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Timing</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Records</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {yearsLoading && !years.length ? (
                <TableRow>
                  <TableCell colSpan={5}>Loading school years...</TableCell>
                </TableRow>
              ) : null}
              {!yearsLoading && !years.length ? (
                <TableRow>
                  <TableCell colSpan={5}>No school years yet.</TableCell>
                </TableRow>
              ) : null}
              {years.map((year) => (
                    <TableRow key={year.schoolYear} hover>
                      <TableCell>
                        <Typography fontWeight={700}>SY {year.schoolYear}</Typography>
                        {year.isCurrentSetting ? (
                          <Typography variant="caption" color="text.secondary">
                            Current setting
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>{yearSpan(year.startYear)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={TIMING_LABEL[year.timing] || "School year"}
                          color={
                            year.timing === "future"
                              ? "info"
                              : year.timing === "previous"
                                ? "default"
                                : "primary"
                          }
                          variant={year.timing === "previous" ? "outlined" : "filled"}
                        />
                      </TableCell>
                      <TableCell>{year.used || 0}</TableCell>
                      <TableCell align="right">
                        {year.canRemove ? (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => setRemoveTarget(year)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </ResponsiveTableContainer>
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
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={removeTarget ? `Remove SY ${removeTarget.schoolYear}?` : "Remove school year?"}
        description="This only removes an unused school year from the list. The current school year setting stays the same."
        confirmLabel="Remove school year"
        confirmColor="error"
        loading={removing}
        loadingLabel="Removing..."
        onClose={() => {
          if (!removing) setRemoveTarget(null);
        }}
        onConfirm={confirmRemove}
      />
    </Stack>
  );
}
