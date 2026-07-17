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

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const enrolledRes = await courseService.myCourses();
        const courses = enrolledRes.data.data || [];
        const quizGroups = await Promise.all(
          courses.map(async (course) => {
            const response = await courseService.quizzes(course.id);
            return (response.data.data || []).map((quiz) => ({
              ...quiz,
              courseTitle: course.title,
            }));
          })
        );
        setQuizzes(quizGroups.flat());
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
      <PageHeader title="Quizzes" subtitle="Test your knowledge and earn XP." />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2}>
        {quizzes.map((quiz) => (
          <Grid key={quiz.id} size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">{quiz.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {quiz.courseTitle}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {quiz.question_count || 0} questions · {quiz.xp_reward} XP
                </Typography>
              </CardContent>
              <CardActions>
                <Button component={RouterLink} to={`/student/quizzes/${quiz.id}`}>
                  Start
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      {!quizzes.length && !error ? (
        <Typography color="text.secondary">No quizzes available yet. Enroll in a course first.</Typography>
      ) : null}
    </>
  );
}
