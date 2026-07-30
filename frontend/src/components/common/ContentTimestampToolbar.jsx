import { MenuItem, Stack, TextField } from '@mui/material';

const MONTHS = [
  { value: '', label: 'All months' },
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
];

function yearOptions() {
  const current = new Date().getFullYear();
  const years = [{ value: '', label: 'All years' }];
  for (let y = current; y >= current - 5; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

/**
 * Sort + date filters for content lists.
 */
export default function ContentTimestampToolbar({
  sort = 'newest',
  onSortChange,
  filters = {},
  onFiltersChange,
  showUpdatedFilters = true,
}) {
  function patchFilters(partial) {
    onFiltersChange?.({ ...filters, ...partial });
  }

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      useFlexGap
      flexWrap="wrap"
      sx={{ mb: 2 }}
    >
      <TextField
        select
        size="small"
        label="Sort"
        value={sort}
        onChange={(e) => onSortChange?.(e.target.value)}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="newest">Newest First</MenuItem>
        <MenuItem value="oldest">Oldest First</MenuItem>
        <MenuItem value="updated">Recently Updated</MenuItem>
      </TextField>

      <TextField
        size="small"
        type="date"
        label="Created from"
        InputLabelProps={{ shrink: true }}
        value={filters.createdFrom || ''}
        onChange={(e) => patchFilters({ createdFrom: e.target.value })}
      />
      <TextField
        size="small"
        type="date"
        label="Created to"
        InputLabelProps={{ shrink: true }}
        value={filters.createdTo || ''}
        onChange={(e) => patchFilters({ createdTo: e.target.value })}
      />

      {showUpdatedFilters ? (
        <>
          <TextField
            size="small"
            type="date"
            label="Updated from"
            InputLabelProps={{ shrink: true }}
            value={filters.updatedFrom || ''}
            onChange={(e) => patchFilters({ updatedFrom: e.target.value })}
          />
          <TextField
            size="small"
            type="date"
            label="Updated to"
            InputLabelProps={{ shrink: true }}
            value={filters.updatedTo || ''}
            onChange={(e) => patchFilters({ updatedTo: e.target.value })}
          />
        </>
      ) : null}

      <TextField
        select
        size="small"
        label="Month"
        value={filters.month === 0 || filters.month ? filters.month : ''}
        onChange={(e) => patchFilters({
          month: e.target.value === '' ? '' : Number(e.target.value),
        })}
        sx={{ minWidth: 140 }}
      >
        {MONTHS.map((m) => (
          <MenuItem key={String(m.value)} value={m.value}>{m.label}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Year"
        value={filters.year || ''}
        onChange={(e) => patchFilters({ year: e.target.value })}
        sx={{ minWidth: 120 }}
      >
        {yearOptions().map((y) => (
          <MenuItem key={y.value || 'all'} value={y.value}>{y.label}</MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
