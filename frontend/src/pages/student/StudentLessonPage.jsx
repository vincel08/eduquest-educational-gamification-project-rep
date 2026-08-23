import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import QuizIcon from "@mui/icons-material/Quiz";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { Link as RouterLink, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import lessonService from "../../services/lessonService";
import { getErrorMessage } from "../../services/api";
import { pickMotivationalMessage } from "../../utils/feedbackMessages";
import { useAuth } from "../../contexts/AuthContext";
import { useRewards } from "../../contexts/RewardsContext";
import {
  downloadMaterial,
  formatFileSize,
  formatMaterialType,
  formatUploadDate,
  isViewableMaterial,
  materialViewUrl,
} from "../../utils/materialActions";

export default function StudentLessonPage() {
  const { lessonId } = useParams();
  const { updateProfile } = useAuth();
  const { notifyReward } = useRewards();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await lessonService.getById(lessonId);
        setLesson(response.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonId]);

  async function handleComplete() {
    setCompleting(true);
    setError("");
    setMessage("");
    try {
      const response = await lessonService.complete(lessonId);
      const result = response.data.data;
      if (!result.alreadyCompleted) {
        if (result.xpAward?.profile) {
          updateProfile(result.xpAward.profile);
        }
        notifyReward({
          xpEarned: result.progress?.xp_earned || 0,
          badges: result.xpAward?.newlyUnlocked?.badges || [],
          medals: result.xpAward?.newlyUnlocked?.medals || [],
          celebrateWin: true,
        });
        let msg = `${pickMotivationalMessage()} Lesson completed! +${result.progress.xp_earned} XP`;
        if (result.progressPercent != null) {
          msg += ` · Subject progress ${result.progressPercent}%`;
        }
        setMessage(msg);
      } else {
        setMessage("Lesson already completed.");
      }
      setLesson((prev) => ({ ...prev, progress: result.progress }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  }

  async function handleDownloadMaterial(material) {
    setError("");
    setDownloadingId(material.id);
    try {
      await downloadMaterial(material.download_url, material.original_name);
    } catch (err) {
      setError(err.message || getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error && !lesson) return <Alert severity="error">{error}</Alert>;

  const completed = lesson.progress?.status === "completed";

  return (
    <PageContainer>
      <PageHeader
        title={lesson.title}
        subtitle={lesson.summary || "Interactive lesson"}
        action={
          <Chip
            icon={completed ? <CheckCircleIcon /> : <MenuBookIcon />}
            color={completed ? "success" : "default"}
            label={completed ? "Completed" : "In progress"}
            sx={{
              fontWeight: 700,
              bgcolor: completed ? undefined : "rgba(255,255,255,0.2)",
              color: completed ? undefined : "#fff",
            }}
          />
        }
      />
      <ContentTimestamp
        item={lesson}
        variant="date"
        showUpdated={false}
        sx={{ mb: 2, mt: 0 }}
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

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Lesson Content
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
                {lesson.content}
              </Typography>
            </Paper>

            {lesson.learning_objectives ? (
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" fontWeight={800} gutterBottom>
                  Learning Objectives
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>
                  {lesson.learning_objectives}
                </Typography>
              </Paper>
            ) : null}

            {lesson.competency ? (
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" fontWeight={800} gutterBottom>
                  Competency
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>
                  {lesson.competency}
                </Typography>
              </Paper>
            ) : null}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            <Paper
              className={completed ? "glass-accent" : undefined}
              sx={{ p: 2.5 }}
            >
              <Typography
                variant="h6"
                fontWeight={800}
                gutterBottom
                sx={{ color: completed ? "#fff" : "inherit" }}
              >
                Lesson Progress
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon
                    color={completed ? "inherit" : "disabled"}
                    fontSize="small"
                  />
                  <Typography
                    fontWeight={700}
                    sx={{ color: completed ? "#fff" : "inherit" }}
                  >
                    {completed
                      ? "Lesson completed"
                      : "Finish reading, then mark complete"}
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: completed ? 0.9 : 1,
                    color: completed ? "#fff" : "text.secondary",
                  }}
                >
                  Reward: +{lesson.xp_reward || 25} XP
                </Typography>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Materials
              </Typography>
              <List dense disablePadding>
                {(lesson.materials || []).map((material) => {
                  const href = materialViewUrl(material.download_url);
                  const uploaded = formatUploadDate(material.created_at);
                  const sizeLabel = formatFileSize(material.file_size);
                  const busy = downloadingId === material.id;
                  return (
                    <ListItem
                      key={material.id}
                      sx={{
                        px: 0,
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "stretch", sm: "flex-start" },
                        gap: 1,
                      }}
                    >
                      <ListItemText
                        sx={{ flex: 1, minWidth: 0 }}
                        primary={material.original_name}
                        secondary={`${formatMaterialType(material.file_type, material.original_name)}${sizeLabel ? ` · ${sizeLabel}` : ""}${uploaded ? ` · ${uploaded}` : ""}`}
                        primaryTypographyProps={{
                          noWrap: true,
                          title: material.original_name,
                        }}
                      />
                      {material.download_url ? (
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{
                            flexShrink: 0,
                            alignSelf: { xs: "flex-end", sm: "center" },
                          }}
                        >
                          {isViewableMaterial(material.file_type) && href ? (
                            <Button
                              component="a"
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                            >
                              View
                            </Button>
                          ) : null}
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            disabled={busy}
                            onClick={() => handleDownloadMaterial(material)}
                          >
                            {busy ? "…" : "Download"}
                          </Button>
                        </Stack>
                      ) : null}
                    </ListItem>
                  );
                })}
              </List>
              {!lesson.materials?.length ? (
                <Typography color="text.secondary">
                  No materials uploaded yet.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Open or download at least one material before marking this
                  lesson complete (required to unlock linked quizzes).
                </Typography>
              )}
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Quick Actions
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  size="large"
                  disabled={completing || completed}
                  onClick={handleComplete}
                  fullWidth
                >
                  {completed
                    ? "Completed"
                    : completing
                      ? "Completing..."
                      : `Complete Lesson (+${lesson.xp_reward || 25} XP)`}
                </Button>
                {(lesson.materials || []).length && !completed ? (
                  <Typography variant="caption" color="text.secondary">
                    Tip: use View or Download on a material first if Complete is
                    blocked.
                  </Typography>
                ) : null}
                {lesson.course_id ? (
                  <Button
                    component={RouterLink}
                    to={`/student/courses/${lesson.course_id}`}
                    variant="outlined"
                    startIcon={<QuizIcon />}
                    fullWidth
                  >
                    Back to Subject
                  </Button>
                ) : null}
                <Button
                  component={RouterLink}
                  to="/student/games"
                  variant="outlined"
                  color="secondary"
                  startIcon={<SportsEsportsIcon />}
                  fullWidth
                >
                  Play a Game
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
