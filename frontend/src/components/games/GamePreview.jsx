import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import Flashcards from './Flashcards';
import MemoryMatch from './MemoryMatch';
import Crossword from './Crossword';
import WordSearch from './WordSearch';
import QuizShow from './QuizShow';
import Jeopardy from './Jeopardy';
import DragDrop from './DragDrop';
import SpinWheel from './SpinWheel';
import Millionaire from './Millionaire';
import EscapeRoom from './EscapeRoom';
import MissionAdventure from './MissionAdventure';
import PuzzleChallenge from './PuzzleChallenge';
import SoundToggle from './SoundToggle';
import SessionTimerBar from './SessionTimerBar';
import { formatGameTypeLabel } from '../../utils/gameTypes';
import { syncCrosswordGameData } from '../../utils/crosswordGrid';
import { firstNonEmptyList } from '../../utils/gameDataLists';
import { playSound, SOUND_KEYS, stopAmbient, syncAmbientForGame, unlockAudio } from '../../utils/soundEffects';
import useSessionCountdown, { resolveTimeLimitMinutes } from '../../hooks/useSessionCountdown';
import { GameSessionProvider } from '../../contexts/GameSessionContext';

const COMPONENT_MAP = {
  flashcards: Flashcards,
  memory_match: MemoryMatch,
  crossword: Crossword,
  word_search: WordSearch,
  quiz_show: QuizShow,
  quiz_rush: QuizShow,
  jeopardy: Jeopardy,
  drag_drop: DragDrop,
  spin_wheel: SpinWheel,
  millionaire: Millionaire,
  escape_room: EscapeRoom,
  mission_adventure: MissionAdventure,
  puzzle_challenge: PuzzleChallenge,
  word_scramble: WordSearch,
};

function prepareGameData(gameType, gameData) {
  if (!gameData || typeof gameData !== 'object') return { items: [] };
  if (gameType === 'crossword') return syncCrosswordGameData(gameData);
  if (gameType === 'puzzle_challenge') {
    const items = firstNonEmptyList(gameData.items, gameData.clues);
    return { ...gameData, items, clues: items };
  }
  if (['flashcards', 'memory_match', 'drag_drop'].includes(gameType)) {
    const pairs = firstNonEmptyList(gameData.items, gameData.pairs);
    return { ...gameData, items: pairs, pairs };
  }
  if (['quiz_show', 'quiz_rush', 'spin_wheel', 'millionaire'].includes(gameType)) {
    const items = firstNonEmptyList(gameData.items, gameData.rounds);
    return { ...gameData, items, rounds: items };
  }
  return gameData;
}

export default function GamePreview({
  gameType,
  gameData,
  onComplete,
  xpReward = 50,
  timeLimitMinutes = null,
}) {
  const Component = COMPONENT_MAP[gameType];
  const prepared = prepareGameData(gameType, gameData);
  const limitMinutes = resolveTimeLimitMinutes(timeLimitMinutes, 10);
  const submitRef = useRef(null);
  const finishedRef = useRef(false);
  const [timedOut, setTimedOut] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const registerSubmit = useCallback((fn) => {
    submitRef.current = fn;
    return () => {
      if (submitRef.current === fn) submitRef.current = null;
    };
  }, []);

  const handleExpire = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setTimedOut(true);
    setSessionDone(true);
    playSound(SOUND_KEYS.timeout);
    const payload = submitRef.current?.() || {
      score: 0,
      answers: { timedOut: true },
    };
    onComplete?.({
      ...payload,
      answers: {
        ...(payload.answers || {}),
        timedOut: true,
      },
    });
  }, [onComplete]);

  const countdown = useSessionCountdown(limitMinutes, {
    enabled: Boolean(Component && gameData) && !sessionDone,
    onExpire: handleExpire,
    fallbackMinutes: 10,
  });

  const wrapComplete = useCallback((payload) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSessionDone(true);
    const next = typeof payload === 'number'
      ? { score: payload, durationSeconds: countdown.elapsedSeconds }
      : {
          ...payload,
          durationSeconds: payload?.durationSeconds ?? countdown.elapsedSeconds,
        };
    onComplete?.(next);
  }, [onComplete, countdown.elapsedSeconds]);

  useEffect(() => {
    finishedRef.current = false;
    setTimedOut(false);
    setSessionDone(false);
  }, [gameType, gameData, limitMinutes]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    syncAmbientForGame(gameType);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      stopAmbient();
    };
  }, [gameType]);

  if (!Component) {
    return (
      <Alert severity="warning">
        Unsupported game type: {formatGameTypeLabel(gameType) || gameType}
        {gameType ? ` (${gameType})` : ''}
      </Alert>
    );
  }

  if (!gameData) {
    return <Typography color="text.secondary">No game data to preview.</Typography>;
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mb: 0.5 }}>
        <SoundToggle gameType={gameType} />
      </Stack>

      <SessionTimerBar
        formatted={countdown.formatted}
        limitFormatted={countdown.limitFormatted}
        progress={countdown.progress}
        isUrgent={countdown.isUrgent || timedOut}
        label={timedOut ? 'Time is up' : 'Time left'}
      />

      <GameSessionProvider
        registerSubmit={registerSubmit}
        timedOut={timedOut}
        elapsedSeconds={countdown.elapsedSeconds}
      >
        <Component
          gameData={prepared}
          onComplete={wrapComplete}
          xpReward={xpReward}
          timeLimitMinutes={limitMinutes}
          sessionTimedOut={timedOut}
        />
      </GameSessionProvider>
    </Box>
  );
}
