import { useEffect, useMemo, useState } from 'react';
import { Alert, Grid } from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import QuestCard from '../../components/common/QuestCard';
import EmptyState from '../../components/common/EmptyState';
import ContentTimestampToolbar from '../../components/common/ContentTimestampToolbar';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';
import { applyTimestampControls } from '../../utils/contentTimestamps';

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState({});

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
              courseTitle: course.subject || course.title,
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

  const visibleQuizzes = useMemo(
    () => applyTimestampControls(quizzes, { sort, filters }),
    [quizzes, sort, filters]
  );

  if (loading) return <LoadingScreen label="Loading quizzes..." showCards />;

  return (
    <>
      <PageHeader
        title="Quiz Arena"
        subtitle="Test your knowledge and earn XP."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <ContentTimestampToolbar
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
        showUpdatedFilters={false}
      />
      {visibleQuizzes.length ? (
        <Grid container spacing={2}>
          {visibleQuizzes.map((quiz) => (
            <Grid key={quiz.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <QuestCard
                title={quiz.title}
                description={quiz.courseTitle || quiz.description}
                icon={<QuizIcon />}
                accent="purple"
                difficulty={quiz.difficulty || 'Challenge'}
                xpReward={quiz.xp_reward}
                estimatedTime={quiz.time_limit_minutes}
                status={`${quiz.question_count || 0} Qs`}
                statusColor="secondary"
                showTimestamp
                item={quiz}
                to={`/student/quizzes/${quiz.id}`}
                actionLabel="Start Challenge"
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState
          icon={<QuizIcon sx={{ fontSize: 36 }} />}
          title="No quizzes yet"
          description="Enroll in a subject first — new challenges will appear here."
          actionLabel="Browse subjects"
          to="/student/courses"
          color="#8B5CF6"
        />
      )}
    </>
  );
}
