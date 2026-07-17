import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';

export default function StudentCourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [courseRes, lessonsRes, quizzesRes, gamesRes] = await Promise.all([
          courseService.getById(courseId),
          courseService.lessons(courseId),
          courseService.quizzes(courseId),
          courseService.games(courseId),
        ]);
        setCourse(courseRes.data.data);
        setLessons(lessonsRes.data.data || []);
        setQuizzes(quizzesRes.data.data || []);
        setGames(gamesRes.data.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  if (loading) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <PageHeader
        title={course.title}
        subtitle={course.description}
      />

      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Lessons
          </Typography>
          <List>
            {lessons.map((lesson) => (
              <ListItem
                key={lesson.id}
                secondaryAction={(
                  <Button component={RouterLink} to={`/student/lessons/${lesson.id}`}>
                    Open
                  </Button>
                )}
              >
                <ListItemText
                  primary={lesson.title}
                  secondary={`XP reward: ${lesson.xp_reward || 25}`}
                />
                <Chip
                  size="small"
                  label={lesson.status || 'not_started'}
                  sx={{ mr: 10, textTransform: 'capitalize' }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quizzes
          </Typography>
          <List>
            {quizzes.map((quiz) => (
              <ListItem
                key={quiz.id}
                secondaryAction={(
                  <Button component={RouterLink} to={`/student/quizzes/${quiz.id}`}>
                    Take Quiz
                  </Button>
                )}
              >
                <ListItemText
                  primary={quiz.title}
                  secondary={`${quiz.question_count || 0} questions · ${quiz.xp_reward} XP`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Games
          </Typography>
          <List>
            {games.map((game) => (
              <ListItem
                key={game.id}
                secondaryAction={(
                  <Button component={RouterLink} to={`/student/games/${game.id}`}>
                    Play
                  </Button>
                )}
              >
                <ListItemText
                  primary={game.title}
                  secondary={game.game_type.replace(/_/g, ' ')}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Stack>
    </>
  );
}
