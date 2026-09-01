import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
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
import LoadingScreen from "../../components/common/LoadingScreen";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import gamificationService from "../../services/gamificationService";
import { getErrorMessage } from "../../services/api";
import { BADGE_ICON_OPTIONS } from "../../utils/badgeIcons";

const BADGE_CRITERIA = [
  { value: "xp", label: "XP" },
  { value: "quizzes_passed", label: "Quizzes Passed" },
  { value: "lessons_completed", label: "Lessons Completed" },
  { value: "streak", label: "Streak" },
  { value: "games_completed", label: "Games Completed" },
  { value: "level", label: "Reach Level" },
  { value: "leaderboard_rank", label: "Leaderboard Top Rank" },
  { value: "perfect_quiz", label: "Perfect Quiz Score" },
];

const MEDAL_CRITERIA = [
  { value: "level", label: "Reach Level" },
  { value: "leaderboard_rank", label: "Leaderboard Top Rank" },
  { value: "perfect_quiz", label: "Perfect Quiz Score" },
  { value: "xp", label: "Earn XP (major)" },
  { value: "streak", label: "Long Streak" },
  { value: "quizzes_passed", label: "Quizzes Passed (major)" },
  { value: "lessons_completed", label: "Lessons Completed (major)" },
  { value: "games_completed", label: "Games Completed" },
];

/** Medals are major achievements — higher floors than badges. */
const MEDAL_CRITERIA_MIN = {
  level: 5,
  leaderboard_rank: 1,
  perfect_quiz: 1,
  xp: 500,
  streak: 7,
  quizzes_passed: 5,
  lessons_completed: 5,
  games_completed: 5,
};

function medalCriteriaMin(criteriaType) {
  return MEDAL_CRITERIA_MIN[criteriaType] ?? 5;
}

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const TIERS = [
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "diamond", label: "Diamond" },
  { value: "legendary", label: "Legendary" },
];

const BADGE_CRITERIA_LABELS = Object.fromEntries(
  BADGE_CRITERIA.map((item) => [item.value, item.label]),
);
const MEDAL_CRITERIA_LABELS = Object.fromEntries(
  MEDAL_CRITERIA.map((item) => [item.value, item.label]),
);
const DIFFICULTY_LABELS = Object.fromEntries(
  DIFFICULTIES.map((item) => [item.value, item.label]),
);
const TIER_LABELS = Object.fromEntries(
  TIERS.map((item) => [item.value, item.label]),
);

const COLOR_OPTIONS = [
  "#FFB300",
  "#42A5F5",
  "#66BB6A",
  "#AB47BC",
  "#EF4444",
  "#0F766E",
  "#F59E0B",
  "#3B82F6",
];

const CRITERIA_WITH_DIFFICULTY = new Set(["quizzes_passed", "games_completed"]);

const emptyBadgeForm = {
  name: "",
  description: "",
  icon: "emoji_events",
  color: "#FFB300",
  criteriaType: "xp",
  criteriaValue: 100,
  difficulty: "",
  xpBonus: 0,
  isActive: true,
};

const emptyMedalForm = {
  name: "",
  description: "",
  icon: "military_tech",
  tier: "gold",
  criteriaType: "level",
  criteriaValue: 5,
  isActive: true,
};

