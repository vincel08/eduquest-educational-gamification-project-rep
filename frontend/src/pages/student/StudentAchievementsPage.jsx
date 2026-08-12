import { useEffect, useState } from 'react';
import { Alert, Grid, Paper, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import EmptyState from '../../components/common/EmptyState';
import BadgeCard from '../../components/gamification/BadgeCard';
import MedalCard from '../../components/gamification/MedalCard';
import XpBar from '../../components/gamification/XpBar';
import gamificationService from '../../services/gamificationService';
import { getErrorMessage } from '../../services/api';

export default function StudentAchievementsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamificationService.me()
      .then((response) => setData(response.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <PageHeader
        title="Trophy Room"
        subtitle="Badges, medals, and your XP journey."
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <XpBar xp={data.profile.xp} />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Leaderboard rank: #{data.profile.rank || '—'}
        </Typography>
      </Paper>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Badges
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {data.badges.map((badge) => (
          <Grid key={badge.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <BadgeCard badge={badge} />
          </Grid>
        ))}
        {!data.badges.length ? (
          <Grid size={12}>
            <EmptyState
              icon={<EmojiEventsIcon sx={{ fontSize: 36 }} />}
              title="No achievements unlocked yet"
              description="Complete lessons and quizzes to earn your first badge!"
              actionLabel="Take a quiz"
              to="/student/quizzes"
              color="#FACC15"
            />
          </Grid>
        ) : null}
      </Grid>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Medals
      </Typography>
      <Grid container spacing={2}>
        {data.medals.map((medal) => (
          <Grid key={medal.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <MedalCard medal={medal} />
          </Grid>
        ))}
        {!data.medals.length ? (
          <Grid size={12}>
            <EmptyState
              icon={<MilitaryTechIcon sx={{ fontSize: 36 }} />}
              title="No medals yet"
              description="Keep completing challenges to earn medals."
              actionLabel="Continue learning"
              to="/student/courses"
              color="#F97316"
            />
          </Grid>
        ) : null}
      </Grid>
    </>
  );
}
