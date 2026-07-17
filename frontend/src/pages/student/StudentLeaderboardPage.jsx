import { useEffect, useState } from 'react';
import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import LeaderboardCard from '../../components/gamification/LeaderboardCard';
import gamificationService from '../../services/gamificationService';
import { getErrorMessage } from '../../services/api';

export default function StudentLeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [period, setPeriod] = useState('overall');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    gamificationService.leaderboard({ limit: 20, period })
      .then((response) => setEntries(response.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading && !entries.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Leaderboard"
        subtitle="Weekly, monthly, and all-time XP rankings."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
          <MenuItem value="overall">Overall</MenuItem>
        </TextField>
      </Stack>
      <LeaderboardCard entries={entries} />
    </>
  );
}
