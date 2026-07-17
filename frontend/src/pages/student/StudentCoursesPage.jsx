import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';

export default function StudentCoursesPage() {
  const [catalog, setCatalog] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [catalogRes, enrolledRes] = await Promise.all([
        courseService.list({ limit: 50 }),
        courseService.myCourses(),
      ]);
      setCatalog(catalogRes.data.data.courses || []);
      setEnrolled(enrolledRes.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleEnroll(courseId) {
    setEnrollingId(courseId);
    try {
      await courseService.enroll(courseId);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEnrollingId(null);
    }
  }

  if (loading) return <LoadingScreen />;

  const enrolledIds = new Set(enrolled.map((course) => course.id));

  return (
    <>
      <PageHeader
        title="Learning Modules"
        subtitle="Browse courses and continue your enrolled quests."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Typography variant="h6" sx={{ mb: 2 }}>
        My Courses
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {enrolled.length ? enrolled.map((course) => (
          <Grid key={course.id} size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">{course.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {course.subject} · {course.grade_level}
                </Typography>
                <Typography variant="body2">
                  Progress: {Number(course.progress_percent || 0)}%
                </Typography>
              </CardContent>
              <CardActions>
                <Button component={RouterLink} to={`/student/courses/${course.id}`}>
                  Continue
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )) : (
          <Grid size={12}>
            <Typography color="text.secondary">You are not enrolled in any courses yet.</Typography>
          </Grid>
        )}
      </Grid>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Course Catalog
      </Typography>
      <Grid container spacing={2}>
        {catalog.map((course) => (
          <Grid key={course.id} size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">{course.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {course.subject}
                </Typography>
                <Typography variant="body2">
                  {course.description}
                </Typography>
              </CardContent>
              <CardActions>
                {enrolledIds.has(course.id) ? (
                  <Button component={RouterLink} to={`/student/courses/${course.id}`}>
                    Open
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    disabled={enrollingId === course.id}
                    onClick={() => handleEnroll(course.id)}
                  >
                    {enrollingId === course.id ? 'Enrolling...' : 'Enroll'}
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
