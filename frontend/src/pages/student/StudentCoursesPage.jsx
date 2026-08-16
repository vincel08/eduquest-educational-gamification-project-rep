import { useEffect, useState } from 'react';
import { Alert, Grid, Typography } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import QuestCard from '../../components/common/QuestCard';
import EmptyState from '../../components/common/EmptyState';
import SectionHeader from '../../components/common/SectionHeader';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';

export default function StudentCoursesPage() {
  const [catalog, setCatalog] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

  if (loading) return <LoadingScreen label="Loading subjects..." showCards />;

  const enrolledIds = new Set(enrolled.map((course) => course.id));

  return (
    <>
      <PageHeader
        title="Learning Quests"
        subtitle="Browse subjects and continue your adventure."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <SectionHeader
        title="My Subjects"
        subtitle="Pick up where you left off"
        icon={<SchoolIcon color="primary" />}
      />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {enrolled.length ? enrolled.map((course) => (
          <Grid key={course.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <QuestCard
              title={course.subject || course.title}
              description={`${course.grade_level || ''}${course.description ? ` · ${course.description}` : ''}`.trim() || 'Subject overview'}
              icon={<SchoolIcon />}
              accent="blue"
              status={`${Number(course.progress_percent || 0)}% lessons`}
              statusColor={Number(course.progress_percent || 0) >= 100 ? 'success' : 'primary'}
              showTimestamp
              item={course}
              to={`/student/courses/${course.id}`}
              actionLabel="Continue Quest"
            />
          </Grid>
        )) : (
          <Grid size={12}>
            <EmptyState
              icon={<MenuBookIcon sx={{ fontSize: 36 }} />}
              title="No enrolled subjects yet"
              description="Browse the catalog below and join your first learning quest!"
              color="#3B82F6"
            />
          </Grid>
        )}
      </Grid>

      <SectionHeader
        title="Subject Catalog"
        subtitle="Discover new subjects to master"
        icon={<MenuBookIcon color="secondary" />}
      />
      <Grid container spacing={2}>
        {catalog.length ? catalog.map((course) => (
          <Grid key={course.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <QuestCard
              title={course.subject || course.title}
              description={course.description || 'Subject overview'}
              icon={<MenuBookIcon />}
              accent={enrolledIds.has(course.id) ? 'green' : 'purple'}
              difficulty={course.grade_level}
              status={enrolledIds.has(course.id) ? 'Enrolled' : 'Available'}
              statusColor={enrolledIds.has(course.id) ? 'success' : 'secondary'}
              showTimestamp
              item={course}
              to={`/student/courses/${course.id}`}
              actionLabel={enrolledIds.has(course.id) ? 'Open' : 'View Subject'}
            />
          </Grid>
        )) : (
          <Grid size={12}>
            <Typography color="text.secondary">No subjects published yet.</Typography>
          </Grid>
        )}
      </Grid>
    </>
  );
}
