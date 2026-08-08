import { Avatar, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import { motion } from 'framer-motion';

const tierColors = {
  bronze: '#CD7F32',
  silver: '#9CA3AF',
  gold: '#FACC15',
  platinum: '#A78BFA',
};

export default function MedalCard({ medal }) {
  return (
    <Card
      className="glass-panel"
      component={motion.div}
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'box-shadow 0.25s ease',
        '&:hover': { boxShadow: '0 18px 40px rgba(139,92,246,0.2)' },
      }}
    >
      <CardContent>
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Avatar
            sx={{
              bgcolor: tierColors[medal.tier] || '#FACC15',
              color: medal.tier === 'gold' ? '#1E1B4B' : '#fff',
              width: 72,
              height: 72,
              boxShadow: '0 10px 24px rgba(124, 58, 237, 0.28)',
            }}
          >
            <MilitaryTechIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Chip
            label={medal.tier}
            size="small"
            sx={{
              textTransform: 'capitalize',
              bgcolor: 'rgba(250, 204, 21, 0.2)',
              color: 'warning.dark',
              fontWeight: 800,
            }}
          />
          <Typography fontWeight={900}>{medal.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {medal.description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
