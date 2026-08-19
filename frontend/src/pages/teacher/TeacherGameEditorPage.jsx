import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import GamePreview from "../../components/games/GamePreview";
import gameService from "../../services/gameService";
import { getErrorMessage } from "../../services/api";

export default function TeacherGameEditorPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "medium",
    estimatedTime: 10,
    xpReward: 30,
    isPublished: false,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewResult, setPreviewResult] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    gameService
      .getById(gameId)
      .then((response) => {
        if (!active) return;
        const data = response.data.data;
        setGame(data);
        setForm({
          title: data.title || "",
          description: data.description || "",
          difficulty: data.difficulty || "medium",
          estimatedTime: Number(data.estimated_time) || 10,
          xpReward: Number(data.xp_reward) || 30,
          isPublished: Boolean(data.is_published),
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gameId]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await gameService.update(gameId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        difficulty: form.difficulty,
        estimatedTime: Number(form.estimatedTime) || 10,
        xpReward: Number(form.xpReward) || 30,
        isPublished: Boolean(form.isPublished),
      });
      const data = response.data.data;
      setGame(data);
      setMessage("Game saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this game permanently?")) return;
    setSaving(true);
    setError("");
    try {
      await gameService.remove(gameId);
      navigate("/teacher/games");
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error && !game) {
    return (
      <PageContainer>
        <Alert severity="error">{error}</Alert>
        <Button
          component={RouterLink}
          to="/teacher/games"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to games
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={game.title}
        subtitle="Revisit this game anytime — preview as a student would see it, then edit and publish."
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              component={RouterLink}
              to="/teacher/games"
              startIcon={<ArrowBackIcon />}
              variant="outlined"
            >
            All my games
          </Button>
            {game.course_id ? (
              <Button
                component={RouterLink}
                to={`/teacher/courses/${game.course_id}`}
                variant="outlined"
              >
                Subject
              </Button>
            ) : null}
          </Stack>
        }
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

      <Stack spacing={3}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 2 }}
          >
            <Chip
              size="small"
              color={form.isPublished ? "success" : "default"}
              label={form.isPublished ? "Published" : "Draft"}
            />
            <Chip
              size="small"
              label={String(game.game_type || "").replace(/_/g, " ")}
              sx={{ textTransform: "capitalize" }}
            />
            {game.is_ai_generated ? (
              <Chip size="small" color="secondary" variant="outlined" label="AI" />
            ) : null}
          </Stack>

          <Stack spacing={2}>
            <TextField
              label="Title"
              fullWidth
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Difficulty"
                fullWidth
                value={form.difficulty}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, difficulty: e.target.value }))
                }
              >
                {["easy", "medium", "hard"].map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Estimated minutes"
                type="number"
                fullWidth
                value={form.estimatedTime}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    estimatedTime: e.target.value,
                  }))
                }
              />
              <TextField
                label="XP reward"
                type="number"
                fullWidth
                value={form.xpReward}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, xpReward: e.target.value }))
                }
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isPublished: e.target.checked,
                    }))
                  }
                />
              }
              label="Published for students"
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                color="error"
                variant="outlined"
                onClick={handleDelete}
                disabled={saving}
              >
                Delete game
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Typography variant="h6" fontWeight={800}>
              Play preview
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setPreviewResult(null);
                setPreviewKey((prev) => prev + 1);
              }}
            >
              Restart preview
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Preview only — your score is not saved to the student gradebook.
          </Typography>
          {previewResult ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Preview finished with score {previewResult.score}%
              <Button
                size="small"
                sx={{ ml: 1 }}
                onClick={() => {
                  setPreviewResult(null);
                  setPreviewKey((prev) => prev + 1);
                }}
              >
                Play again
              </Button>
            </Alert>
          ) : null}
          <GamePreview
            key={previewKey}
            gameType={game.game_type}
            gameData={game.game_data}
            xpReward={form.xpReward}
            onComplete={(payload) => {
              const score =
                typeof payload === "number"
                  ? payload
                  : Number(payload?.score) || 0;
              setPreviewResult({ score });
            }}
          />
        </Paper>
      </Stack>
    </PageContainer>
  );
}
