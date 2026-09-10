import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import gameService from "../../services/gameService";
import { getErrorMessage } from "../../services/api";
import { useAdminFilters } from "../../contexts/AdminFiltersContext";
import useRefreshOnFocus from "../../hooks/useRefreshOnFocus";
import { formatGameTypeLabel } from "../../utils/gameTypes";
import { defaultSchoolYearValue } from "../../utils/schoolYears";

function teacherLabel(row) {
  const name =
    `${row?.teacher_first_name || ""} ${row?.teacher_last_name || ""}`.trim();
  return name || "—";
}

function subjectLabel(row) {
  return row?.subject || row?.course_title || `Subject #${row?.course_id}`;
}

function isFlagOn(value) {
  return value === true || value === 1 || value === "1";
}

export default function AdminGamesPage() {
  const { schoolYear, gradeLevel, toQueryParams } = useAdminFilters();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [gameType, setGameType] = useState("all");
  const requestIdRef = useRef(0);
  const currentSchoolYear = defaultSchoolYearValue();

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestIdRef.current;
      if (!silent) setLoading(true);
      const params = toQueryParams();
      delete params.section;
      try {
        const response = await gameService.listMine(params);
        if (requestId !== requestIdRef.current) return;
        setGames(response.data.data || []);
        setError("");
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (!silent) setError(getErrorMessage(err));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [toQueryParams],
  );

  useEffect(() => {
    load();
    return () => {
      requestIdRef.current += 1;
    };
  }, [schoolYear, gradeLevel, load]);

  useRefreshOnFocus(() => load({ silent: true }));

  const gameTypeOptions = useMemo(() => {
    const map = new Map();
    games.forEach((game) => {
      const key = String(game.game_type || "")
        .trim()
        .toLowerCase();
      if (!key || map.has(key)) return;
      map.set(key, formatGameTypeLabel(key));
    });
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [games]);

  useEffect(() => {
    if (gameType === "all") return;
    const stillExists = gameTypeOptions.some(
      (option) => option.value === gameType,
    );
    if (!stillExists) setGameType("all");
  }, [gameType, gameTypeOptions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return games.filter((game) => {
      const published = isFlagOn(game.is_published);
      const aiGenerated = isFlagOn(game.is_ai_generated);
      if (status === "published" && !published) return false;
      if (status === "draft" && published) return false;
      if (source === "ai" && !aiGenerated) return false;
      if (source === "manual" && aiGenerated) return false;
      if (
        gameType !== "all" &&
        String(game.game_type || "")
          .trim()
          .toLowerCase() !== gameType
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        game.title,
        subjectLabel(game),
        teacherLabel(game),
        formatGameTypeLabel(game.game_type),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [games, search, status, source, gameType]);

  if (loading && !games.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Games"
        subtitle="Platform-wide game overview. Read-only — teachers create and edit games in their subjects."
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
        flexWrap="wrap"
        useFlexGap
      >
        <TextField
          size="small"
          label="Search"
          placeholder="Title, subject, or teacher"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ flex: 1, minWidth: { sm: 220 } }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          sx={{ minWidth: { sm: 150 } }}
        >
          <MenuItem value="all">All statuses</MenuItem>
          <MenuItem value="published">Published</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          sx={{ minWidth: { sm: 140 } }}
        >
          <MenuItem value="all">All sources</MenuItem>
          <MenuItem value="ai">AI</MenuItem>
          <MenuItem value="manual">Manual</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Type"
          value={gameType}
          onChange={(event) => setGameType(event.target.value)}
          sx={{ minWidth: { sm: 180 } }}
        >
          <MenuItem value="all">All types</MenuItem>
          {gameTypeOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper sx={{ p: 2 }}>
        {!games.length ? (
          <Typography color="text.secondary" sx={{ p: 1 }}>
            No games for the selected school year
            {gradeLevel && gradeLevel !== "all" ? ` / ${gradeLevel}` : ""}.
          </Typography>
        ) : !filtered.length ? (
          <Typography color="text.secondary" sx={{ p: 1 }}>
            No games match the current filters.
          </Typography>
        ) : (
          <ResponsiveTableContainer>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Teacher</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>School year</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((game) => (
                  <TableRow key={game.id} hover>
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
                    <TableCell>{subjectLabel(game)}</TableCell>
                    <TableCell>{teacherLabel(game)}</TableCell>
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
                    <TableCell>{formatGameTypeLabel(game.game_type)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={isFlagOn(game.is_published) ? "success" : "default"}
                        label={
                          isFlagOn(game.is_published) ? "Published" : "Draft"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {isFlagOn(game.is_ai_generated) ? (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        )}
      </Paper>
    </>
  );
}
