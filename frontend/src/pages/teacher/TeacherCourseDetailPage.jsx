import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import { Link as RouterLink, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import ContentTimestampToolbar from "../../components/common/ContentTimestampToolbar";
import courseService from "../../services/courseService";
import lessonService from "../../services/lessonService";
import { getErrorMessage } from "../../services/api";
import { applyTimestampControls } from "../../utils/contentTimestamps";
import {
  downloadMaterial,
  formatFileSize,
  formatMaterialType,
  formatUploadDate,
  isViewableMaterial,
  materialViewUrl,
} from "../../utils/materialActions";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";
import { formatGameTypeLabel } from "../../utils/gameTypes";

export default function TeacherCourseDetailPage() {
  const { courseId } = useParams();
  const { toQueryParams, schoolYear, gradeLevel, section } = useTeacherFilters();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [games, setGames] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [open, setOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [form, setForm] = useState({
    title: "",
    competency: "",
    content: "",
    orderIndex: 1,
    xpReward: 25,
    generateAiExtras: true,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState({});
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingLessonId, setDeletingLessonId] = useState(null);

  async function load() {
    try {
      const filterParams = toQueryParams();
      const [courseRes, lessonsRes, quizzesRes, gamesRes, enrollmentsRes] =
        await Promise.all([
          courseService.getById(courseId),
          courseService.lessons(courseId),
          courseService.quizzes(courseId),
          courseService.games(courseId),
          courseService.enrollments(courseId, filterParams),
        ]);
      setCourse(courseRes.data.data);
      setLessons(lessonsRes.data.data || []);
      setQuizzes(quizzesRes.data.data || []);
      setGames(gamesRes.data.data || []);
      setEnrollments(enrollmentsRes.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [courseId, schoolYear, gradeLevel, section]);

  const visibleLessons = useMemo(
    () => applyTimestampControls(lessons, { sort, filters }),
    [lessons, sort, filters],
  );
  const visibleQuizzes = useMemo(
    () => applyTimestampControls(quizzes, { sort, filters }),
    [quizzes, sort, filters],
  );
  const visibleGames = useMemo(
    () => applyTimestampControls(games, { sort, filters }),
    [games, sort, filters],
  );

  async function handleCreateLesson() {
    setError("");
    try {
      await lessonService.create(courseId, form);
      setOpen(false);
      setForm({
        title: "",
        competency: "",
        content: "",
        orderIndex: lessons.length + 1,
        xpReward: 25,
        generateAiExtras: true,
      });
      setMessage("Lesson created");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleUpload(lessonId, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      await lessonService.uploadMaterial(lessonId, file);
      setMessage("Material uploaded");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      event.target.value = "";
    }
  }

  async function handleDeleteLesson() {
    if (!lessonToDelete) return;
    setError("");
    setMessage("");
    setDeletingLessonId(lessonToDelete.id);
    try {
      await lessonService.remove(lessonToDelete.id);
      setLessonToDelete(null);
      setMessage("Lesson deleted");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingLessonId(null);
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
  if (!course)
    return <Alert severity="error">{error || "Subject not found"}</Alert>;

  return (
    <>
      <PageHeader
        title={course.subject || course.title}
        subtitle={
          course.description ||
          "Manage lessons, quizzes, games, and enrollments."
        }
        action={
          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              to={`/teacher/courses/${courseId}/scores`}
              variant="outlined"
            >
              Class Scores
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  orderIndex: lessons.length + 1,
                }));
                setOpen(true);
              }}
            >
              Add Lesson
            </Button>
          </Stack>
        }
      />
      <ContentTimestamp item={course} dense sx={{ mb: 2, mt: 0 }} />
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

      <ContentTimestampToolbar
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <Stack spacing={2}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>
            Lessons
          </Typography>
          <List disablePadding>
            {visibleLessons.map((lesson) => (
              <Box
                key={lesson.id}
                sx={{
                  mb: 2,
                  pb: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-child": { mb: 0, pb: 0, borderBottom: "none" },
                }}
              >
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    px: 0,
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "flex-start" },
                    gap: 1.25,
                  }}
                >
                  <ListItemText
                    sx={{ flex: 1, minWidth: 0 }}
                    primary={`${lesson.order_index}. ${lesson.title}`}
                    secondary={
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        {lesson.competency ? (
                          <Typography variant="body2" color="text.secondary">
                            Competency: {lesson.competency}
                          </Typography>
                        ) : null}
                        <Typography variant="body2" color="text.secondary">
                          {lesson.xp_reward} XP
                          {lesson.is_published ? " · Published" : " · Draft"}
                        </Typography>
                        <ContentTimestamp item={lesson} dense />
                      </Stack>
                    }
                    secondaryTypographyProps={{ component: "div" }}
                  />
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{
                      flexShrink: 0,
                      alignSelf: { xs: "stretch", sm: "flex-start" },
                      "& .MuiButton-root": {
                        flex: { xs: "1 1 auto", sm: "0 0 auto" },
                      },
                    }}
                  >
                    <Button component="label" size="small" variant="outlined">
                      Upload Material
                      <input
                        hidden
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.md,.png,.jpg,.jpeg,.webp,.gif,.zip,application/pdf,image/*"
                        onChange={(event) => handleUpload(lesson.id, event)}
                      />
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      disabled={deletingLessonId === lesson.id}
                      onClick={() => setLessonToDelete(lesson)}
                    >
                      {deletingLessonId === lesson.id ? "…" : "Delete"}
                    </Button>
                  </Stack>
                </ListItem>

                <Box sx={{ mt: 1, pl: { xs: 0, sm: 1 } }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Materials ({(lesson.materials || []).length})
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 1 }}
                  >
                    Allowed: PDF, Word, PowerPoint, Excel, CSV, TXT, images, or
                    ZIP.
                  </Typography>
                  {(lesson.materials || []).length ? (
                    <Stack spacing={1}>
                      {(lesson.materials || []).map((material) => {
                        const href = materialViewUrl(material.download_url);
                        const uploaded = formatUploadDate(material.created_at);
                        const sizeLabel = formatFileSize(material.file_size);
                        const viewable = isViewableMaterial(material.file_type);
                        const busy = downloadingId === material.id;

                        return (
                          <Paper
                            key={material.id}
                            variant="outlined"
                            sx={{ p: 1.5 }}
                          >
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              justifyContent="space-between"
                              alignItems={{ xs: "stretch", sm: "center" }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography fontWeight={700} noWrap>
                                  {material.original_name}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {formatMaterialType(
                                    material.file_type,
                                    material.original_name,
                                  )}
                                  {sizeLabel ? ` · ${sizeLabel}` : ""}
                                  {uploaded ? ` · Uploaded ${uploaded}` : ""}
                                </Typography>
                              </Box>
                              <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                useFlexGap
                              >
                                {viewable && href ? (
                                  <Button
                                    component="a"
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="small"
                                    variant="outlined"
                                    startIcon={<VisibilityIcon />}
                                  >
                                    View
                                  </Button>
                                ) : null}
                                {material.download_url ? (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<DownloadIcon />}
                                    disabled={busy}
                                    onClick={() =>
                                      handleDownloadMaterial(material)
                                    }
                                  >
                                    {busy ? "…" : "Download"}
                                  </Button>
                                ) : null}
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No materials uploaded for this lesson yet.
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </List>
          {!visibleLessons.length ? (
            <Typography color="text.secondary">
              No lessons match the current filters.
            </Typography>
          ) : null}
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6">Quizzes</Typography>
            <Button
              component={RouterLink}
              to={`/teacher/quizzes/new?courseId=${courseId}`}
              size="small"
              variant="outlined"
            >
              Create Quiz
            </Button>
          </Stack>
          <List>
            {visibleQuizzes.map((quiz) => (
              <ListItem
                key={quiz.id}
                alignItems="flex-start"
                component={RouterLink}
                to={`/teacher/quizzes/${quiz.id}/edit`}
                sx={{
                  color: "inherit",
                  textDecoration: "none",
                  borderRadius: 1,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography fontWeight={700}>{quiz.title}</Typography>
                      <Chip
                        size="small"
                        label={quiz.is_published ? "Published" : "Draft"}
                      />
                      {quiz.is_ai_generated ? (
                        <Chip
                          size="small"
                          label="AI"
                          color="secondary"
                          variant="outlined"
                        />
                      ) : null}
                    </Stack>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {quiz.question_count || 0} questions · {quiz.xp_reward}{" "}
                        XP · Open to revisit
                      </Typography>
                      <ContentTimestamp item={quiz} dense />
                    </Stack>
                  }
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItem>
            ))}
          </List>
          {!visibleQuizzes.length ? (
            <Typography color="text.secondary">
              No quizzes match the current filters.
            </Typography>
          ) : null}
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6">Educational Games</Typography>
            <Button
              component={RouterLink}
              to="/teacher/ai-game"
              size="small"
              variant="outlined"
            >
              Create Game
            </Button>
          </Stack>
          <List>
            {visibleGames.map((game) => (
              <ListItem
                key={game.id}
                alignItems="flex-start"
                component={RouterLink}
                to={`/teacher/games/${game.id}/edit`}
                sx={{
                  color: "inherit",
                  textDecoration: "none",
                  borderRadius: 1,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography fontWeight={700}>{game.title}</Typography>
                      <Chip
                        size="small"
                        label={game.is_published ? "Published" : "Draft"}
                      />
                      {game.is_ai_generated ? (
                        <Chip
                          size="small"
                          label="AI"
                          color="secondary"
                          variant="outlined"
                        />
                      ) : null}
                    </Stack>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {formatGameTypeLabel(game.game_type)} ·{" "}
                        {game.xp_reward} XP · Open to revisit
                      </Typography>
                      <ContentTimestamp item={game} dense />
                    </Stack>
                  }
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItem>
            ))}
          </List>
          {!visibleGames.length ? (
            <Typography color="text.secondary">
              No games match the current filters.
            </Typography>
          ) : null}
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>
            Enrolled Students ({enrollments.length})
          </Typography>
          <List>
            {enrollments.map((student) => (
              <ListItem key={student.id}>
                <ListItemText
                  primary={`${student.first_name} ${student.last_name}`}
                  secondary={`Learning progress ${Number(student.progress_percent)}% (lessons) · Level ${student.level || 1}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Stack>

      <ConfirmDialog
        open={Boolean(lessonToDelete)}
        title="Delete lesson?"
        description={
          <>
            You’re about to delete{" "}
            <strong>{lessonToDelete?.title || "this lesson"}</strong>. This can’t
            be undone.
          </>
        }
        details="Uploaded materials and student progress for this lesson will be removed. Quizzes and games stay in the subject, but won’t be linked to this lesson anymore."
        cancelLabel="Keep lesson"
        confirmLabel="Delete lesson"
        confirmColor="error"
        loading={Boolean(deletingLessonId)}
        loadingLabel="Deleting…"
        onClose={() => setLessonToDelete(null)}
        onConfirm={handleDeleteLesson}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Lesson</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Lesson"
              required
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
            />
            <TextField
              label="Competency"
              multiline
              minRows={2}
              value={form.competency}
              onChange={(e) =>
                setForm((p) => ({ ...p, competency: e.target.value }))
              }
              helperText="Learning competency or outcome for this lesson"
            />
            <TextField
              label="Content"
              multiline
              minRows={5}
              value={form.content}
              onChange={(e) =>
                setForm((p) => ({ ...p, content: e.target.value }))
              }
            />
            <TextField
              label="XP Reward"
              type="number"
              value={form.xpReward}
              onChange={(e) =>
                setForm((p) => ({ ...p, xpReward: Number(e.target.value) }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.title.trim()}
            onClick={handleCreateLesson}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
