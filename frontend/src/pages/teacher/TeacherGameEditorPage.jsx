import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import GamePreview from "../../components/games/GamePreview";
import GameEditor from "../../components/ai-review/GameEditor";
import gameService from "../../services/gameService";
import { getErrorMessage } from "../../services/api";
import { formatGameTypeLabel } from "../../utils/gameTypes";
import { validateGameDataClient } from "../../utils/gameDataValidation";
import { gameDataContentKey } from "../../utils/gameDataLists";

function toEditorGame(data) {
  return {
    title: data.title || "",
    description: data.description || "",
    instructions: data.description || "",
    gameType: data.game_type,
    difficulty: data.difficulty || "medium",
    estimatedTime: Number(data.estimated_time) || 10,
    xpReward: Number(data.xp_reward) || 30,
    gameData: data.game_data || { items: [] },
  };
}

export default function TeacherGameEditorPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [editorGame, setEditorGame] = useState(null);
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
  const [contentTab, setContentTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
        setEditorGame(toEditorGame(data));
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

  const previewGameData = useMemo(
    () => editorGame?.gameData || game?.game_data || { items: [] },
    [editorGame, game],
  );

  function handleEditorChange(next) {
    setEditorGame(next);
    setForm((prev) => ({
      ...prev,
      title: next.title ?? prev.title,
      description: next.instructions || next.description || prev.description,
      difficulty: next.difficulty || prev.difficulty,
      estimatedTime: Number(next.estimatedTime) || prev.estimatedTime,
      xpReward: Number(next.xpReward) || prev.xpReward,
    }));
    setPreviewKey((k) => k + 1);
    setPreviewResult(null);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const gameData = editorGame?.gameData || game?.game_data;
      const gameType = editorGame?.gameType || game?.game_type;
      const dataError = validateGameDataClient(gameType, gameData);
      if (dataError) {
        setError(dataError);
        setSaving(false);
        return;
      }

      const response = await gameService.update(gameId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        difficulty: form.difficulty,
        estimatedTime: Number(form.estimatedTime) || 10,
        xpReward: Number(form.xpReward) || 30,
        isPublished: Boolean(form.isPublished),
        gameType,
        gameData,
      });
      const data = response.data.data;
      setGame(data);
      setEditorGame(toEditorGame(data));
      setPreviewKey((k) => k + 1);
      setMessage("Game saved. Students will see the updated content.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError("");
    try {
      await gameService.remove(gameId);
      setDeleteOpen(false);
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
        subtitle="Edit content and play as a student would see it. Saved changes are what students play."
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
              label={formatGameTypeLabel(game.game_type)}
            />
            {game.is_ai_generated ? (
              <Chip size="small" color="secondary" variant="outlined" label="AI" />
            ) : null}
          </Stack>

          <Stack spacing={2}>
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
                onClick={() => setDeleteOpen(true)}
                disabled={saving}
              >
                Delete game
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Tabs
            value={contentTab}
            onChange={(_e, value) => {
              setContentTab(value);
              if (value === 1) {
                setPreviewResult(null);
                setPreviewKey((prev) => prev + 1);
              }
            }}
            sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
          >
            <Tab label="Edit Content" />
            <Tab label="Play as Student" />
          </Tabs>

          {contentTab === 0 && editorGame ? (
            <GameEditor
              game={editorGame}
              onChange={handleEditorChange}
              selectedIndex={selectedItem}
              onSelectIndex={setSelectedItem}
            />
          ) : (
            <>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={1}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Preview uses your latest edits. Save to push them to students.
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
                key={`${previewKey}-${gameDataContentKey(previewGameData)}`}
                gameType={editorGame?.gameType || game.game_type}
                gameData={previewGameData}
                xpReward={Number(form.xpReward) || 30}
                onComplete={(payload) => {
                  const score =
                    typeof payload === "number"
                      ? payload
                      : Number(payload?.score) || 0;
                  setPreviewResult({ score });
                }}
              />
            </>
          )}
        </Paper>
      </Stack>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this game?"
        description={
          <>
            You’re about to permanently delete{" "}
            <strong>{game?.title || "this game"}</strong>.
          </>
        }
        details="Student scores and attempts for this game will be removed. This can’t be undone."
        cancelLabel="Keep game"
        confirmLabel="Delete game"
        confirmColor="error"
        loading={saving}
        loadingLabel="Deleting…"
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
