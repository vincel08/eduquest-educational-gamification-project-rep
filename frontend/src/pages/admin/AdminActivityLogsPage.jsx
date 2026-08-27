import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Chip,
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
import ResponsiveTableContainer from '../../components/common/ResponsiveTableContainer';
import activityLogService from '../../services/activityLogService';
import { getErrorMessage } from '../../services/api';
import { useAdminFilters } from '../../contexts/AdminFiltersContext';

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function actionColor(action) {
  if (String(action).startsWith('platform.')) return 'info';
  if (String(action).includes('deleted')) return 'error';
  if (String(action).includes('created') || String(action).includes('awarded')) {
    return 'success';
  }
  return 'default';
}

function actionLabel(action, actions) {
  const match = (actions || []).find((item) => item.value === action);
  return match?.label || String(action || '').replace(/\./g, ' ');
}

export default function AdminActivityLogsPage() {
  const {
    toQueryParams,
    schoolYear,
    gradeLevel,
    section,
  } = useAdminFilters();
  const filterParams = useMemo(() => toQueryParams(), [toQueryParams]);
  const [items, setItems] = useState([]);
  const [actions, setActions] = useState([{ value: 'all', label: 'All activity' }]);
  const [action, setAction] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    activityLogService
      .list({
        action,
        search: search || undefined,
        limit: 50,
        page: 1,
        ...filterParams,
      })
      .then((response) => {
        if (!active) return;
        const data = response.data.data || {};
        setItems(data.items || []);
        setTotal(Number(data.total) || 0);
        if (Array.isArray(data.actions) && data.actions.length) {
          setActions(data.actions);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, 'Unable to load activity logs'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [action, search, filterParams, schoolYear, gradeLevel, section]);

  const subtitle = useMemo(() => {
    const scope = action === 'all' ? 'all activity' : actionLabel(action, actions);
    const syLabel = schoolYear === 'all' ? 'all school years' : `SY ${schoolYear}`;
    const gradeLabel = gradeLevel === 'all' ? 'all grades' : gradeLevel;
    const sectionLabel = section === 'all' ? 'all sections' : `Section ${section}`;
    return `Audit + platform events · ${syLabel} · ${gradeLabel} · ${sectionLabel} · ${scope} · showing ${items.length}`;
  }, [action, actions, items.length, schoolYear, gradeLevel, section]);

  if (loading && !items.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Activity Logs"
        subtitle={subtitle}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          label="Search"
          placeholder="Actor, summary, username…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          fullWidth
        />
        <TextField
          select
          size="small"
          label="Type"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          sx={{ width: { xs: '100%', sm: 240 }, minWidth: { sm: 220 } }}
        >
          {actions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
        {!items.length ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            No activity yet. Admin actions and student XP / quiz / game events will appear here.
          </Typography>
        ) : (
          <ResponsiveTableContainer>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Actor</TableCell>
                  <TableCell>Summary</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatWhen(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={actionLabel(item.action, actions)}
                        color={actionColor(item.action)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700} fontSize="0.9rem">
                        {item.actorName || 'System'}
                      </Typography>
                      {item.actorRole ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textTransform: 'capitalize' }}
                        >
                          {item.actorRole}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 420 }}>
                      <Typography variant="body2">{item.summary}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={item.source === 'audit' ? 'Audit' : 'Platform'}
                        color={item.source === 'audit' ? 'secondary' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        )}
      </Paper>
    </>
  );
}
