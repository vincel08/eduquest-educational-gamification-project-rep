import {
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

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
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

  const items = game.gameData?.items || [];

  function updateGame(patch) {
    onChange({ ...game, ...patch });
  }

  function updateItems(nextItems) {
    updateGame({
      gameData: {
        ...(game.gameData || {}),
        items: nextItems,
      },
    });
  }

  function updateItem(index, patch) {
    updateItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function moveItem(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    updateItems(next);
    onSelectIndex?.(target);
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
          value={game.gameType || ''}
          onChange={(e) => updateGame({ gameType: e.target.value })}
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
        />
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Game items ({items.length})</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => updateItems([
            ...items,
            {
              id: newId('g'),
              prompt: '',
              answer: '',
              hint: '',
            },
          ])}
        >
          Add item
        </Button>
      </Stack>

      {items.map((item, index) => (
        <Card
          key={item.id || index}
          variant="outlined"
          onClick={() => onSelectIndex?.(index)}
          sx={{
            borderColor: selectedIndex === index ? 'secondary.main' : 'divider',
            borderWidth: selectedIndex === index ? 2 : 1,
          }}
        >
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={800}>Item {index + 1}</Typography>
                <Stack direction="row">
                  <IconButton size="small" onClick={() => moveItem(index, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => moveItem(index, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      updateItems(items.filter((_, i) => i !== index));
                      onSelectIndex?.(Math.max(0, index - 1));
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              <TextField
                label="Question / Prompt"
                fullWidth
                value={item.prompt || item.question || item.term || ''}
                onChange={(e) => updateItem(index, {
                  prompt: e.target.value,
                  question: e.target.value,
                  term: e.target.value,
                })}
              />
              <TextField
                label="Answer"
                fullWidth
                value={item.answer || item.definition || ''}
                onChange={(e) => updateItem(index, {
                  answer: e.target.value,
                  definition: e.target.value,
                })}
              />
              <TextField
                label="Hint"
                fullWidth
                value={item.hint || ''}
                onChange={(e) => updateItem(index, { hint: e.target.value })}
              />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
