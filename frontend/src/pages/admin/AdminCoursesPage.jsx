import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await courseService.list({ limit: 100 });
      setCourses(response.data.data.courses || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePublish(course) {
    try {
      await courseService.update(course.id, { isPublished: !course.is_published });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function removeCourse(courseId) {
    try {
      await courseService.remove(courseId);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Course Management"
        subtitle="Publish, unpublish, and remove courses across the platform."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>{course.title}</TableCell>
                <TableCell>{course.subject}</TableCell>
                <TableCell>
                  {course.teacher_first_name} {course.teacher_last_name}
                </TableCell>
                <TableCell>{course.is_published ? 'Published' : 'Draft'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => togglePublish(course)}>
                    {course.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="small" color="error" onClick={() => removeCourse(course.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
