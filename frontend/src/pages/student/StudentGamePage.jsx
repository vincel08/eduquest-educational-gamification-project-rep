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
import { getErrorMessage } from '../../services/api';
import { celebrate } from '../../utils/confetti';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentGamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { updateProfile, profile } = useAuth();
  const [game, setGame] = useState(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const response = await gameService.getById(gameId);
        setGame(response.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [gameId]);

  async function finishGame(finalScore) {
    if (finished) return;
    setFinished(true);
    try {
      const response = await gameService.submitScore(gameId, {
        score: finalScore,
        durationSeconds: 60,
      });
      const payload = response.data.data;
      const nextProfile = payload.xpAward?.profile || profile;
      if (payload.xpAward?.profile) {
        updateProfile(payload.xpAward.profile);
      }
      setResult({
        score: finalScore,
        percentage: Math.max(0, Math.min(100, Number(finalScore) || 0)),
        xpEarned: payload.score?.xp_earned || 0,
        level: nextProfile?.level ?? null,
        xpInLevel: nextProfile?.xpInLevel ?? nextProfile?.xp_in_level ?? null,
        xpToNextLevel: nextProfile?.xpToNextLevel ?? nextProfile?.xp_to_next_level ?? null,
        badges: payload.xpAward?.newlyUnlocked?.badges || [],
        medals: payload.xpAward?.newlyUnlocked?.medals || [],
      });
      if (finalScore >= 70) celebrate();
    } catch (err) {
      setError(getErrorMessage(err));
      setResult({
        score: finalScore,
        percentage: Math.max(0, Math.min(100, Number(finalScore) || 0)),
        xpEarned: 0,
        level: profile?.level ?? null,
        xpInLevel: profile?.xpInLevel ?? null,
        xpToNextLevel: profile?.xpToNextLevel ?? null,
        badges: [],
        medals: [],
      });
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
            onPlayAgain={playAgain}
            onDashboard={() => navigate('/student/dashboard')}
            onLeaderboard={() => navigate('/student/leaderboard')}
          />
        ) : (
          <Typography>Finishing game...</Typography>
        )}
      </Paper>
    </>
  );
}
