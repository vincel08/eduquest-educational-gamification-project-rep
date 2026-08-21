import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';

/**
 * Visible session countdown driven by the teacher's time limit.
 */
export default function SessionTimerBar({
  formatted,
  limitFormatted,
  progress,
  isUrgent = false,
  label = 'Time left',
}) {
  return (
    <Stack
      spacing={0.75}
      sx={{
        mb: 1.5,
        p: 1.25,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isUrgent ? 'error.main' : 'divider',
        bgcolor: isUrgent ? 'rgba(239,68,68,0.08)' : 'action.hover',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <TimerOutlinedIcon
            fontSize="small"
            sx={{ color: isUrgent ? 'error.main' : 'text.secondary' }}
          />
          <Typography variant="body2" fontWeight={800} color={isUrgent ? 'error.main' : 'text.primary'}>
            {label}
          </Typography>
        </Stack>
        <Box
          sx={{
            px: 1.25,
            py: 0.35,
            borderRadius: 999,
            fontWeight: 900,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 14,
            color: isUrgent ? 'error.main' : 'text.primary',
            border: '1px solid',
            borderColor: isUrgent ? 'error.main' : 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {formatted}
        </Box>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 999,
          bgcolor: 'action.selected',
          '& .MuiLinearProgress-bar': {
            borderRadius: 999,
            bgcolor: isUrgent ? 'error.main' : 'primary.main',
          },
        }}
      />
      <Typography variant="caption" color="text.secondary">
        Teacher time limit {limitFormatted}. Results submit when time runs out.
      </Typography>
    </Stack>
  );
}
