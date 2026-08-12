import { useEffect, useMemo, useState } from 'react';
import { Alert, Grid } from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import QuestCard from '../../components/common/QuestCard';
import EmptyState from '../../components/common/EmptyState';
import ContentTimestampToolbar from '../../components/common/ContentTimestampToolbar';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';
import { applyTimestampControls } from '../../utils/contentTimestamps';

export default function StudentGamesPage() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState({});

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

  const visibleGames = useMemo(
    () => applyTimestampControls(games, { sort, filters }),
    [games, sort, filters]
  );

  if (loading) return <LoadingScreen label="Loading games..." showCards />;

  return (
    <>
      <PageHeader
        title="Game Zone"
        subtitle="Play, learn, and stack bonus XP."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <ContentTimestampToolbar
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
        showUpdatedFilters={false}
      />
      {visibleGames.length ? (
        <Grid container spacing={2}>
          {visibleGames.map((game) => (
            <Grid key={game.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <QuestCard
                title={game.title}
                description={game.courseTitle || game.description}
                icon={<SportsEsportsIcon />}
                accent="orange"
                difficulty={game.difficulty || game.game_type}
                xpReward={game.xp_reward}
                estimatedTime={game.estimated_time}
                status="Playable"
                statusColor="success"
                meta={String(game.game_type || '').replace(/_/g, ' ')}
                showTimestamp
                item={game}
                to={`/student/games/${game.id}`}
                actionLabel="Play Now"
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState
          icon={<SportsEsportsIcon sx={{ fontSize: 36 }} />}
          title="No games unlocked yet"
          description="Games appear when teachers publish them to your courses."
          actionLabel="View courses"
          to="/student/courses"
          color="#F97316"
        />
      )}
    </>
  );
}
