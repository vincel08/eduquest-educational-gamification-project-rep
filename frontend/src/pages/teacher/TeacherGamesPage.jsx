import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { Link as RouterLink } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import gameService from "../../services/gameService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";
import { formatGameTypeLabel } from "../../utils/gameTypes";

export default function TeacherGamesPage() {
  const { toQueryParams, gradeLevel } = useTeacherFilters();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = {};
    const filterParams = toQueryParams();
    if (filterParams.gradeLevel) {
      params.gradeLevel = filterParams.gradeLevel;
    }
    gameService
      .listMine(params)
      .then((response) => setGames(response.data.data || []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [gradeLevel, toQueryParams]);

  if (loading) return <LoadingScreen />;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My Games"
        subtitle="Open any game you created to preview, edit, publish, or unpublish."
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
              No games yet. Create one with the AI Game Generator.
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
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Subject</TableCell>
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
                    <Button
                      component={RouterLink}
                      to={`/teacher/games/${game.id}/edit`}
                      size="small"
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