function IconPicker({ value, color, onChange }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Icon
      </Typography>
      <ToggleButtonGroup
        exclusive
        value={value}
        onChange={(_e, next) => {
          if (!next) return;
          onChange(next);
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
              color,
              "&.Mui-selected": {
                bgcolor: `${color}22`,
                borderColor: color,
                color,
              },
            }}
          >
            <Stack alignItems="center" spacing={0.25}>
              <Icon fontSize="small" />
              <Typography variant="caption" sx={{ fontSize: 9, lineHeight: 1 }}>
                {label}
              </Typography>
            </Stack>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

function ColorPicker({ value, onChange }) {
  return (
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
            onClick={() => onChange(color)}
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: color,
              border:
                value === color ? "3px solid #fff" : "2px solid transparent",
              outline: value === color ? `2px solid ${color}` : "none",
              cursor: "pointer",
              p: 0,
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}

export default function AdminBadgesPage() {
  const [tab, setTab] = useState("badges");
  const [badges, setBadges] = useState([]);
  const [medals, setMedals] = useState([]);
  const [badgeForm, setBadgeForm] = useState(emptyBadgeForm);
  const [medalForm, setMedalForm] = useState(emptyMedalForm);
  const [editingBadgeId, setEditingBadgeId] = useState(null);
  const [editingMedalId, setEditingMedalId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBadgeTarget, setDeleteBadgeTarget] = useState(null);
  const [deleteMedalTarget, setDeleteMedalTarget] = useState(null);

  async function load() {
    const [badgesRes, medalsRes] = await Promise.all([
      gamificationService.badges(),
      gamificationService.medals(),
    ]);
    setBadges(badgesRes.data.data || []);
    setMedals(medalsRes.data.data || []);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setDialogError("");
    if (tab === "badges") {
      setEditingBadgeId(null);
      setBadgeForm(emptyBadgeForm);
    } else {
      setEditingMedalId(null);
      setMedalForm(emptyMedalForm);
    }
    setDialogOpen(true);
  }

  function openEditBadge(badge) {
    setEditingBadgeId(badge.id);
    setBadgeForm({
      name: badge.name,
      description: badge.description || "",
      icon: badge.icon || "emoji_events",
      color: badge.color || "#FFB300",
      criteriaType: badge.criteria_type,
      criteriaValue: badge.criteria_value || 1,
      difficulty: badge.difficulty || "",
      xpBonus: badge.xp_bonus || 0,
      isActive: Boolean(badge.is_active),
    });
    setDialogError("");
    setDialogOpen(true);
  }

  function openEditMedal(medal) {
    setEditingMedalId(medal.id);
    setMedalForm({
      name: medal.name,
      description: medal.description || "",
      icon: medal.icon || "military_tech",
      tier: medal.tier || "gold",
      criteriaType: medal.criteria_type,
      criteriaValue: medal.criteria_value || 1,
      isActive: Boolean(medal.is_active),
    });
    setDialogError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
    setEditingBadgeId(null);
    setEditingMedalId(null);
    setBadgeForm(emptyBadgeForm);
    setMedalForm(emptyMedalForm);
    setDialogError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setDialogError("");
    setError("");
    setMessage("");
    try {
      if (tab === "badges") {
        if (editingBadgeId) {
          await gamificationService.updateBadge(editingBadgeId, badgeForm);
          setMessage("Unlockable badge updated.");
        } else {
          await gamificationService.createBadge(badgeForm);
          setMessage("Unlockable badge created.");
        }
      } else {
        const criteriaValue =
          medalForm.criteriaType === "perfect_quiz"
            ? 1
            : Number(medalForm.criteriaValue);
        const minValue = medalCriteriaMin(medalForm.criteriaType);
        if (
          medalForm.criteriaType !== "perfect_quiz" &&
          (!Number.isFinite(criteriaValue) || criteriaValue < minValue)
        ) {
          setDialogError(
            `Medal criteria must be at least ${minValue} (major achievement)`,
          );
          setSaving(false);
          return;
        }
        const payload = {
          ...medalForm,
          criteriaValue,
        };
        if (editingMedalId) {
          await gamificationService.updateMedal(editingMedalId, payload);
          setMessage("Medal updated.");
        } else {
          await gamificationService.createMedal(payload);
          setMessage("Medal created.");
        }
      }
      setDialogOpen(false);
      setEditingBadgeId(null);
      setEditingMedalId(null);
      setBadgeForm(emptyBadgeForm);
      setMedalForm(emptyMedalForm);
      await load();
    } catch (err) {
      setDialogError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBadge() {
    if (!deleteBadgeTarget) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const response = await gamificationService.deleteBadge(
        deleteBadgeTarget.id,
      );
      const result = response.data.data || {};
      setMessage(
        result.soft
          ? `"${deleteBadgeTarget.name}" deleted. Students who already unlocked it keep it.`
          : `"${deleteBadgeTarget.name}" deleted.`,
      );
      setDeleteBadgeTarget(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteBadgeTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteMedal() {
    if (!deleteMedalTarget) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const response = await gamificationService.deleteMedal(
        deleteMedalTarget.id,
      );
      const result = response.data.data || {};
      setMessage(
        result.soft
          ? `"${deleteMedalTarget.name}" deleted. Students who already earned it keep it.`
          : `"${deleteMedalTarget.name}" deleted.`,
      );
      setDeleteMedalTarget(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleteMedalTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  const isBadgeTab = tab === "badges";
  const editing = isBadgeTab
    ? Boolean(editingBadgeId)
    : Boolean(editingMedalId);

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
          title="Badges & Medals"
          subtitle="Badges are everyday unlocks. Medals are bigger achievements — levels, ranking, and perfect quizzes."
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
        >
          {isBadgeTab ? "Create Badge" : "Create Medal"}
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

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_e, value) => setTab(value)}
          variant="fullWidth"
        >
          <Tab value="badges" label={`Badges (${badges.length})`} />
          <Tab value="medals" label={`Medals (${medals.length})`} />
        </Tabs>
      </Paper>

      {isBadgeTab ? (
        <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
          <ResponsiveTableContainer>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Criteria</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Difficulty</TableCell>
                  <TableCell>XP Bonus</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {badges.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell>{badge.name}</TableCell>
                    <TableCell>
                      {BADGE_CRITERIA_LABELS[badge.criteria_type] ||
                        badge.criteria_type}
                    </TableCell>
                    <TableCell>{badge.criteria_value}</TableCell>
                    <TableCell>
                      {badge.difficulty
                        ? DIFFICULTY_LABELS[badge.difficulty] ||
                          badge.difficulty
                        : "—"}
                    </TableCell>
                    <TableCell>{badge.xp_bonus}</TableCell>
                    <TableCell>{badge.is_active ? "Yes" : "No"}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit badge ${badge.name}`}
                          onClick={() => openEditBadge(badge)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete badge ${badge.name}`}
                          onClick={() => setDeleteBadgeTarget(badge)}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!badges.length ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary">
                        No unlockable badges yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        </Paper>
      ) : (
        <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, px: 0.5 }}
          >
            Medals mark major milestones — harder or rarer than regular badges.
          </Typography>
          <ResponsiveTableContainer>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Criteria</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {medals.map((medal) => (
                  <TableRow key={medal.id}>
                    <TableCell>{medal.name}</TableCell>
                    <TableCell>
                      {TIER_LABELS[medal.tier] || medal.tier}
                    </TableCell>
                    <TableCell>
                      {MEDAL_CRITERIA_LABELS[medal.criteria_type] ||
                        medal.criteria_type}
                    </TableCell>
                    <TableCell>
                      {medal.criteria_type === "perfect_quiz"
                        ? "100%"
                        : medal.criteria_value}
                    </TableCell>
                    <TableCell>{medal.is_active ? "Yes" : "No"}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit medal ${medal.name}`}
                          onClick={() => openEditMedal(medal)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete medal ${medal.name}`}
                          onClick={() => setDeleteMedalTarget(medal)}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!medals.length ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary">
                        No medals yet. Create major achievements here.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        </Paper>
      )}

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <DialogTitle>
          {isBadgeTab
            ? editing
              ? "Edit Unlockable Badge"
              : "Create Unlockable Badge"
            : editing
              ? "Edit Medal"
              : "Create Medal"}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent dividers>
            {dialogError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {dialogError}
              </Alert>
            ) : null}

            {isBadgeTab ? (
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
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    select
                    label="Unlock Criteria"
                    fullWidth
                    value={badgeForm.criteriaType}
                    onChange={(e) => {
                      const criteriaType = e.target.value;
                      setBadgeForm((p) => ({
                        ...p,
                        criteriaType,
                        difficulty: CRITERIA_WITH_DIFFICULTY.has(criteriaType)
                          ? p.difficulty || "medium"
                          : "",
                      }));
                    }}
                  >
                    {BADGE_CRITERIA.map((item) => (
                      <MenuItem key={item.value} value={item.value}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {CRITERIA_WITH_DIFFICULTY.has(badgeForm.criteriaType) ? (
                    <TextField
                      select
                      label="Criteria Difficulty"
                      fullWidth
                      required
                      value={badgeForm.difficulty || "medium"}
                      onChange={(e) =>
                        setBadgeForm((p) => ({
                          ...p,
                          difficulty: e.target.value,
                        }))
                      }
                      helperText="For quiz and game unlock badges"
                    >
                      {DIFFICULTIES.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : null}
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label={
                      badgeForm.criteriaType === "xp"
                        ? "XP Target"
                        : badgeForm.criteriaType === "streak"
                          ? "Day Streak"
                          : badgeForm.criteriaType === "level"
                            ? "Target Level"
                            : badgeForm.criteriaType === "leaderboard_rank"
                              ? "Top Rank (e.g. 3 = top 3)"
                              : badgeForm.criteriaType === "perfect_quiz"
                                ? "Perfect Scores Needed"
                                : badgeForm.criteriaType === "games_completed"
                                  ? "Games to Complete"
                                  : badgeForm.criteriaType === "quizzes_passed"
                                    ? "Quizzes to Pass"
                                    : badgeForm.criteriaType ===
                                        "lessons_completed"
                                      ? "Lessons to Complete"
                                      : "Criteria Value"
                    }
                    type="number"
                    required
                    fullWidth
                    inputProps={{ min: 1 }}
                    value={badgeForm.criteriaValue}
                    onChange={(e) =>
                      setBadgeForm((p) => ({
                        ...p,
                        criteriaValue: Number(e.target.value),
                      }))
                    }
                    helperText={
                      badgeForm.criteriaType === "perfect_quiz"
                        ? "Usually 1 for first perfect quiz"
                        : undefined
                    }
                  />
                  <TextField
                    label="XP Bonus"
                    type="number"
                    fullWidth
                    value={badgeForm.xpBonus}
                    onChange={(e) =>
                      setBadgeForm((p) => ({
                        ...p,
                        xpBonus: Number(e.target.value),
                      }))
                    }
                  />
                </Stack>
                <IconPicker
                  value={badgeForm.icon}
                  color={badgeForm.color}
                  onChange={(icon) => setBadgeForm((p) => ({ ...p, icon }))}
                />
                <ColorPicker
                  value={badgeForm.color}
                  onChange={(color) => setBadgeForm((p) => ({ ...p, color }))}
                />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Alert severity="info">
                  Medals are for bigger achievements than badges — levels,
                  leaderboard standing, and perfect quizzes.
                </Alert>
                <TextField
                  label="Name"
                  required
                  fullWidth
                  value={medalForm.name}
                  onChange={(e) =>
                    setMedalForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
                <TextField
                  label="Description"
                  required
                  fullWidth
                  multiline
                  minRows={2}
                  value={medalForm.description}
                  onChange={(e) =>
                    setMedalForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    select
                    label="Tier"
                    fullWidth
                    value={medalForm.tier}
                    onChange={(e) =>
                      setMedalForm((p) => ({ ...p, tier: e.target.value }))
                    }
                  >
                    {TIERS.map((item) => (
                      <MenuItem key={item.value} value={item.value}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Major Criteria"
                    fullWidth
                    value={medalForm.criteriaType}
                    onChange={(e) => {
                      const criteriaType = e.target.value;
                      const minValue = medalCriteriaMin(criteriaType);
                      setMedalForm((p) => ({
                        ...p,
                        criteriaType,
                        criteriaValue:
                          criteriaType === "perfect_quiz"
                            ? 1
                            : Math.max(minValue, Number(p.criteriaValue) || 0),
                      }));
                    }}
                  >
                    {MEDAL_CRITERIA.map((item) => (
                      <MenuItem key={item.value} value={item.value}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
                {medalForm.criteriaType === "perfect_quiz" ? (
                  <TextField
                    label="Criteria Value"
                    fullWidth
                    value="Score 100%"
                    InputProps={{ readOnly: true }}
                    helperText="Perfect quiz medals unlock on a 100% quiz score"
                  />
                ) : (
                  <TextField
                    label={
                      medalForm.criteriaType === "leaderboard_rank"
                        ? "Top Rank (e.g. 3 = top 3)"
                        : medalForm.criteriaType === "level"
                          ? "Target Level"
                          : medalForm.criteriaType === "xp"
                            ? "XP Target"
                            : medalForm.criteriaType === "streak"
                              ? "Day Streak"
                              : medalForm.criteriaType === "quizzes_passed"
                                ? "Quizzes to Pass"
                                : medalForm.criteriaType === "lessons_completed"
                                  ? "Lessons to Complete"
                                  : medalForm.criteriaType === "games_completed"
                                    ? "Games to Complete"
                                    : "Criteria Value"
                    }
                    type="number"
                    required
                    fullWidth
                    inputProps={{
                      min: medalCriteriaMin(medalForm.criteriaType),
                    }}
                    helperText={
                      medalForm.criteriaType === "leaderboard_rank"
                        ? "1 = #1 on the leaderboard"
                        : `Minimum ${medalCriteriaMin(medalForm.criteriaType)} for medals (major achievement)`
                    }
                    value={medalForm.criteriaValue}
                    onChange={(e) =>
                      setMedalForm((p) => ({
                        ...p,
                        criteriaValue: Number(e.target.value),
                      }))
                    }
                  />
                )}
                <IconPicker
                  value={medalForm.icon}
                  color="#FACC15"
                  onChange={(icon) => setMedalForm((p) => ({ ...p, icon }))}
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : isBadgeTab
                    ? "Create Badge"
                    : "Create Medal"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteBadgeTarget)}
        title="Delete badge?"
        description={
          deleteBadgeTarget
            ? `Delete "${deleteBadgeTarget.name}"? Students who already unlocked it will keep it.`
            : ""
        }
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        loadingLabel="Deleting…"
        onClose={() => {
          if (!deleting) setDeleteBadgeTarget(null);
        }}
        onConfirm={handleDeleteBadge}
      />

      <ConfirmDialog
        open={Boolean(deleteMedalTarget)}
        title="Delete medal?"
        description={
          deleteMedalTarget
            ? `Delete "${deleteMedalTarget.name}"? Students who already earned it will keep it.`
            : ""
        }
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        loadingLabel="Deleting…"
        onClose={() => {
          if (!deleting) setDeleteMedalTarget(null);
        }}
        onConfirm={handleDeleteMedal}
      />
    </>
  );
}
