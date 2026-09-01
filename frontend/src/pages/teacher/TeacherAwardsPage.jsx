import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PageHeader from "../../components/common/PageHeader";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import courseService from "../../services/courseService";
import gamificationService from "../../services/gamificationService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";
import { BADGE_ICON_OPTIONS } from "../../utils/badgeIcons";

const emptyBadgeForm = {
  name: "",
  description: "",
  icon: "emoji_events",
  color: "#0F766E",
};

const COLOR_OPTIONS = [
  "#0F766E",
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#66BB6A",
  "#FFB300",
];

export default function TeacherAwardsPage() {
  const { toQueryParams, schoolYear, gradeLevel, section } = useTeacherFilters();
  const [badges, setBadges] = useState([]);
  const [students, setStudents] = useState([]);
  const [badgeForm, setBadgeForm] = useState(emptyBadgeForm);
  const [editingId, setEditingId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [awardForm, setAwardForm] = useState({ studentId: "", badgeId: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadBadges() {
    const badgesRes = await gamificationService.badges();
    setBadges(badgesRes.data.data || []);
  }

  useEffect(() => {
    async function load() {
      try {
        const filterParams = toQueryParams();
        const courseParams = { limit: 50 };
        if (filterParams.gradeLevel) {
          courseParams.gradeLevel = filterParams.gradeLevel;
        }
        const [badgesRes, coursesRes] = await Promise.all([
          gamificationService.badges(),
          courseService.list(courseParams),
        ]);
        setBadges(badgesRes.data.data || []);

        const courses = coursesRes.data.data.courses || [];
        const enrollmentGroups = await Promise.all(
          courses.map((course) =>
            courseService.enrollments(course.id, filterParams),
          ),
        );
        const map = new Map();
        enrollmentGroups.forEach((response) => {
          (response.data.data || []).forEach((student) => {
            map.set(student.student_id, student);
          });
        });
        setStudents(Array.from(map.values()));
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }
    load();
  }, [schoolYear, gradeLevel, section, toQueryParams]);

  function openCreate() {
    setEditingId(null);
    setBadgeForm(emptyBadgeForm);
    setDialogError("");
    setDialogOpen(true);
  }

  function openEdit(badge) {
    setEditingId(badge.id);
    setBadgeForm({
      name: badge.name,
      description: badge.description || "",
      icon: badge.icon || "emoji_events",
      color: badge.color || "#0F766E",
    });
    setDialogError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
    setEditingId(null);
    setBadgeForm(emptyBadgeForm);
    setDialogError("");
  }

  async function handleSaveBadge(event) {
    event.preventDefault();
    setSaving(true);
    setDialogError("");
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await gamificationService.updateBadge(editingId, badgeForm);
        setMessage("Custom badge updated.");
      } else {
        await gamificationService.createBadge(badgeForm);
        setMessage("Custom badge created. You can award it to students below.");
      }
      setDialogOpen(false);
      setBadgeForm(emptyBadgeForm);
      setEditingId(null);
      await loadBadges();
    } catch (err) {
      setDialogError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const response = await gamificationService.deleteBadge(deleteTarget.id);
      const result = response.data.data || {};
      setMessage(
        result.soft
          ? `"${deleteTarget.name}" deleted. Students who already received it keep it.`
          : `"${deleteTarget.name}" deleted.`,
      );
      if (Number(awardForm.badgeId) === Number(deleteTarget.id)) {
        setAwardForm((prev) => ({ ...prev, badgeId: "" }));
      }
      setDeleteTarget(null);
      await loadBadges();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAward(event) {
    event.preventDefault();
    setAwarding(true);
    setError("");
    setMessage("");
    try {
      await gamificationService.awardBadge({
        studentId: Number(awardForm.studentId),
        badgeId: Number(awardForm.badgeId),
      });
      setMessage("Badge awarded successfully.");
      setAwardForm((prev) => ({ ...prev, studentId: "" }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAwarding(false);
    }
  }

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "flex-start" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <PageHeader
          title="Custom Badges"
          subtitle="Create your own recognition badges and award them to students. Unlockable system badges are managed by admin."
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
        >
          Create Badge
        </Button>
      </Stack>

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

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your badges
        </Typography>
        <ResponsiveTableContainer>
          <Table sx={{ minWidth: 480 }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {badges.map((badge) => (
                <TableRow key={badge.id}>
                  <TableCell>
                    <Chip
                      size="small"
                      label={badge.name}
                      sx={{
                        bgcolor: badge.color || "primary.main",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell>{badge.description}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        aria-label={`Edit badge ${badge.name}`}
                        onClick={() => openEdit(badge)}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Delete badge ${badge.name}`}
                        onClick={() => setDeleteTarget(badge)}
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!badges.length ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography color="text.secondary">
                      No custom badges yet. Create one to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </ResponsiveTableContainer>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Award a badge
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack component="form" spacing={2} onSubmit={handleAward}>
          <TextField
            select
            label="Student"
            value={awardForm.studentId}
            onChange={(e) =>
              setAwardForm((p) => ({ ...p, studentId: e.target.value }))
            }
          >
            {students.map((student) => (
              <MenuItem key={student.student_id} value={student.student_id}>
                {student.first_name} {student.last_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Your badge"
            value={awardForm.badgeId}
            onChange={(e) =>
              setAwardForm((p) => ({ ...p, badgeId: e.target.value }))
            }
          >
            {badges.map((badge) => (
              <MenuItem key={badge.id} value={badge.id}>
                {badge.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            type="submit"
            variant="contained"
            disabled={
              awarding ||
              !awardForm.studentId ||
              !awardForm.badgeId ||
              !badges.length
            }
          >
            {awarding ? "Awarding..." : "Award Badge"}
          </Button>
        </Stack>
        {!students.length ? (
          <Typography sx={{ mt: 2 }} color="text.secondary">
            No enrolled students found yet.
          </Typography>
        ) : null}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <DialogTitle>
          {editingId ? "Edit Custom Badge" : "Create Custom Badge"}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveBadge}>
          <DialogContent dividers>
            {dialogError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {dialogError}
              </Alert>
            ) : null}
            <Stack spacing={2}>
              <TextField
                label="Name"
                required
                fullWidth
                value={badgeForm.name}
                onChange={(e) =>
                  setBadgeForm((p) => ({ ...p, name: e.target.value }))
                }
              />
              <TextField
                label="Description"
                required
                fullWidth
                multiline
                minRows={2}
                value={badgeForm.description}
                onChange={(e) =>
                  setBadgeForm((p) => ({ ...p, description: e.target.value }))
                }
              />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Icon
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={badgeForm.icon}
                  onChange={(_e, value) => {
                    if (!value) return;
                    setBadgeForm((p) => ({ ...p, icon: value }));
                  }}
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    "& .MuiToggleButtonGroup-grouped": {
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "12px !important",
                      margin: 0,
                    },
                  }}
                >
                  {BADGE_ICON_OPTIONS.map(({ key, label, Icon }) => (
                    <ToggleButton
                      key={key}
                      value={key}
                      aria-label={label}
                      sx={{
                        width: 56,
                        height: 56,
                        color: badgeForm.color,
                        "&.Mui-selected": {
                          bgcolor: `${badgeForm.color}22`,
                          borderColor: badgeForm.color,
                          color: badgeForm.color,
                        },
                      }}
                    >
                      <Stack alignItems="center" spacing={0.25}>
                        <Icon fontSize="small" />
                        <Typography
                          variant="caption"
                          sx={{ fontSize: 9, lineHeight: 1 }}
                        >
                          {label}
                        </Typography>
                      </Stack>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Color
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {COLOR_OPTIONS.map((color) => (
                    <Box
                      key={color}
                      component="button"
                      type="button"
                      aria-label={`Select color ${color}`}
                      onClick={() => setBadgeForm((p) => ({ ...p, color }))}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        bgcolor: color,
                        border:
                          badgeForm.color === color
                            ? "3px solid #fff"
                            : "2px solid transparent",
                        outline:
                          badgeForm.color === color
                            ? `2px solid ${color}`
                            : "none",
                        cursor: "pointer",
                        p: 0,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Badge"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete badge?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? Students who already received it will keep it.`
            : ""
        }
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        loadingLabel="Deleting…"
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />
    </>
  );
}
