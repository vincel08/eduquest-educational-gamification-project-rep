import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import lessonService from '../../services/lessonService';
import { getErrorMessage } from '../../services/api';
import { pickMotivationalMessage } from '../../utils/feedbackMessages';
import { useAuth } from '../../contexts/AuthContext';
import { useRewards } from '../../contexts/RewardsContext';

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

  return (
    <>
      <PageHeader title={lesson.title} subtitle={lesson.summary} />
      <ContentTimestamp item={lesson} variant="date" showUpdated={false} sx={{ mb: 2, mt: 0 }} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Stack spacing={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Lesson Content
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{lesson.content}</Typography>
        </Paper>

        {lesson.learning_objectives ? (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Learning Objectives
            </Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{lesson.learning_objectives}</Typography>
          </Paper>
        ) : null}

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Materials
          </Typography>
          <List>
            {(lesson.materials || []).map((material) => {
              const apiBase = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:4000';
              const href = material.download_url
                ? `${apiBase}${material.download_url}`
                : null;
              return (
                <ListItem
                  key={material.id}
                  secondaryAction={href ? (
                    <Button
                      component="a"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={material.original_name}
                      variant="outlined"
                      size="small"
                    >
                      Download
                    </Button>
                  ) : null}
                >
                  <ListItemText
                    primary={material.original_name}
                    secondary={material.file_type}
                  />
                </ListItem>
              );
            })}
            {!lesson.materials?.length ? (
              <Typography color="text.secondary">No materials uploaded yet.</Typography>
            ) : null}
          </List>
        </Paper>

        <Button
          variant="contained"
          size="large"
          disabled={completing || lesson.progress?.status === 'completed'}
          onClick={handleComplete}
        >
          {lesson.progress?.status === 'completed'
            ? 'Completed'
            : completing
              ? 'Completing...'
              : `Complete Lesson (+${lesson.xp_reward} XP)`}
        </Button>
      </Stack>
    </>
  );
}
