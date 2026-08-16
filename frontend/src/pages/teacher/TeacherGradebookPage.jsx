import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink, useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import PageContainer from '../../components/common/PageContainer';
import LoadingScreen from '../../components/common/LoadingScreen';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function formatPoints(earned, total) {
  const earnedLabel = earned == null || earned === '' ? '—' : Number(earned);
  const totalLabel = total == null || total === '' ? '—' : Number(total);
  return `${earnedLabel} / ${totalLabel}`;
}

export default function TeacherGradebookPage() {
  const { courseId } = useParams();
  const [gradebook, setGradebook] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);

  function applyGradebook(data) {
    setGradebook(data);
    setSelectedQuizId((prev) => {
      if (prev && data.quizzes.some((quiz) => quiz.id === prev)) return prev;
      return data.quizzes[0]?.id || null;
    });
    setSelectedGameId((prev) => {
      if (prev && data.games.some((game) => game.id === prev)) return prev;
      return data.games[0]?.id || null;
    });
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    courseService.gradebook(courseId)
      .then((response) => {
        if (!active) return;
        applyGradebook(response.data.data);
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
  }, [courseId]);

  const selectedQuiz = useMemo(
    () => gradebook?.quizzes?.find((quiz) => quiz.id === selectedQuizId) || null,
    [gradebook, selectedQuizId]
  );
  const selectedGame = useMemo(
    () => gradebook?.games?.find((game) => game.id === selectedGameId) || null,
    [gradebook, selectedGameId]
  );

  const title = useMemo(() => {
    if (!gradebook) return 'Class Scores';
    return `${gradebook.course.subject || gradebook.course.title} · Scores`;
  }, [gradebook]);

  if (loading) return <LoadingScreen />;

  return (
    <PageContainer>
      <PageHeader
        title={title}
        subtitle="Select a quiz or game to view students who took it and the points they earned. XP is separate student progress."
        action={(
          <Button
            component={RouterLink}
            to={`/teacher/courses/${courseId}`}
            startIcon={<ArrowBackIcon />}
            variant="outlined"
          >
            Back to Manage
          </Button>
        )}
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {!gradebook ? null : (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${gradebook.summary.enrolledCount} enrolled`} />
            <Chip label={`${gradebook.summary.quizCount} quizzes`} variant="outlined" />
            <Chip label={`${gradebook.summary.gameCount} games`} variant="outlined" />
          </Stack>

          <Paper sx={{ p: { xs: 1.5, md: 2 } }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
              <Tab label="Quizzes" />
              <Tab label="Games" />
            </Tabs>

            {tab === 0 ? (
              !gradebook.quizzes.length ? (
                <Typography color="text.secondary">No quizzes in this subject yet.</Typography>
              ) : (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
                  <Paper variant="outlined" sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
                    <List dense disablePadding>
                      {gradebook.quizzes.map((quiz) => (
                        <ListItemButton
                          key={quiz.id}
                          selected={quiz.id === selectedQuizId}
                          onClick={() => setSelectedQuizId(quiz.id)}
                        >
                          <ListItemText
                            primary={quiz.title}
                            secondary={`${quiz.resultCount} student${quiz.resultCount === 1 ? '' : 's'} · Pass ${quiz.passingScore}%`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Paper>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {!selectedQuiz ? (
                      <Typography color="text.secondary">Select a quiz.</Typography>
                    ) : (
                      <Stack spacing={2}>
                        <Typography variant="h6" fontWeight={800}>{selectedQuiz.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Students who took this quiz (best attempt). Grade score is points earned / total from their answers.
                        </Typography>

                        {!selectedQuiz.results.length ? (
                          <Alert severity="info">No students have taken this quiz yet.</Alert>
                        ) : (
                          <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 800 }}>Student</TableCell>
                                  <TableCell sx={{ fontWeight: 800 }} align="center">Grade score</TableCell>
                                  <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
                                  <TableCell sx={{ fontWeight: 800 }}>Completed</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {selectedQuiz.results.map((result) => (
                                  <TableRow key={result.studentId} hover>
                                    <TableCell>
                                      <Typography fontWeight={700}>
                                        {result.firstName} {result.lastName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {result.attemptCount} attempt{result.attemptCount === 1 ? '' : 's'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography fontWeight={800}>
                                        {formatPoints(
                                          result.earnedPoints,
                                          result.totalPoints || selectedQuiz.maxPoints
                                        )}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        {result.score != null ? `${Number(result.score).toFixed(1)}%` : '—'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        size="small"
                                        label={result.passed ? 'Passed' : 'Not passed'}
                                        color={result.passed ? 'success' : 'default'}
                                        variant={result.passed ? 'filled' : 'outlined'}
                                      />
                                    </TableCell>
                                    <TableCell>{formatWhen(result.completedAt)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              )
            ) : null}

            {tab === 1 ? (
              !gradebook.games.length ? (
                <Typography color="text.secondary">No games in this subject yet.</Typography>
              ) : (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
                  <Paper variant="outlined" sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
                    <List dense disablePadding>
                      {gradebook.games.map((game) => (
                        <ListItemButton
                          key={game.id}
                          selected={game.id === selectedGameId}
                          onClick={() => setSelectedGameId(game.id)}
                        >
                          <ListItemText
                            primary={game.title}
                            secondary={`${game.resultCount} student${game.resultCount === 1 ? '' : 's'}`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Paper>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {!selectedGame ? (
                      <Typography color="text.secondary">Select a game.</Typography>
                    ) : (
                      <Stack spacing={2}>
                        <Typography variant="h6" fontWeight={800}>{selectedGame.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Students who played this game (best score). Grade score is points earned / 100 from gameplay.
                        </Typography>

                        {!selectedGame.results.length ? (
                          <Alert severity="info">No students have played this game yet.</Alert>
                        ) : (
                          <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 800 }}>Student</TableCell>
                                  <TableCell sx={{ fontWeight: 800 }} align="center">Grade score</TableCell>
                                  <TableCell sx={{ fontWeight: 800 }}>Played</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {selectedGame.results.map((result) => (
                                  <TableRow key={result.studentId} hover>
                                    <TableCell>
                                      <Typography fontWeight={700}>
                                        {result.firstName} {result.lastName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {result.playCount} play{result.playCount === 1 ? '' : 's'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography fontWeight={800}>
                                        {formatPoints(result.earnedPoints, result.totalPoints || 100)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>{formatWhen(result.playedAt)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              )
            ) : null}
          </Paper>
        </Stack>
      )}
    </PageContainer>
  );
}
