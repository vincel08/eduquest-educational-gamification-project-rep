import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { Link as RouterLink, useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import PageContainer from '../../components/common/PageContainer';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import lessonService from '../../services/lessonService';
import { getErrorMessage } from '../../services/api';
import { pickMotivationalMessage } from '../../utils/feedbackMessages';
import { buildAuthenticatedFileUrl } from '../../utils/fileUrls';
import { useAuth } from '../../contexts/AuthContext';
import { useRewards } from '../../contexts/RewardsContext';
import {
  formatFileSize,
  formatUploadDate,
  isViewableMaterial,
} from '../../utils/materialActions';

export default function StudentLessonPage() {
  const { lessonId } = useParams();
  const { updateProfile, profile } = useAuth();
  const { notifyReward } = useRewards();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await lessonService.getById(lessonId);
        setLesson(response.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonId]);

  async function handleComplete() {
    setCompleting(true);
    setError('');
    setMessage('');
    try {
      const response = await lessonService.complete(lessonId);
      const result = response.data.data;
      if (!result.alreadyCompleted) {
        const previousLevel = profile?.level;
        if (result.xpAward?.profile) {
          updateProfile(result.xpAward.profile);
        }
        notifyReward({
          xpEarned: result.progress?.xp_earned || 0,
          previousLevel,
          nextProfile: result.xpAward?.profile,
          badges: result.xpAward?.newlyUnlocked?.badges || [],
          medals: result.xpAward?.newlyUnlocked?.medals || [],
          certificate: result.certificate || null,
          celebrateWin: true,
        });
        let msg = `${pickMotivationalMessage()} Lesson completed! +${result.progress.xp_earned} XP`;
        if (result.progressPercent != null) {
          msg += ` · Course progress ${result.progressPercent}%`;
        }
        if (result.certificate) {
          msg += ` · Certificate earned: ${result.certificate.title || result.certificate.certificate_code}`;
        }
        setMessage(msg);
      } else {
        setMessage('Lesson already completed.');
      }
      setLesson((prev) => ({ ...prev, progress: result.progress }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error && !lesson) return <Alert severity="error">{error}</Alert>;

  const completed = lesson.progress?.status === 'completed';

  return (
    <PageContainer>
      <PageHeader
        title={lesson.title}
        subtitle={lesson.summary || 'Interactive lesson'}
        action={(
          <Chip
            icon={completed ? <CheckCircleIcon /> : <MenuBookIcon />}
            color={completed ? 'success' : 'default'}
            label={completed ? 'Completed' : 'In progress'}
            sx={{ fontWeight: 700, bgcolor: completed ? undefined : 'rgba(255,255,255,0.2)', color: completed ? undefined : '#fff' }}
          />
        )}
      />
      <ContentTimestamp item={lesson} variant="date" showUpdated={false} sx={{ mb: 2, mt: 0 }} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Lesson Content
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
                {lesson.content}
              </Typography>
            </Paper>

            {lesson.learning_objectives ? (
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" fontWeight={800} gutterBottom>
                  Learning Objectives
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{lesson.learning_objectives}</Typography>
              </Paper>
            ) : null}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            <Paper
              className={completed ? 'glass-accent' : undefined}
              sx={{ p: 2.5 }}
            >
              <Typography variant="h6" fontWeight={800} gutterBottom sx={{ color: completed ? '#fff' : 'inherit' }}>
                Lesson Progress
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon color={completed ? 'inherit' : 'disabled'} fontSize="small" />
                  <Typography fontWeight={700} sx={{ color: completed ? '#fff' : 'inherit' }}>
                    {completed ? 'Lesson completed' : 'Finish reading, then mark complete'}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ opacity: completed ? 0.9 : 1, color: completed ? '#fff' : 'text.secondary' }}>
                  Reward: +{lesson.xp_reward || 25} XP
                </Typography>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Materials
              </Typography>
              <List dense disablePadding>
                {(lesson.materials || []).map((material) => {
                  const href = buildAuthenticatedFileUrl(material.download_url);
                  const uploaded = formatUploadDate(material.created_at);
                  const sizeLabel = formatFileSize(material.file_size);
                  return (
                    <ListItem
                      key={material.id}
                      sx={{ px: 0, alignItems: 'flex-start' }}
                      secondaryAction={href ? (
                        <Stack direction="row" spacing={0.5}>
                          {isViewableMaterial(material.file_type) ? (
                            <Button component="a" href={href} target="_blank" rel="noopener noreferrer" size="small">
                              View
                            </Button>
                          ) : null}
                          <Button
                            component="a"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={material.original_name}
                            size="small"
                            startIcon={<DownloadIcon />}
                          >
                            Save
                          </Button>
                        </Stack>
                      ) : null}
                    >
                      <ListItemText
                        primary={material.original_name}
                        secondary={`${material.file_type || 'File'}${sizeLabel ? ` · ${sizeLabel}` : ''}${uploaded ? ` · ${uploaded}` : ''}`}
                        sx={{ pr: 12 }}
                      />
                    </ListItem>
                  );
                })}
              </List>
              {!lesson.materials?.length ? (
                <Typography color="text.secondary">No materials uploaded yet.</Typography>
              ) : null}
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Quick Actions
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  size="large"
                  disabled={completing || completed}
                  onClick={handleComplete}
                  fullWidth
                >
                  {completed
                    ? 'Completed'
                    : completing
                      ? 'Completing...'
                      : `Complete Lesson (+${lesson.xp_reward || 25} XP)`}
                </Button>
                {lesson.course_id ? (
                  <Button
                    component={RouterLink}
                    to={`/student/courses/${lesson.course_id}`}
                    variant="outlined"
                    startIcon={<QuizIcon />}
                    fullWidth
                  >
                    Back to Course
                  </Button>
                ) : null}
                <Button
                  component={RouterLink}
                  to="/student/games"
                  variant="outlined"
                  color="secondary"
                  startIcon={<SportsEsportsIcon />}
                  fullWidth
                >
                  Play a Game
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
