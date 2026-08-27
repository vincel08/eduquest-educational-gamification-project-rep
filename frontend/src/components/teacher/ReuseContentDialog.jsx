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
 * Reuse a quiz/game from the teacher's bank into a target subject (deep copy).
 */
export default function ReuseContentDialog({
  open,
  onClose,
  onConfirm,
  itemTitle = "",
  itemSubtitle = "",
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
            Creates a new draft copy in the subject you choose. The original
            stays unchanged. Students will not see the copy until you publish
            it.
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
            label="Target subject"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            disabled={loading || !courses.length}
          >
            {!courses.length ? (
              <MenuItem value="" disabled>
                No subjects available
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
