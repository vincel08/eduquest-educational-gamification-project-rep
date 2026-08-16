import { useEffect, useState } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import quizService from '../../services/quizService';
import { getErrorMessage } from '../../services/api';

export default function TeacherQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    quizService.listMine()
      .then((response) => setQuizzes(response.data.data || []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Quizzes"
        subtitle="Create quizzes manually or continue using the AI Quiz Generator. Students only see published quizzes."
        action={(
          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              to="/teacher/ai-quiz"
              variant="outlined"
            >
              AI Quiz Generator
            </Button>
            <Button
              component={RouterLink}
              to="/teacher/quizzes/new"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Create Quiz
            </Button>
          </Stack>
        )}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: 2 }}>
        {!quizzes.length ? (
          <Stack spacing={2} alignItems="flex-start" sx={{ p: 2 }}>
            <Typography color="text.secondary">
              No quizzes yet. Create one manually — AI is optional.
            </Typography>
            <Button
              component={RouterLink}
              to="/teacher/quizzes/new"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Create Quiz
            </Button>
          </Stack>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Questions</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Source</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quizzes.map((quiz) => (
                <TableRow key={quiz.id} hover>
                  <TableCell>
                    <Typography fontWeight={700}>{quiz.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {quiz.xp_reward} XP · Pass {quiz.passing_score}%
                    </Typography>
                  </TableCell>
                  <TableCell>{quiz.course_title || `Course #${quiz.course_id}`}</TableCell>
                  <TableCell>{quiz.question_count || 0}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={quiz.is_published ? 'success' : 'default'}
                      label={quiz.is_published ? 'Published' : 'Draft'}
                    />
                  </TableCell>
                  <TableCell>
                    {quiz.is_ai_generated ? (
                      <Chip size="small" color="secondary" variant="outlined" label="AI" />
                    ) : (
                      <Chip size="small" variant="outlined" label="Manual" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`/teacher/quizzes/${quiz.id}/edit`}
                      size="small"
                    >
                      Edit
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
