import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import XpBar from '../../components/gamification/XpBar';
import BadgeCard from '../../components/gamification/BadgeCard';
import MedalCard from '../../components/gamification/MedalCard';
import gamificationService from '../../services/gamificationService';
import analyticsService from '../../services/analyticsService';
import courseService from '../../services/courseService';
import authService from '../../services/authService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gradeLevel: '',
    schoolName: '',
    avatarUrl: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, analyticsRes, coursesRes] = await Promise.all([
          gamificationService.me(),
          analyticsService.student(),
          courseService.myCourses(),
        ]);
        const gamification = meRes.data.data;
        setData({ gamification, analytics: analyticsRes.data.data });
        updateProfile(gamification.profile);
        setCourses(coursesRes.data.data?.courses || coursesRes.data.data || []);
        setForm({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          gradeLevel: gamification.profile?.grade_level || '',
          schoolName: gamification.profile?.school_name || '',
          avatarUrl: user?.avatarUrl || '',
        });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [updateProfile, user?.firstName, user?.lastName, user?.avatarUrl]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await authService.updateProfile(form);
      updateProfile(response.data.data.profile, response.data.data.user);
      setMessage('Profile updated.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error && !data) return <Alert severity="error">{error}</Alert>;

  const studentProfile = data.gamification.profile;
  const analytics = data.analytics;

  return (
    <>
      <PageHeader title="My Profile" subtitle="Photo, progress, achievements, and rank" />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              src={form.avatarUrl || undefined}
              sx={{ width: 96, height: 96, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}
            >
              {(form.firstName || 'S')[0]}
            </Avatar>
            <Typography variant="h5">{form.firstName} {form.lastName}</Typography>
            <Typography color="text.secondary">{user?.email}</Typography>
            <Typography sx={{ mt: 1 }}>Grade: {studentProfile.grade_level || '—'}</Typography>
            <Typography>Rank: #{data.gamification.rank || '—'}</Typography>
            <Typography>XP: {studentProfile.xp} · Level {studentProfile.level}</Typography>
            <Typography>
              Streak: {studentProfile.current_streak || 0} days
              (best {studentProfile.longest_streak || 0})
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 2 }} component="form" onSubmit={handleSave}>
            <Typography variant="h6" gutterBottom>Edit Profile</Typography>
            <Stack spacing={2}>
              <TextField
                label="First name"
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              />
              <TextField
                label="Last name"
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              />
              <TextField
                label="Grade"
                value={form.gradeLevel}
                onChange={(e) => setForm((p) => ({ ...p, gradeLevel: e.target.value }))}
              />
              <TextField
                label="School"
                value={form.schoolName}
                onChange={(e) => setForm((p) => ({ ...p, schoolName: e.target.value }))}
              />
              <TextField
                label="Photo URL"
                value={form.avatarUrl}
                onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                helperText="Paste an image URL for your profile photo"
              />
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, mb: 2 }}>
            <XpBar xp={studentProfile.xp} level={studentProfile.level} />
            <Typography sx={{ mt: 2 }}>
              Progress: {analytics.averageProgress}% · Completed courses:{' '}
              {(courses || []).filter((c) => Number(c.progress_percent) >= 100).length}
            </Typography>
            <Typography>
              Certificates: {analytics.certificates} · Badges: {analytics.badges} · Medals: {analytics.medals}
            </Typography>
          </Paper>

          <Typography variant="h6" sx={{ mb: 1 }}>Badges</Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {(data.gamification.badges || []).map((badge) => (
              <Grid key={badge.id || badge.badge_id} size={{ xs: 12, sm: 6 }}>
                <BadgeCard badge={badge} />
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" sx={{ mb: 1 }}>Medals</Typography>
          <Grid container spacing={1}>
            {(data.gamification.medals || []).map((medal) => (
              <Grid key={medal.id || medal.medal_id} size={{ xs: 12, sm: 6 }}>
                <MedalCard medal={medal} />
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
