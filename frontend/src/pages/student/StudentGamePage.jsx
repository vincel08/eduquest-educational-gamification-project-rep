import { useEffect, useState } from "react";
import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import GamePreview from "../../components/games/GamePreview";
import FinalScore from "../../components/games/FinalScore";
import gameService from "../../services/gameService";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { pickMotivationalMessage } from "../../utils/feedbackMessages";
import { playSound, SOUND_KEYS } from "../../utils/soundEffects";
import { useAuth } from "../../contexts/AuthContext";
import { useRewards } from "../../contexts/RewardsContext";
import { formatGameTypeLabel } from "../../utils/gameTypes";

export default function StudentGamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const { notifyReward } = useRewards();
  const [game, setGame] = useState(null);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState(0);
  const [motivation, setMotivation] = useState("");
  const [nextGame, setNextGame] = useState(null);
  const [releasingGrade, setReleasingGrade] = useState(false);
  const [attemptMeta, setAttemptMeta] = useState({
    attemptsUsed: 0,
    attemptsRemaining: 3,
    maxAttempts: 3,
    outOfAttempts: false,
    gradeReleased: false,
    unavailable: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const response = await gameService.getById(gameId);
        const data = response.data.data;
        setGame(data);
        setAttemptMeta({
          attemptsUsed: data.attemptsUsed ?? 0,
          attemptsRemaining: data.attemptsRemaining ?? 3,
          maxAttempts: data.maxAttempts ?? data.maxGameAttempts ?? 3,
          outOfAttempts: Boolean(data.outOfAttempts),
          gradeReleased: Boolean(data.gradeReleased),
          unavailable: Boolean(
            data.unavailable || data.outOfAttempts || data.gradeReleased,
          ),
        });
        try {
          const enrolledRes = await courseService.myCourses();
          const courses = enrolledRes.data.data || [];
          const groups = await Promise.all(
            courses.map(async (course) => {
              const gamesRes = await courseService.games(course.id);
              return gamesRes.data.data || [];
            }),
          );
          const allGames = groups
            .flat()
            .filter(
              (item) =>
                !item.locked &&
                !item.outOfAttempts &&
                !item.gradeReleased &&
                !item.unavailable,
            );
          const currentIndex = allGames.findIndex(
            (item) => Number(item.id) === Number(gameId),
          );
          const recommended =
            currentIndex >= 0
              ? allGames[currentIndex + 1] ||
                allGames.find((item) => Number(item.id) !== Number(gameId))
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

    const clientScore =
      typeof resultPayload === "number"
        ? resultPayload
        : Number(resultPayload?.score) || 0;
    const answers =
      typeof resultPayload === "number" ? null : resultPayload?.answers;

    try {
      const response = await gameService.submitScore(gameId, {
        score: clientScore,
        answers,
        durationSeconds: resultPayload?.durationSeconds ?? 60,
      });
      const payload = response.data.data;
      if (payload.xpAward?.profile) {
        updateProfile(payload.xpAward.profile);
      }
      const serverScore =
        payload.serverScore ?? payload.score?.score ?? clientScore;
      const xpEarned = payload.score?.xp_earned || 0;
      const nextAttempts = {
        attemptsUsed: payload.attemptsUsed ?? attemptMeta.attemptsUsed + 1,
        attemptsRemaining:
          payload.attemptsRemaining ??
          Math.max(0, attemptMeta.attemptsRemaining - 1),
        maxAttempts: payload.maxAttempts ?? attemptMeta.maxAttempts,
        outOfAttempts: Boolean(
          payload.outOfAttempts ??
            (payload.attemptsRemaining ?? attemptMeta.attemptsRemaining - 1) <=
              0,
        ),
        gradeReleased: Boolean(payload.releasedToGradebook),
        unavailable: Boolean(
          payload.releasedToGradebook ||
            payload.outOfAttempts ||
            (payload.attemptsRemaining ?? attemptMeta.attemptsRemaining - 1) <=
              0,
        ),
      };
      setAttemptMeta(nextAttempts);
      const passed = serverScore >= 70;
      setMotivation(
        passed
          ? pickMotivationalMessage()
          : "Keep practicing — no XP below 70%.",
      );
      playSound(SOUND_KEYS.gameComplete);
      notifyReward({
        xpEarned: passed ? xpEarned : 0,
        badges: payload.xpAward?.newlyUnlocked?.badges || [],
        medals: payload.xpAward?.newlyUnlocked?.medals || [],
        celebrateWin: passed,
      });
      setResult({
        score: serverScore,
        percentage: Math.max(0, Math.min(100, Number(serverScore) || 0)),
        xpEarned: passed ? xpEarned : 0,
        badges: payload.xpAward?.newlyUnlocked?.badges || [],
        medals: payload.xpAward?.newlyUnlocked?.medals || [],
        motivation: passed
          ? pickMotivationalMessage()
          : "Keep practicing — no XP below 70%.",
        passed,
        releasedToGradebook: Boolean(payload.releasedToGradebook),
      });
    } catch (err) {
      setFinished(false);
      setError(getErrorMessage(err));
    }
  }

  function playAgain() {
    if (
      attemptMeta.unavailable ||
      attemptMeta.gradeReleased ||
      attemptMeta.outOfAttempts ||
      attemptMeta.attemptsRemaining <= 0 ||
      result?.releasedToGradebook
    ) {
      return;
    }
    setFinished(false);
    setResult(null);
    setError("");
    setSessionKey((prev) => prev + 1);
  }

  async function handleKeepScore() {
    setReleasingGrade(true);
    setError("");
    try {
      if (!result?.releasedToGradebook) {
        await gameService.releaseGrade(gameId);
        setResult((prev) =>
          prev ? { ...prev, releasedToGradebook: true } : prev,
        );
        setAttemptMeta((prev) => ({
          ...prev,
          gradeReleased: true,
          unavailable: true,
        }));
      }
      navigate("/student/games");
    } catch (err) {
      setError(getErrorMessage(err));
      setReleasingGrade(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error && !game) {
    return (
      <Stack spacing={2}>
        <PageHeader
          title="Game locked"
          subtitle="Finish the lesson work first."
        />
        <Alert severity="warning">{error}</Alert>
        <Button component={RouterLink} to="/student/courses" variant="contained">
          Back to subjects
        </Button>
      </Stack>
    );
  }

  const blocked = Boolean(
    attemptMeta.unavailable ||
      attemptMeta.outOfAttempts ||
      attemptMeta.gradeReleased,
  );

  return (
    <>
      <PageHeader title={game.title} subtitle={game.description} />
      <ContentTimestamp
        item={game}
        variant="date"
        showUpdated={false}
        sx={{ mb: 2, mt: 0 }}
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 3 }}>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
        >
          <Chip
            size="small"
            label={`Type: ${formatGameTypeLabel(game.game_type)}`}
          />
          <Chip size="small" label={`XP reward: ${game.xp_reward}`} />
          <Chip
            size="small"
            color={blocked ? "warning" : "default"}
            label={`Attempts ${attemptMeta.attemptsUsed}/${attemptMeta.maxAttempts}`}
          />
          {blocked ? (
            <Chip
              size="small"
              color={attemptMeta.gradeReleased ? "success" : "warning"}
              label={
                attemptMeta.gradeReleased ? "Submitted" : "No attempts left"
              }
            />
          ) : null}
        </Stack>

        {blocked && !finished ? (
          <Stack spacing={2}>
            <Alert
              severity={attemptMeta.gradeReleased ? "success" : "warning"}
            >
              {attemptMeta.gradeReleased
                ? "You already submitted this game grade. It is no longer available."
                : `You have used all ${attemptMeta.maxAttempts} attempts for this game.`}
            </Alert>
            <Button
              component={RouterLink}
              to="/student/games"
              variant="contained"
            >
              Browse games
            </Button>
          </Stack>
        ) : !finished ? (
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
            badges={result.badges}
            medals={result.medals}
            motivation={motivation || result.motivation}
            passed={result.passed}
            releasedToGradebook={Boolean(result.releasedToGradebook)}
            releasingGrade={releasingGrade}
            nextGame={
              nextGame && !nextGame.outOfAttempts ? nextGame : null
            }
            onNextGame={
              nextGame && !nextGame.outOfAttempts
                ? () => navigate(`/student/games/${nextGame.id}`)
                : undefined
            }
            onPlayAgain={
              !result.releasedToGradebook &&
              attemptMeta.attemptsRemaining > 0 &&
              !attemptMeta.gradeReleased
                ? playAgain
                : undefined
            }
            attemptsRemaining={attemptMeta.attemptsRemaining}
            maxAttempts={attemptMeta.maxAttempts}
            onDashboard={() => navigate("/student/dashboard")}
            onLeaderboard={() => navigate("/student/leaderboard")}
            onContinue={handleKeepScore}
          />
        ) : (
          <Typography>Finishing game...</Typography>
        )}
      </Paper>
    </>
  );
}
