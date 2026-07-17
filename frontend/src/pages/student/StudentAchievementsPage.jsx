import { useEffect, useState } from 'react';
import { Alert, Grid, Paper, Typography } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
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
        title="Achievements"
        subtitle="Badges, medals, and your XP journey."
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <XpBar
          xp={data.profile.xp}
          level={data.profile.level}
          xpInLevel={data.profile.xpInLevel}
          xpToNextLevel={data.profile.xpToNextLevel}
        />
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
            <Typography color="text.secondary">No badges yet. Complete lessons and quizzes to unlock some!</Typography>
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
            <Typography color="text.secondary">No medals yet. Keep leveling up!</Typography>
          </Grid>
        ) : null}
      </Grid>
    </>
  );
}
