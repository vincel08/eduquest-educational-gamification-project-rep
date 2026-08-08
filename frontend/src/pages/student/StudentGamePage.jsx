import { useEffect, useState } from 'react';
import {
  Alert,
  Paper,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import ContentTimestamp from '../../components/common/ContentTimestamp';
import GamePreview from '../../components/games/GamePreview';
import FinalScore from '../../components/games/FinalScore';
import gameService from '../../services/gameService';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';
import { pickMotivationalMessage } from '../../utils/feedbackMessages';
import { playSound, SOUND_KEYS } from '../../utils/soundEffects';
import { useAuth } from '../../contexts/AuthContext';
import { useRewards } from '../../contexts/RewardsContext';

export default function StudentGamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { updateProfile, profile } = useAuth();
  const { notifyReward } = useRewards();
  const [game, setGame] = useState(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState(0);
  const [motivation, setMotivation] = useState('');
  const [nextGame, setNextGame] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await gameService.getById(gameId);
        setGame(response.data.data);
        try {
          const enrolledRes = await courseService.myCourses();
          const courses = enrolledRes.data.data || [];
          const groups = await Promise.all(
            courses.map(async (course) => {
              const gamesRes = await courseService.games(course.id);
              return gamesRes.data.data || [];
            })
          );
          const allGames = groups.flat();
          const currentIndex = allGames.findIndex((item) => Number(item.id) === Number(gameId));
          const recommended = currentIndex >= 0
            ? allGames[currentIndex + 1] || allGames.find((item) => Number(item.id) !== Number(gameId))
            : allGames.find((item) => Number(item.id) !== Number(gameId));
          setNextGame(recommended || null);
        } catch {
          setNextGame(null);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [gameId]);

  async function finishGame(resultPayload) {
    if (finished) return;
    setFinished(true);

    const clientScore = typeof resultPayload === 'number'
      ? resultPayload
      : Number(resultPayload?.score) || 0;
    const answers = typeof resultPayload === 'number'
      ? null
      : resultPayload?.answers;

    try {
      const response = await gameService.submitScore(gameId, {
        score: clientScore,
        answers,
        durationSeconds: resultPayload?.durationSeconds ?? 60,
      });
      const payload = response.data.data;
      const previousLevel = profile?.level;
      const nextProfile = payload.xpAward?.profile || profile;
      if (payload.xpAward?.profile) {
        updateProfile(payload.xpAward.profile);
      }
      const serverScore = payload.serverScore ?? payload.score?.score ?? clientScore;
      const xpEarned = payload.score?.xp_earned || 0;
      setMotivation(pickMotivationalMessage());
      playSound(SOUND_KEYS.gameComplete);
      notifyReward({
        xpEarned,
        previousLevel,
        nextProfile: payload.xpAward?.profile,
        badges: payload.xpAward?.newlyUnlocked?.badges || [],
        medals: payload.xpAward?.newlyUnlocked?.medals || [],
        celebrateWin: serverScore >= 70,
      });
      setResult({
        score: serverScore,
        percentage: Math.max(0, Math.min(100, Number(serverScore) || 0)),
        xpEarned,
        level: nextProfile?.level ?? null,
        xpInLevel: nextProfile?.xpInLevel ?? nextProfile?.xp_in_level ?? null,
        xpToNextLevel: nextProfile?.xpToNextLevel ?? nextProfile?.xp_to_next_level ?? null,
        badges: payload.xpAward?.newlyUnlocked?.badges || [],
        medals: payload.xpAward?.newlyUnlocked?.medals || [],
        motivation: pickMotivationalMessage(),
      });
    } catch (err) {
      setFinished(false);
      setError(getErrorMessage(err));
    }
  }

  function playAgain() {
    setFinished(false);
    setResult(null);
    setError('');
    setSessionKey((prev) => prev + 1);
  }

  if (loading) return <LoadingScreen />;
  if (error && !game) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <PageHeader title={game.title} subtitle={game.description} />
      <ContentTimestamp item={game} variant="date" showUpdated={false} sx={{ mb: 2, mt: 0 }} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Type: {game.game_type} · XP reward: {game.xp_reward}
        </Typography>

        {!finished ? (
          <GamePreview
            key={sessionKey}
            gameType={game.game_type}
            gameData={game.game_data}
            xpReward={game.xp_reward}
            onComplete={finishGame}
          />
        ) : result ? (
          <FinalScore
            score={result.score}
            percentage={result.percentage}
            xpEarned={result.xpEarned}
            level={result.level}
            xpInLevel={result.xpInLevel}
            xpToNextLevel={result.xpToNextLevel}
            badges={result.badges}
            medals={result.medals}
            motivation={motivation || result.motivation}
            nextGame={nextGame}
            onNextGame={nextGame ? () => navigate(`/student/games/${nextGame.id}`) : undefined}
            onPlayAgain={playAgain}
            onDashboard={() => navigate('/student/dashboard')}
            onLeaderboard={() => navigate('/student/leaderboard')}
            onContinue={() => navigate('/student/games')}
          />
        ) : (
          <Typography>Finishing game...</Typography>
        )}
      </Paper>
    </>
  );
}
