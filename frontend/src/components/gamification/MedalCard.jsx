import { Avatar, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import { motion } from 'framer-motion';

const tierColors = {
  bronze: '#CD7F32',
  silver: '#9CA3AF',
  gold: '#F59E0B',
  platinum: '#67E8F9',
};

export default function MedalCard({ medal }) {
  return (
    <Card component={motion.div} whileHover={{ scale: 1.02 }} sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Avatar sx={{ bgcolor: tierColors[medal.tier] || '#CD7F32', width: 64, height: 64 }}>
            <MilitaryTechIcon />
          </Avatar>
          <Chip label={medal.tier} size="small" sx={{ textTransform: 'capitalize' }} />
          <Typography fontWeight={800}>{medal.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {medal.description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
