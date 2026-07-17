import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';

export default function StudentGamesPage() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const enrolledRes = await courseService.myCourses();
        const courses = enrolledRes.data.data || [];
        const groups = await Promise.all(
          courses.map(async (course) => {
            const response = await courseService.games(course.id);
            return (response.data.data || []).map((game) => ({
              ...game,
              courseTitle: course.title,
            }));
          })
        );
        setGames(groups.flat());
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Educational Games" subtitle="Play, learn, and earn bonus XP." />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2}>
        {games.map((game) => (
          <Grid key={game.id} size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">{game.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {game.courseTitle}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, textTransform: 'capitalize' }}>
                  {game.game_type.replace(/_/g, ' ')} · {game.xp_reward} XP
                </Typography>
              </CardContent>
              <CardActions>
                <Button component={RouterLink} to={`/student/games/${game.id}`}>
                  Play
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
