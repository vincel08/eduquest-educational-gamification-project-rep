import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';
import { motion } from 'framer-motion';

export default function LevelUpDialog({ open, data, onClose }) {
  if (!data) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
        <Stack
          component={motion.div}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          spacing={1.5}
          alignItems="center"
        >
          <CelebrationIcon sx={{ fontSize: 56, color: '#FACC15' }} />
          <Typography variant="h4" fontWeight={900}>
            🎉 Level Up!
          </Typography>
          <Typography color="text.secondary">
            Previous Level {data.previousLevel} → New Level {data.newLevel}
          </Typography>
          <Typography variant="h5" fontWeight={900} color="primary.main">
            Current Level {data.newLevel}
          </Typography>
          {data.xpEarned ? (
            <Typography fontWeight={800} sx={{ color: '#F97316' }}>
              +{data.xpEarned} XP earned
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button variant="contained" size="large" onClick={onClose}>
          Continue Learning
        </Button>
      </DialogActions>
    </Dialog>
  );
}
