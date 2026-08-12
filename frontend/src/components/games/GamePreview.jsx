import { Alert, Box, Typography } from '@mui/material';
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

export default function GamePreview({ gameType, gameData, onComplete, xpReward = 50 }) {
  const Component = COMPONENT_MAP[gameType];

  if (!Component) {
    return <Alert severity="warning">Unsupported game type: {gameType}</Alert>;
  }

  if (!gameData) {
    return <Typography color="text.secondary">No game data to preview.</Typography>;
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Component
        gameData={gameData}
        onComplete={onComplete}
        xpReward={xpReward}
      />
    </Box>
  );
}
