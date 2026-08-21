import { useEffect } from 'react';
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
import { formatGameTypeLabel } from '../../utils/gameTypes';
import { syncCrosswordGameData } from '../../utils/crosswordGrid';
import { firstNonEmptyList } from '../../utils/gameDataLists';
import { stopAmbient, syncAmbientForGame, unlockAudio } from '../../utils/soundEffects';

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
  // true_false_blitz intentionally omitted (deprecated)
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

export default function GamePreview({ gameType, gameData, onComplete, xpReward = 50 }) {
  const Component = COMPONENT_MAP[gameType];
  const prepared = prepareGameData(gameType, gameData);

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
      <Component
        gameData={prepared}
        onComplete={onComplete}
        xpReward={xpReward}
      />
    </Box>
  );
}
