import { useEffect, useMemo, useState } from "react";
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
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import ReuseContentDialog from "../../components/teacher/ReuseContentDialog";
import gameService from "../../services/gameService";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";
import { formatGameTypeLabel } from "../../utils/gameTypes";
import {
  defaultSchoolYearValue,
  listSchoolYearOptions,
} from "../../utils/schoolYears";

export default function TeacherGamesPage() {
  const navigate = useNavigate();
  const { gradeLevel } = useTeacherFilters();
  const [games, setGames] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bankSchoolYear, setBankSchoolYear] = useState("all");
  const [reuseItem, setReuseItem] = useState(null);
  const [reuseLoading, setReuseLoading] = useState(false);
  const [reuseError, setReuseError] = useState("");

  const bankYearOptions = useMemo(
    () => listSchoolYearOptions({ includeAll: true }),
    [],
  );
  const currentSchoolYear = useMemo(() => defaultSchoolYearValue(), []);

  useEffect(() => {
    setLoading(true);
    const params = { schoolYear: bankSchoolYear };
    if (gradeLevel && gradeLevel !== "all") {
      params.gradeLevel = gradeLevel;
    }
    Promise.all([
      gameService.listMine(params),
      courseService.list({ limit: 200 }),
    ])
      .then(([gameRes, courseRes]) => {
        setGames(gameRes.data.data || []);
        const list =
          courseRes.data.data?.courses || courseRes.data.data || [];
        setCourses(Array.isArray(list) ? list : []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [gradeLevel, bankSchoolYear]);

  const targetCourses = useMemo(() => {
    const sorted = [...courses].sort((a, b) => {
      const aCurrent = a.school_year === currentSchoolYear ? 0 : 1;
      const bCurrent = b.school_year === currentSchoolYear ? 0 : 1;
      if (aCurrent !== bCurrent) return aCurrent - bCurrent;
      return String(a.subject || a.title || "").localeCompare(
        String(b.subject || b.title || ""),
      );
    });
    return sorted;
  }, [courses, currentSchoolYear]);

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

  if (loading) return <LoadingScreen />;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My Games"
        subtitle="Game bank across school years — reuse a past game into the current subject as a new draft."
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

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          select
          size="small"
          label="Bank school year"
          value={bankSchoolYear}
          onChange={(event) => setBankSchoolYear(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          {bankYearOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper sx={{ p: 2 }}>
        {!games.length ? (
          <Stack spacing={2} alignItems="flex-start" sx={{ p: 2 }}>
            <Typography color="text.secondary">
              No games in this bank view. Create one, or switch school year to
              All school years.
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
            <Table size="small" sx={{ minWidth: 780 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>School year</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {games.map((game) => (
                  <TableRow key={game.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{game.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {game.xp_reward} XP
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {game.course_title ||
                        game.subject ||
                        `Subject #${game.course_id}`}
                    </TableCell>
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
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Button
                          size="small"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => {
                            setReuseError("");
                            setReuseItem(game);
                          }}
                        >
                          Reuse
                        </Button>
                        <Button
                          component={RouterLink}
                          to={`/teacher/games/${game.id}/edit`}
                          size="small"
                        >
                          Open
                        </Button>
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
        loading={reuseLoading}
        error={reuseError}
        contentLabel="game"
      />
    </Stack>
  );
}
