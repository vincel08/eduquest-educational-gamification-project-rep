import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
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
import { buildAuthenticatedFileUrl } from '../../utils/fileUrls';
import { useAuth } from '../../contexts/AuthContext';
import {
  GRADE_LEVELS,
  GRADE_LEVEL_PLACEHOLDER,
  isValidGradeLevel,
} from '../../utils/gradeLevels';

function resolveAvatarUrl(url) {
  if (!url) return undefined;
  if (url.startsWith('blob:')) {
    return url;
  }
  return buildAuthenticatedFileUrl(url) || undefined;
}

export default function StudentProfilePage() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gradeLevel: '',
    schoolName: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
        const existingGrade = gamification.profile?.grade_level || '';
        setForm({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          // Keep unknown/legacy values editable as empty so the student can pick a supported grade.
          gradeLevel: isValidGradeLevel(existingGrade) ? existingGrade : '',
          schoolName: gamification.profile?.school_name || '',
        });
        setAvatarUrl(user?.avatarUrl || '');
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
      // Avatar is updated only via upload/remove endpoints — never send display URLs here.
      const response = await authService.updateProfile({
        ...form,
      });
      updateProfile(response.data.data.profile, response.data.data.user);
      setAvatarUrl(response.data.data.user?.avatarUrl || '');
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          gamification: {
            ...prev.gamification,
            profile: {
              ...prev.gamification.profile,
              ...(response.data.data.profile || {}),
            },
          },
        };
      });
      setMessage('Profile updated.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingAvatar(true);
    setError('');
    setMessage('');
    try {
      const response = await authService.uploadAvatar(file);
      updateProfile(response.data.data.profile, response.data.data.user);
      setAvatarUrl(response.data.data.user?.avatarUrl || '');
      setMessage('Profile picture updated.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    setError('');
    setMessage('');
    try {
      const response = await authService.removeAvatar();
      updateProfile(response.data.data.profile, response.data.data.user);
      setAvatarUrl('');
      setMessage('Profile picture removed.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
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
              src={resolveAvatarUrl(avatarUrl)}
              sx={{ width: 112, height: 112, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}
            >
              {(form.firstName || 'S')[0]}
            </Avatar>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<PhotoCameraIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Uploading...' : 'Upload photo'}
              </Button>
              {avatarUrl ? (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<CancelRoundedIcon />}
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                >
                  Remove photo
                </Button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                hidden
                onChange={handleAvatarChange}
              />
              <Typography variant="caption" color="text.secondary">
                PNG, JPG, or WEBP up to 5MB
              </Typography>
            </Stack>
            <Typography variant="h5">{form.firstName} {form.lastName}</Typography>
            <Typography color="text.secondary">{user?.email}</Typography>
            <Typography sx={{ mt: 1 }}>
              Grade Level: {studentProfile.grade_level || '—'}
            </Typography>
            <Typography>Rank: #{studentProfile.rank || '—'}</Typography>
            <Typography>XP: {studentProfile.xp}</Typography>
            <Typography>
              Streak: {studentProfile.current_streak || 0} days
              (best {studentProfile.longest_streak || 0})
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 2 }} component="form" onSubmit={handleSave}>
            <Typography variant="h6" gutterBottom>Edit Profile</Typography>
            {!studentProfile.grade_level ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Please select your grade level to complete your profile.
              </Alert>
            ) : null}
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
                select
                label="Grade Level"
                fullWidth
                value={form.gradeLevel}
                onChange={(e) => setForm((p) => ({ ...p, gradeLevel: e.target.value }))}
                helperText={
                  form.gradeLevel
                    ? undefined
                    : GRADE_LEVEL_PLACEHOLDER
                }
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (!selected) {
                      return GRADE_LEVEL_PLACEHOLDER;
                    }
                    return selected;
                  },
                }}
              >
                <MenuItem value="">
                  {GRADE_LEVEL_PLACEHOLDER}
                </MenuItem>
                {GRADE_LEVELS.map((grade) => (
                  <MenuItem key={grade} value={grade}>
                    {grade}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="School"
                value={form.schoolName}
                onChange={(e) => setForm((p) => ({ ...p, schoolName: e.target.value }))}
              />
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, mb: 2 }}>
            <XpBar xp={studentProfile.xp} />
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
