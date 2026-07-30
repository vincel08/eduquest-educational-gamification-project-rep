import {
  Button,
  Card,
  CardContent,
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
  return `sec_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

export default function SummaryEditor({ summary, onChange }) {
  if (!summary) {
    return (
      <Stack spacing={2}>
        <Typography color="text.secondary">No lesson summary yet.</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => onChange({
            title: 'Lesson Summary',
            sections: [{ id: newId(), heading: 'Overview', body: '' }],
          })}
        >
          Start summary
        </Button>
      </Stack>
    );
  }

  const sections = summary.sections || [];

  function updateSections(next) {
    onChange({ ...summary, sections: next });
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    updateSections(next);
  }

  return (
    <Stack spacing={2}>
      <TextField
        label="Summary title"
        fullWidth
        value={summary.title || ''}
        onChange={(e) => onChange({ ...summary, title: e.target.value })}
      />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Sections</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => updateSections([
            ...sections,
            { id: newId(), heading: `Section ${sections.length + 1}`, body: '' },
          ])}
        >
          Add section
        </Button>
      </Stack>
      {sections.map((section, index) => (
        <Card key={section.id || index} variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={800}>Section {index + 1}</Typography>
                <Stack direction="row">
                  <IconButton size="small" onClick={() => move(index, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => move(index, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => updateSections(sections.filter((_, i) => i !== index))}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              <TextField
                label="Heading"
                fullWidth
                value={section.heading || ''}
                onChange={(e) => updateSections(sections.map((sec, i) => (
                  i === index ? { ...sec, heading: e.target.value } : sec
                )))}
              />
              <TextField
                label="Paragraph / content"
                fullWidth
                multiline
                minRows={3}
                value={section.body || ''}
                onChange={(e) => updateSections(sections.map((sec, i) => (
                  i === index ? { ...sec, body: e.target.value } : sec
                )))}
              />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
