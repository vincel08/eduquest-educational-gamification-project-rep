import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import { formatGameTypeLabel } from '../../utils/gameTypes';
import { normalizeAnswer, resolveCrosswordClues, syncCrosswordGameData } from '../../utils/crosswordGrid';

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

function moveInArray(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function ItemToolbar({ label, index, onMove, onDelete }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography fontWeight={800}>{label}</Typography>
      <Stack direction="row">
        <IconButton size="small" onClick={() => onMove(-1)}><ArrowUpwardIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={() => onMove(1)}><ArrowDownwardIcon fontSize="small" /></IconButton>
        <IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton>
      </Stack>
    </Stack>
  );
}

function ChoiceFields({ item, onChange }) {
  const choices = Array.isArray(item.choices) && item.choices.length
    ? item.choices
    : ['', '', '', ''];
  return (
    <Stack spacing={1}>
      {choices.map((choice, choiceIndex) => (
        <TextField
          key={`choice-${choiceIndex}`}
          label={`Choice ${choiceIndex + 1}`}
          fullWidth
          value={choice}
          onChange={(e) => {
            const next = [...choices];
            next[choiceIndex] = e.target.value;
            onChange({ choices: next });
          }}
        />
      ))}
      <TextField
        select
        label="Correct choice"
        value={Number.isInteger(Number(item.correctIndex)) ? Number(item.correctIndex) : 0}
        onChange={(e) => onChange({ correctIndex: Number(e.target.value) })}
      >
        {choices.map((_, choiceIndex) => (
          <MenuItem key={`correct-${choiceIndex}`} value={choiceIndex}>
            Choice {choiceIndex + 1}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

export default function GameEditor({
  game,
  onChange,
  selectedIndex,
  onSelectIndex,
}) {
  if (!game) {
    return (
      <Typography color="text.secondary">
        No educational game in this draft yet. Use AI actions to generate one.
      </Typography>
    );
  }

  const gameType = game.gameType || 'flashcards';
  const gameData = game.gameData || {};

  function updateGame(patch) {
    // gameType is intentionally immutable in the editor to preserve type integrity.
    const { gameType: _ignored, ...safePatch } = patch;
    onChange({ ...game, ...safePatch, gameType });
  }

  function updateGameData(patch) {
    const next = {
      ...gameData,
      ...patch,
    };
    if (
      ['crossword', 'puzzle_challenge'].includes(gameType)
      && Array.isArray(patch.items)
    ) {
      next.clues = patch.items;
    }
    if (
      ['crossword', 'puzzle_challenge'].includes(gameType)
      && Array.isArray(patch.clues)
      && !Array.isArray(patch.items)
    ) {
      next.items = patch.clues;
    }
    if (
      ['flashcards', 'memory_match', 'drag_drop'].includes(gameType)
      && Array.isArray(patch.items)
    ) {
      next.pairs = patch.items;
    }
    if (
      ['flashcards', 'memory_match', 'drag_drop'].includes(gameType)
      && Array.isArray(patch.pairs)
    ) {
      next.items = patch.pairs;
    }
    if (
      ['quiz_show', 'quiz_rush', 'spin_wheel', 'millionaire'].includes(gameType)
      && Array.isArray(patch.items)
    ) {
      next.rounds = patch.items;
    }
    if (
      ['quiz_show', 'quiz_rush', 'spin_wheel', 'millionaire'].includes(gameType)
      && Array.isArray(patch.rounds)
      && !Array.isArray(patch.items)
    ) {
      next.items = patch.rounds;
    }
    if (
      ['word_search', 'word_scramble'].includes(gameType)
      && Array.isArray(patch.words)
    ) {
      next.items = patch.words.map((word, index) => ({
        id: `w_${index}`,
        term: typeof word === 'string' ? word : (word?.word || word?.term || ''),
        answer: typeof word === 'string' ? word : (word?.word || word?.term || ''),
        word: typeof word === 'string' ? word : (word?.word || word?.term || ''),
      }));
      next.grid = undefined;
      next.placements = undefined;
    }
    updateGame({
      gameData: next,
    });
  }

  function renderPairEditor(listKey = 'items') {
    const list = Array.isArray(gameData[listKey]) ? gameData[listKey] : [];
    return (
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {gameType === 'memory_match' ? 'Pairs' : 'Terms'} ({list.length})
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => updateGameData({
              [listKey]: [...list, { id: newId('g'), term: '', definition: '' }],
            })}
          >
            Add pair
          </Button>
        </Stack>
        {list.map((item, index) => (
          <Card key={item.id || index} variant="outlined" sx={{ borderColor: selectedIndex === index ? 'secondary.main' : 'divider' }}>
            <CardContent>
              <Stack spacing={1.5}>
                <ItemToolbar
                  label={`Pair ${index + 1}`}
                  index={index}
                  onMove={(dir) => {
                    updateGameData({ [listKey]: moveInArray(list, index, dir) });
                    onSelectIndex?.(index + dir);
                  }}
                  onDelete={() => {
                    updateGameData({ [listKey]: list.filter((_, i) => i !== index) });
                    onSelectIndex?.(Math.max(0, index - 1));
                  }}
                />
                <TextField
                  label="Term"
                  fullWidth
                  value={item.term || item.front || ''}
                  onChange={(e) => {
                    const next = [...list];
                    next[index] = { ...item, term: e.target.value, front: e.target.value };
                    updateGameData({ [listKey]: next });
                  }}
                />
                <TextField
                  label="Definition / Match"
                  fullWidth
                  value={item.definition || item.back || ''}
                  onChange={(e) => {
                    const next = [...list];
                    next[index] = { ...item, definition: e.target.value, back: e.target.value };
                    updateGameData({ [listKey]: next });
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  function renderChoiceItems(listKey = 'items', labels = {}) {
    const list = Array.isArray(gameData[listKey]) ? gameData[listKey] : [];
    return (
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{labels.title || 'Questions'} ({list.length})</Typography>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => updateGameData({
              [listKey]: [...list, {
                id: newId('g'),
                question: '',
                prompt: '',
                label: '',
                choices: ['', '', '', ''],
                correctIndex: 0,
                difficulty: 'medium',
              }],
            })}
          >
            Add
          </Button>
        </Stack>
        {list.map((item, index) => (
          <Card key={item.id || index} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <ItemToolbar
                  label={`${labels.item || 'Item'} ${index + 1}`}
                  index={index}
                  onMove={(dir) => updateGameData({ [listKey]: moveInArray(list, index, dir) })}
                  onDelete={() => updateGameData({ [listKey]: list.filter((_, i) => i !== index) })}
                />
                {gameType === 'spin_wheel' ? (
                  <TextField
                    label="Wheel label"
                    fullWidth
                    value={item.label || ''}
                    onChange={(e) => {
                      const next = [...list];
                      next[index] = { ...item, label: e.target.value };
                      updateGameData({ [listKey]: next });
                    }}
                  />
                ) : null}
                <TextField
                  label={labels.prompt || 'Question'}
                  fullWidth
                  value={item.question || item.prompt || ''}
                  onChange={(e) => {
                    const next = [...list];
                    next[index] = { ...item, question: e.target.value, prompt: e.target.value };
                    updateGameData({ [listKey]: next });
                  }}
                />
                <ChoiceFields
                  item={item}
                  onChange={(patch) => {
                    const next = [...list];
                    next[index] = { ...item, ...patch };
                    updateGameData({ [listKey]: next });
                  }}
                />
                {gameType === 'millionaire' ? (
                  <TextField
                    select
                    label="Difficulty"
                    value={item.difficulty || 'medium'}
                    onChange={(e) => {
                      const next = [...list];
                      next[index] = { ...item, difficulty: e.target.value };
                      updateGameData({ [listKey]: next });
                    }}
                  >
                    <MenuItem value="easy">Easy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="hard">Hard</MenuItem>
                  </TextField>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  function renderTypeEditor() {
    switch (gameType) {
      case 'flashcards':
      case 'drag_drop':
        return renderPairEditor('items');
      case 'memory_match':
        return renderPairEditor(
          Array.isArray(gameData.pairs) && gameData.pairs.length ? 'pairs' : 'items'
        );
      case 'quiz_show':
      case 'quiz_rush':
        return renderChoiceItems(Array.isArray(gameData.rounds) && gameData.rounds.length ? 'rounds' : 'items');
      case 'spin_wheel':
      case 'millionaire':
        return renderChoiceItems('items', { title: gameType === 'spin_wheel' ? 'Wheel items' : 'Ladder questions' });
      case 'mission_adventure':
        return renderChoiceItems('missions', { title: 'Missions', item: 'Mission', prompt: 'Scenario prompt' });
      case 'escape_room': {
        const stages = Array.isArray(gameData.stages) ? gameData.stages : [];
        return (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Stages ({stages.length})</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={() => updateGameData({
                  stages: [...stages, { id: newId('s'), name: `Stage ${stages.length + 1}`, clue: '', answer: '', hint: '' }],
                })}
              >
                Add stage
              </Button>
            </Stack>
            {stages.map((stage, index) => (
              <Card key={stage.id || index} variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <ItemToolbar
                      label={`Stage ${index + 1}`}
                      index={index}
                      onMove={(dir) => updateGameData({ stages: moveInArray(stages, index, dir) })}
                      onDelete={() => updateGameData({ stages: stages.filter((_, i) => i !== index) })}
                    />
                    <TextField label="Name" fullWidth value={stage.name || ''} onChange={(e) => {
                      const next = [...stages];
                      next[index] = { ...stage, name: e.target.value };
                      updateGameData({ stages: next });
                    }} />
                    <TextField label="Clue" fullWidth value={stage.clue || ''} onChange={(e) => {
                      const next = [...stages];
                      next[index] = { ...stage, clue: e.target.value };
                      updateGameData({ stages: next });
                    }} />
                    <TextField label="Answer" fullWidth value={stage.answer || ''} onChange={(e) => {
                      const next = [...stages];
                      next[index] = { ...stage, answer: e.target.value };
                      updateGameData({ stages: next });
                    }} />
                    <TextField label="Hint" fullWidth value={stage.hint || ''} onChange={(e) => {
                      const next = [...stages];
                      next[index] = { ...stage, hint: e.target.value };
                      updateGameData({ stages: next });
                    }} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        );
      }
      case 'jeopardy': {
        const categories = Array.isArray(gameData.categories) ? gameData.categories : [];
        return (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Categories ({categories.length})</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={() => updateGameData({
                  categories: [...categories, {
                    name: `Category ${categories.length + 1}`,
                    clues: [{ points: 100, clue: '', answer: '' }],
                  }],
                })}
              >
                Add category
              </Button>
            </Stack>
            {categories.map((category, categoryIndex) => (
              <Card key={`cat-${categoryIndex}`} variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <ItemToolbar
                      label={`Category ${categoryIndex + 1}`}
                      index={categoryIndex}
                      onMove={(dir) => updateGameData({ categories: moveInArray(categories, categoryIndex, dir) })}
                      onDelete={() => updateGameData({ categories: categories.filter((_, i) => i !== categoryIndex) })}
                    />
                    <TextField
                      label="Category name"
                      fullWidth
                      value={category.name || ''}
                      onChange={(e) => {
                        const next = [...categories];
                        next[categoryIndex] = { ...category, name: e.target.value };
                        updateGameData({ categories: next });
                      }}
                    />
                    {(category.clues || []).map((clue, clueIndex) => (
                      <Stack key={`clue-${clueIndex}`} spacing={1} sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography fontWeight={700}>Clue {clueIndex + 1}</Typography>
                        <TextField
                          label="Points"
                          type="number"
                          value={clue.points || 100}
                          onChange={(e) => {
                            const next = [...categories];
                            const clues = [...(category.clues || [])];
                            clues[clueIndex] = { ...clue, points: Number(e.target.value) || 100 };
                            next[categoryIndex] = { ...category, clues };
                            updateGameData({ categories: next });
                          }}
                        />
                        <TextField
                          label="Clue"
                          fullWidth
                          value={clue.clue || ''}
                          onChange={(e) => {
                            const next = [...categories];
                            const clues = [...(category.clues || [])];
                            clues[clueIndex] = { ...clue, clue: e.target.value };
                            next[categoryIndex] = { ...category, clues };
                            updateGameData({ categories: next });
                          }}
                        />
                        <TextField
                          label="Answer"
                          fullWidth
                          value={clue.answer || ''}
                          onChange={(e) => {
                            const next = [...categories];
                            const clues = [...(category.clues || [])];
                            clues[clueIndex] = { ...clue, answer: e.target.value };
                            next[categoryIndex] = { ...category, clues };
                            updateGameData({ categories: next });
                          }}
                        />
                      </Stack>
                    ))}
                    <Button
                      size="small"
                      onClick={() => {
                        const next = [...categories];
                        next[categoryIndex] = {
                          ...category,
                          clues: [...(category.clues || []), { points: ((category.clues || []).length + 1) * 100, clue: '', answer: '' }],
                        };
                        updateGameData({ categories: next });
                      }}
                    >
                      Add clue
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        );
      }
      case 'word_search':
      case 'word_scramble': {
        const words = Array.isArray(gameData.words) ? gameData.words : [];
        return (
          <Stack spacing={2}>
            <Typography variant="h6">Words ({words.length})</Typography>
            <TextField
              label="Words (comma-separated)"
              fullWidth
              multiline
              minRows={3}
              value={words.map((word) => (typeof word === 'string' ? word : word?.word)).filter(Boolean).join(', ')}
              helperText="Saving regenerates an authoritative grid from these words."
              onChange={(e) => {
                const nextWords = e.target.value
                  .split(',')
                  .map((word) => word.trim().toUpperCase())
                  .filter(Boolean);
                updateGameData({
                  words: nextWords,
                  grid: undefined,
                  placements: undefined,
                  gridSize: gameData.gridSize || 10,
                });
              }}
            />
            <TextField
              label="Grid size"
              type="number"
              value={gameData.gridSize || 10}
              onChange={(e) => updateGameData({
                gridSize: Number(e.target.value) || 10,
                grid: undefined,
                placements: undefined,
              })}
            />
          </Stack>
        );
      }
      case 'crossword':
      case 'puzzle_challenge': {
        const items = gameType === 'crossword'
          ? resolveCrosswordClues(gameData)
          : (() => {
          const list = Array.isArray(gameData.items) ? gameData.items : [];
          const clues = Array.isArray(gameData.clues) ? gameData.clues : [];
          if (list.some((item) => String(item?.answer || '').trim())) return list;
          if (clues.length) return clues;
          return list;
        })();

        function commitClueItems(nextItems) {
          if (gameType === 'crossword') {
            const synced = syncCrosswordGameData({ items: nextItems, clues: nextItems });
            updateGameData({ items: synced.items, clues: synced.clues });
            return;
          }
          updateGameData({ items: nextItems, clues: nextItems });
        }

        return (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{gameType === 'crossword' ? 'Clues' : 'Puzzles'} ({items.length})</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={() => commitClueItems([...items, {
                  id: newId('g'),
                  clue: '',
                  prompt: '',
                  answer: '',
                  hint: '',
                  direction: 'across',
                }])}
              >
                Add
              </Button>
            </Stack>
            {items.map((item, index) => {
              const playAnswer = normalizeAnswer(item.answer || item.word);
              return (
              <Card key={item.id || index} variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <ItemToolbar
                      label={`${gameType === 'crossword' ? 'Clue' : 'Puzzle'} ${index + 1}`}
                      index={index}
                      onMove={(dir) => commitClueItems(moveInArray(items, index, dir))}
                      onDelete={() => commitClueItems(items.filter((_, i) => i !== index))}
                    />
                    <TextField
                      label={gameType === 'crossword' ? 'Clue' : 'Prompt'}
                      fullWidth
                      value={item.clue || item.prompt || ''}
                      onChange={(e) => {
                        const next = [...items];
                        next[index] = { ...item, clue: e.target.value, prompt: e.target.value };
                        commitClueItems(next);
                      }}
                    />
                    <TextField
                      label="Answer"
                      fullWidth
                      value={item.answer || item.word || ''}
                      helperText={
                        gameType === 'crossword'
                          ? (playAnswer
                            ? `Play uses ${playAnswer.length} boxes: ${playAnswer.split('').join(' ')}`
                            : 'Type the answer students must fit in the grid')
                          : undefined
                      }
                      onChange={(e) => {
                        const next = [...items];
                        const answer = e.target.value;
                        next[index] = {
                          ...item,
                          answer,
                          word: answer,
                          row: undefined,
                          col: undefined,
                        };
                        commitClueItems(next);
                      }}
                    />
                    {gameType === 'crossword' && playAnswer ? (
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                        {playAnswer.split('').map((letter, letterIndex) => (
                          <Box
                            key={`${item.id || index}-${letterIndex}`}
                            sx={{
                              width: 28,
                              height: 28,
                              border: '1px solid',
                              borderColor: 'divider',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 800,
                              fontSize: 13,
                              bgcolor: 'background.paper',
                            }}
                          >
                            {letter}
                          </Box>
                        ))}
                      </Stack>
                    ) : null}
                    {gameType === 'crossword' ? (
                      <TextField
                        select
                        label="Direction"
                        value={item.direction || 'across'}
                        helperText="Preferred direction for this clue. Clue numbers stay matched to Edit Content."
                        onChange={(e) => {
                          const next = [...items];
                          next[index] = {
                            ...item,
                            direction: e.target.value,
                            row: undefined,
                            col: undefined,
                          };
                          commitClueItems(next);
                        }}
                        sx={{ maxWidth: 280 }}
                      >
                        <MenuItem value="across">Across</MenuItem>
                        <MenuItem value="down">Down</MenuItem>
                      </TextField>
                    ) : (
                      <TextField
                        label="Hint"
                        fullWidth
                        value={item.hint || ''}
                        onChange={(e) => {
                          const next = [...items];
                          next[index] = { ...item, hint: e.target.value };
                          commitClueItems(next);
                        }}
                      />
                    )}
                  </Stack>
                </CardContent>
              </Card>
              );
            })}
          </Stack>
        );
      }
      default:
        return (
          <Typography color="text.secondary">
            No type-specific editor is available for this game type.
          </Typography>
        );
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Game title"
          fullWidth
          value={game.title || ''}
          onChange={(e) => updateGame({ title: e.target.value })}
        />
        <TextField
          select
          label="Difficulty"
          value={game.difficulty || 'medium'}
          onChange={(e) => updateGame({ difficulty: e.target.value })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="easy">Easy</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="hard">Hard</MenuItem>
        </TextField>
      </Stack>

      <TextField
        label="Instructions"
        fullWidth
        multiline
        minRows={2}
        value={game.instructions || game.description || ''}
        onChange={(e) => updateGame({ instructions: e.target.value, description: e.target.value })}
      />

      <Stack direction="row" spacing={2}>
        <TextField
          label="Game type"
          value={formatGameTypeLabel(gameType)}
          InputProps={{ readOnly: true }}
          helperText="Locked to preserve scoring and renderer compatibility"
        />
        <TextField
          label="Estimated time (min)"
          type="number"
          value={game.estimatedTime || 10}
          onChange={(e) => updateGame({ estimatedTime: Number(e.target.value) })}
        />
        <TextField
          label="XP reward"
          type="number"
          value={game.xpReward || 100}
          onChange={(e) => updateGame({ xpReward: Number(e.target.value) })}
          helperText="Student progress XP. Class Scores grade is a separate %."
          inputProps={{ min: 0 }}
        />
      </Stack>

      {renderTypeEditor()}
    </Stack>
  );
}
