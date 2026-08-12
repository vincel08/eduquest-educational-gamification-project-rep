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

const dateFieldSx = {
  minWidth: { xs: '100%', sm: 168 },
  flex: { xs: '1 1 100%', sm: '0 0 auto' },
};

/**
 * Sort + date filters for content lists.
 * Date labels must stay shrunk so they do not collide with browser mm/dd/yyyy UI.
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

  function dateFieldProps(label, value, onChange) {
    return {
      size: 'small',
      type: 'date',
      label,
      value: value || '',
      onChange,
      sx: dateFieldSx,
      // MUI v9 uses slotProps; keep InputLabelProps as a safe fallback.
      InputLabelProps: { shrink: true },
      slotProps: {
        inputLabel: { shrink: true },
        htmlInput: {
          'aria-label': label,
        },
      },
    };
  }

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      useFlexGap
      flexWrap="wrap"
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
      sx={{ mb: 2 }}
    >
      <TextField
        select
        size="small"
        label="Sort"
        value={sort}
        onChange={(e) => onSortChange?.(e.target.value)}
        sx={{ minWidth: { xs: '100%', sm: 180 } }}
      >
        <MenuItem value="newest">Newest First</MenuItem>
        <MenuItem value="oldest">Oldest First</MenuItem>
        <MenuItem value="updated">Recently Updated</MenuItem>
      </TextField>

      <TextField
        {...dateFieldProps(
          'Created from',
          filters.createdFrom,
          (e) => patchFilters({ createdFrom: e.target.value })
        )}
      />
      <TextField
        {...dateFieldProps(
          'Created to',
          filters.createdTo,
          (e) => patchFilters({ createdTo: e.target.value })
        )}
      />

      {showUpdatedFilters ? (
        <>
          <TextField
            {...dateFieldProps(
              'Updated from',
              filters.updatedFrom,
              (e) => patchFilters({ updatedFrom: e.target.value })
            )}
          />
          <TextField
            {...dateFieldProps(
              'Updated to',
              filters.updatedTo,
              (e) => patchFilters({ updatedTo: e.target.value })
            )}
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
        sx={{ minWidth: { xs: '100%', sm: 140 } }}
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
        sx={{ minWidth: { xs: '100%', sm: 120 } }}
      >
        {yearOptions().map((y) => (
          <MenuItem key={y.value || 'all'} value={y.value}>{y.label}</MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
