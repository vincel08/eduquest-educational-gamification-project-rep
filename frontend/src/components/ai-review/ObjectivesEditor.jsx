import {
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';

function newId() {
  return `obj_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

export default function ObjectivesEditor({ objectives, onChange }) {
  const list = Array.isArray(objectives) ? objectives : [];

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  if (!list.length) {
    return (
      <Stack spacing={2}>
        <Typography color="text.secondary">No learning objectives yet.</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => onChange([{ id: newId(), text: '' }])}
        >
          Add objective
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Learning Objectives</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => onChange([...list, { id: newId(), text: '' }])}
        >
          Add objective
        </Button>
      </Stack>
      {list.map((item, index) => (
        <Stack key={item.id || index} direction="row" spacing={1} alignItems="flex-start">
          <TextField
            fullWidth
            label={`Objective ${index + 1}`}
            value={item.text || ''}
            onChange={(e) => onChange(list.map((obj, i) => (
              i === index ? { ...obj, text: e.target.value } : obj
            )))}
          />
          <IconButton onClick={() => move(index, -1)}><ArrowUpwardIcon /></IconButton>
          <IconButton onClick={() => move(index, 1)}><ArrowDownwardIcon /></IconButton>
          <IconButton color="error" onClick={() => onChange(list.filter((_, i) => i !== index))}>
            <DeleteIcon />
          </IconButton>
        </Stack>
      ))}
    </Stack>
  );
}
