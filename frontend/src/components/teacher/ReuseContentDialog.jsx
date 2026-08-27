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
  useMediaQuery,
  useTheme,
} from "@mui/material";

/**
 * Reuse a quiz/game from the teacher's bank into the same subject
 * (typically another school year / grade offering).
 */
export default function ReuseContentDialog({
  open,
  onClose,
  onConfirm,
  itemTitle = "",
  itemSubtitle = "",
  sourceSubjectLabel = "",
  courses = [],
  loading = false,
  error = "",
  contentLabel = "item",
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    setCourseId(courses[0]?.id ? String(courses[0].id) : "");
    setTitle(itemTitle ? `${itemTitle} (Copy)` : "");
  }, [open, itemTitle, courses]);

  function handleConfirm() {
    if (!courseId) return;
    onConfirm?.({
      courseId: Number(courseId),
      title: title.trim() || undefined,
    });
  }

  return (
    <Dialog
      open={Boolean(open)}
      onClose={() => {
        if (loading) return;
        onClose?.();
      }}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
    >
      <DialogTitle>Reuse {contentLabel}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Copies into another offering of the{" "}
            <strong>{sourceSubjectLabel || "same subject"}</strong> only
            (for example, last year&apos;s Math → this year&apos;s Math). The
            original stays unchanged. Students will not see the copy until you
            publish it.
          </Typography>
          {itemTitle ? (
            <Typography fontWeight={700}>
              {itemTitle}
              {itemSubtitle ? (
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: "block", fontWeight: 400 }}
                >
                  {itemSubtitle}
                </Typography>
              ) : null}
            </Typography>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            required
            fullWidth
            label={`Target ${sourceSubjectLabel || "subject"} offering`}
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            disabled={loading || !courses.length}
            helperText={
              courses.length
                ? "Same subject only — pick grade / school year offering"
                : "No matching subject offerings found. Create this subject for the target school year first."
            }
          >
            {!courses.length ? (
              <MenuItem value="" disabled>
                No matching subject offerings
              </MenuItem>
            ) : (
              courses.map((course) => (
                <MenuItem key={course.id} value={String(course.id)}>
                  {course.subject || course.title}
                  {course.grade_level ? ` · ${course.grade_level}` : ""}
                  {course.school_year ? ` · SY ${course.school_year}` : ""}
                </MenuItem>
              ))
            )}
          </TextField>
          <TextField
            fullWidth
            label="New title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={loading}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading || !courseId || !courses.length}
        >
          {loading ? "Copying…" : "Copy into subject"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
