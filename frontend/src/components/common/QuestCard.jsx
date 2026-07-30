import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import ContentTimestamp from './ContentTimestamp';

const ACCENT_MAP = {
  blue: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
  purple: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
  yellow: 'linear-gradient(135deg, #FACC15, #FDE047)',
  green: 'linear-gradient(135deg, #22C55E, #4ADE80)',
  orange: 'linear-gradient(135deg, #F97316, #FB923C)',
};

export default function QuestCard({
  title,
  description,
  icon,
  accent = 'blue',
  difficulty,
  xpReward,
  estimatedTime,
  status,
  statusColor = 'primary',
  meta,
  to,
  actionLabel = 'Open',
  onAction,
  showTimestamp = false,
  item,
  timestampVariant = 'date',
}) {
  return (
    <Card
      className="quest-card"
      component={motion.div}
      whileHover={{ y: -8, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: to || onAction ? 'pointer' : 'default',
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '18px',
              display: 'grid',
              placeItems: 'center',
              background: ACCENT_MAP[accent] || ACCENT_MAP.blue,
              color: accent === 'yellow' ? '#1E293B' : '#fff',
              boxShadow: '0 10px 22px rgba(59,130,246,0.22)',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
              {status ? <Chip size="small" label={status} color={statusColor} /> : null}
              {difficulty ? (
                <Chip
                  size="small"
                  label={String(difficulty).replace(/_/g, ' ')}
                  variant="outlined"
                  sx={{ textTransform: 'capitalize' }}
                />
              ) : null}
            </Stack>
            <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.25 }}>
              {title}
            </Typography>
          </Box>
        </Stack>

        {description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </Typography>
        ) : null}

        {meta ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {meta}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {xpReward != null ? (
            <Chip
              size="small"
              icon={<BoltIcon />}
              label={`${xpReward} XP`}
              sx={{ bgcolor: 'rgba(250,204,21,0.2)', fontWeight: 800 }}
            />
          ) : null}
          {estimatedTime != null ? (
            <Chip
              size="small"
              icon={<ScheduleIcon />}
              label={`${estimatedTime} min`}
              variant="outlined"
            />
          ) : null}
        </Stack>

        {showTimestamp && item ? (
          <ContentTimestamp item={item} variant={timestampVariant} showUpdated={timestampVariant !== 'date'} dense />
        ) : null}
      </CardContent>

      {(to || onAction) ? (
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button
            fullWidth
            variant="contained"
            component={to ? RouterLink : 'button'}
            to={to}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </CardActions>
      ) : null}
    </Card>
  );
}
