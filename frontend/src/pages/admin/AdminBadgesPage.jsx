import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import gamificationService from '../../services/gamificationService';
import { getErrorMessage } from '../../services/api';

const CRITERIA = [
  'xp',
  'quizzes_passed',
  'lessons_completed',
  'manual',
  'streak',
];

const emptyForm = {
  name: '',
  description: '',
  icon: 'emoji_events',
  color: '#FFB300',
  criteriaType: 'manual',
  criteriaValue: 0,
  xpBonus: 0,
  isActive: true,
};

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await gamificationService.badges();
    setBadges(response.data.data || []);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(badge) {
    setEditingId(badge.id);
    setForm({
      name: badge.name,
      description: badge.description || '',
      icon: badge.icon || 'emoji_events',
      color: badge.color || '#FFB300',
      criteriaType: badge.criteria_type,
      criteriaValue: badge.criteria_value || 0,
      xpBonus: badge.xp_bonus || 0,
      isActive: Boolean(badge.is_active),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingId) {
        await gamificationService.updateBadge(editingId, form);
        setMessage('Badge updated.');
      } else {
        await gamificationService.createBadge(form);
        setMessage('Badge created.');
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Badge Management" subtitle="Create and update student and teacher badges." />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Paper sx={{ p: 3, mb: 3 }} component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" gutterBottom>
          {editingId ? 'Edit Badge' : 'Create Badge'}
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Criteria"
              value={form.criteriaType}
              onChange={(e) => setForm((p) => ({ ...p, criteriaType: e.target.value }))}
              sx={{ minWidth: 200 }}
            >
              {CRITERIA.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Criteria Value"
              type="number"
              value={form.criteriaValue}
              onChange={(e) => setForm((p) => ({ ...p, criteriaValue: Number(e.target.value) }))}
            />
            <TextField
              label="XP Bonus"
              type="number"
              value={form.xpBonus}
              onChange={(e) => setForm((p) => ({ ...p, xpBonus: Number(e.target.value) }))}
            />
            <TextField
              label="Color"
              value={form.color}
              onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : (editingId ? 'Update Badge' : 'Create Badge')}
            </Button>
            {editingId ? (
              <Button
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Criteria</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>XP Bonus</TableCell>
              <TableCell>Active</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {badges.map((badge) => (
              <TableRow key={badge.id}>
                <TableCell>{badge.name}</TableCell>
                <TableCell>{badge.criteria_type}</TableCell>
                <TableCell>{badge.criteria_value}</TableCell>
                <TableCell>{badge.xp_bonus}</TableCell>
                <TableCell>{badge.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => startEdit(badge)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
