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
import ContentTimestamp from '../../components/common/ContentTimestamp';
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
      <ContentTimestamp item={course} variant="date" showUpdated={false} sx={{ mb: 2, mt: 0 }} />

      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Lessons
          </Typography>
          <List>
            {lessons.map((lesson) => (
              <ListItem
                key={lesson.id}
                alignItems="flex-start"
                secondaryAction={(
                  <Button component={RouterLink} to={`/student/lessons/${lesson.id}`}>
                    Open
                  </Button>
                )}
              >
                <ListItemText
                  primary={lesson.title}
                  secondary={(
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        XP reward: {lesson.xp_reward || 25}
                      </Typography>
                      <ContentTimestamp item={lesson} variant="date" showUpdated={false} dense />
                    </Stack>
                  )}
                  secondaryTypographyProps={{ component: 'div' }}
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
                alignItems="flex-start"
                secondaryAction={(
                  <Button component={RouterLink} to={`/student/quizzes/${quiz.id}`}>
                    Take Quiz
                  </Button>
                )}
              >
                <ListItemText
                  primary={quiz.title}
                  secondary={(
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {quiz.question_count || 0} questions · {quiz.xp_reward} XP
                      </Typography>
                      <ContentTimestamp item={quiz} variant="date" showUpdated={false} dense />
                    </Stack>
                  )}
                  secondaryTypographyProps={{ component: 'div' }}
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
                alignItems="flex-start"
                secondaryAction={(
                  <Button component={RouterLink} to={`/student/games/${game.id}`}>
                    Play
                  </Button>
                )}
              >
                <ListItemText
                  primary={game.title}
                  secondary={(
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {String(game.game_type || '').replace(/_/g, ' ')}
                      </Typography>
                      <ContentTimestamp item={game} variant="date" showUpdated={false} dense />
                    </Stack>
                  )}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Stack>
    </>
  );
}
