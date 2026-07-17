import { Box, Card, CardContent, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, icon, color = 'primary.main' }) {
  return (
    <Card
      component={motion.div}
      whileHover={{ y: -4 }}
      sx={{ height: '100%' }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h4">{value}</Typography>
          </Box>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: color,
              color: '#fff',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
