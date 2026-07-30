import { Stack, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import UpdateIcon from '@mui/icons-material/Update';
import {
  formatContentDate,
  formatContentDateTime,
  getTimestampValue,
} from '../../utils/contentTimestamps';

/**
 * Displays Created / Last Updated timestamps with a clock icon.
 * variant: 'full' (teacher/admin with time) | 'date' (student date-only)
 */
export default function ContentTimestamp({
  item,
  createdAt,
  updatedAt,
  variant = 'full',
  showUpdated = true,
  dense = false,
  sx = {},
}) {
  const created = createdAt ?? getTimestampValue(item, 'created');
  const updated = updatedAt ?? getTimestampValue(item, 'updated');
  const formatter = variant === 'date' ? formatContentDate : formatContentDateTime;
  const gap = dense ? 0.25 : 0.5;

  if (!created && !updated) return null;

  return (
    <Stack spacing={gap} sx={{ mt: dense ? 0.5 : 1, ...sx }}>
      {created ? (
        <Stack direction="row" spacing={0.75} alignItems="flex-start">
          <AccessTimeIcon sx={{ fontSize: dense ? 14 : 16, mt: '2px', color: 'text.secondary' }} />
          <Stack spacing={0}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} lineHeight={1.2}>
              Created
            </Typography>
            <Typography variant={dense ? 'caption' : 'body2'} color="text.secondary" lineHeight={1.3}>
              {formatter(created)}
            </Typography>
          </Stack>
        </Stack>
      ) : null}

      {showUpdated && updated && variant !== 'date' ? (
        <Stack direction="row" spacing={0.75} alignItems="flex-start">
          <UpdateIcon sx={{ fontSize: dense ? 14 : 16, mt: '2px', color: 'text.secondary' }} />
          <Stack spacing={0}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} lineHeight={1.2}>
              Last Updated
            </Typography>
            <Typography variant={dense ? 'caption' : 'body2'} color="text.secondary" lineHeight={1.3}>
              {formatter(updated)}
            </Typography>
          </Stack>
        </Stack>
      ) : null}

      {showUpdated && updated && variant === 'date' && updated !== created ? (
        <Stack direction="row" spacing={0.75} alignItems="flex-start">
          <UpdateIcon sx={{ fontSize: dense ? 14 : 16, mt: '2px', color: 'text.secondary' }} />
          <Stack spacing={0}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} lineHeight={1.2}>
              Updated
            </Typography>
            <Typography variant={dense ? 'caption' : 'body2'} color="text.secondary" lineHeight={1.3}>
              {formatter(updated)}
            </Typography>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
