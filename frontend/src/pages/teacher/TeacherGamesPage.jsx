import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import ReuseContentDialog from "../../components/teacher/ReuseContentDialog";
import gameService from "../../services/gameService";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";
import { formatGameTypeLabel } from "../../utils/gameTypes";
import { defaultSchoolYearValue } from "../../utils/schoolYears";

function subjectKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sourceSubjectKey(item) {
  return subjectKey(
    item?.course_subject || item?.subject || item?.course_title,
  );
}

function sourceSubjectLabel(item) {
  return (
    item?.course_subject || item?.subject || item?.course_title || "Subject"
  );
}

export default function TeacherGamesPage() {
  const navigate = useNavigate();
  const { schoolYear, gradeLevel } = useTeacherFilters();
  const [games, setGames] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reuseItem, setReuseItem] = useState(null);
  const [reuseLoading, setReuseLoading] = useState(false);
  const [reuseError, setReuseError] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const currentSchoolYear = useMemo(() => defaultSchoolYearValue(), []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (schoolYear && schoolYear !== "all") {
      params.schoolYear = schoolYear;
    }
    if (gradeLevel && gradeLevel !== "all") {
      params.gradeLevel = gradeLevel;
    }
    Promise.all([
      gameService.listMine(params),
      courseService.list({ limit: 200 }),
    ])
      .then(([gameRes, courseRes]) => {
        setGames(gameRes.data.data || []);
        const list = courseRes.data.data?.courses || courseRes.data.data || [];
        setCourses(Array.isArray(list) ? list : []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [schoolYear, gradeLevel]);

  const targetCourses = useMemo(() => {
    if (!reuseItem) return [];
    const key = sourceSubjectKey(reuseItem);
    const matched = courses.filter(
      (course) => subjectKey(course.subject || course.title) === key,
    );
    return matched.sort((a, b) => {
      const aCurrent = a.school_year === currentSchoolYear ? 0 : 1;
      const bCurrent = b.school_year === currentSchoolYear ? 0 : 1;
      if (aCurrent !== bCurrent) return aCurrent - bCurrent;
      return String(a.grade_level || "").localeCompare(
        String(b.grade_level || ""),
      );
    });
  }, [courses, currentSchoolYear, reuseItem]);

  async function handleReuse({ courseId, title }) {
    if (!reuseItem) return;
    setReuseLoading(true);
    setReuseError("");
    try {
      const response = await gameService.copy(reuseItem.id, {
        courseId,
        title,
      });
      const created = response.data.data;
      setReuseItem(null);
      navigate(`/teacher/games/${created.id}/edit`);
    } catch (err) {
      setReuseError(getErrorMessage(err));
    } finally {
      setReuseLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleteLoading(true);
    setError("");
    try {
      await gameService.remove(deleteItem.id);
      setGames((prev) => prev.filter((game) => game.id !== deleteItem.id));
      setDeleteItem(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My Games"
        subtitle="Games for the school year and grade selected in the sidebar. Reuse a game into another subject as a new draft."
        action={
          <Button
            component={RouterLink}
            to="/teacher/ai-game"
            variant="contained"
            startIcon={<SportsEsportsIcon />}
          >
            AI Game Generator
          </Button>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        {!games.length ? (
          <Stack spacing={2} alignItems="flex-start" sx={{ p: 2 }}>
            <Typography color="text.secondary">
              No games for the selected school year
              {gradeLevel && gradeLevel !== "all" ? ` / ${gradeLevel}` : ""}.
              Create one or change the sidebar filters.
            </Typography>
            <Button
              component={RouterLink}
              to="/teacher/ai-game"
              variant="contained"
              startIcon={<SportsEsportsIcon />}
            >
              Create Game
            </Button>
          </Stack>
        ) : (
          <ResponsiveTableContainer>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>School year</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {games.map((game) => (
                  <TableRow
                    key={game.id}
                    hover
                    onClick={() => navigate(`/teacher/games/${game.id}/edit`)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Typography fontWeight={700}>{game.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {game.xp_reward} XP
                        {game.estimated_time
                          ? ` · ~${game.estimated_time} min`
                          : ""}
                        {game.difficulty
                          ? ` · ${String(game.difficulty).replace(/^\w/, (c) =>
                              c.toUpperCase(),
                            )}`
                          : ""}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {game.course_title ||
                        game.subject ||
                        `Subject #${game.course_id}`}
                    </TableCell>
                    <TableCell>{game.grade_level || "—"}</TableCell>
                    <TableCell>
                      {game.school_year ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`SY ${game.school_year}`}
                          color={
                            game.school_year === currentSchoolYear
                              ? "primary"
                              : "default"
                          }
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {formatGameTypeLabel(game.game_type)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={game.is_published ? "success" : "default"}
                        label={game.is_published ? "Published" : "Draft"}
                      />
                    </TableCell>
                    <TableCell>
                      {game.is_ai_generated ? (
                        <Chip
                          size="small"
                          color="secondary"
                          variant="outlined"
                          label="AI"
                        />
                      ) : (
                        <Chip size="small" variant="outlined" label="Manual" />
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <ContentTimestamp item={game} dense sx={{ mt: 0 }} />
                    </TableCell>
                    <TableCell
                      align="right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Stack
                        direction="row"
                        spacing={0.25}
                        justifyContent="flex-end"
                      >
                        <Tooltip title="Reuse">
                          <IconButton
                            size="small"
                            aria-label={`Reuse game ${game.title}`}
                            onClick={() => {
                              setReuseError("");
                              setReuseItem(game);
                            }}
                          >
                            <ContentCopyOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Delete game ${game.title}`}
                            onClick={() => setDeleteItem(game)}
                          >
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        )}
      </Paper>

      <ReuseContentDialog
        open={Boolean(reuseItem)}
        onClose={() => {
          if (reuseLoading) return;
          setReuseItem(null);
          setReuseError("");
        }}
        onConfirm={handleReuse}
        itemTitle={reuseItem?.title || ""}
        itemSubtitle={
          reuseItem
            ? `${reuseItem.course_title || reuseItem.subject || `Subject #${reuseItem.course_id}`}${
                reuseItem.school_year ? ` · SY ${reuseItem.school_year}` : ""
              } · ${formatGameTypeLabel(reuseItem.game_type)}`
            : ""
        }
        courses={targetCourses}
        sourceSubjectLabel={sourceSubjectLabel(reuseItem)}
        loading={reuseLoading}
        error={reuseError}
        contentLabel="game"
      />

      <ConfirmDialog
        open={Boolean(deleteItem)}
        title="Delete game?"
        description={
          <>
            You’re about to permanently delete{" "}
            <strong>{deleteItem?.title || "this game"}</strong>.
          </>
        }
        details="Student scores and attempts for this game will be removed. This can’t be undone."
        confirmLabel="Delete game"
        confirmColor="error"
        loading={deleteLoading}
        loadingLabel="Deleting…"
        onClose={() => {
          if (deleteLoading) return;
          setDeleteItem(null);
        }}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
