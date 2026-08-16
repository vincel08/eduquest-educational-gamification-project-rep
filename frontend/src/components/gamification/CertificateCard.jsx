import { Button, Card, CardActions, CardContent, Typography } from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { downloadCertificatePdf } from '../../utils/certificatePdf';

export default function CertificateCard({ certificate }) {
  return (
    <Card
      className="glass-panel"
      component={motion.div}
      whileHover={{ y: -4, scale: 1.02 }}
      sx={{ height: '100%' }}
    >
      <CardContent>
        <WorkspacePremiumIcon
          sx={{
            fontSize: 44,
            mb: 1,
            color: '#FACC15',
            filter: 'drop-shadow(0 4px 10px rgba(250,204,21,0.45))',
          }}
        />
        <Typography variant="h6" gutterBottom fontWeight={900}>
          {certificate.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {certificate.course_title || 'Subject completion certificate'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Code: {certificate.certificate_code}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          component={RouterLink}
          to={`/student/certificates/${certificate.id}`}
          size="small"
          variant="contained"
        >
          View
        </Button>
        <Button size="small" color="secondary" onClick={() => downloadCertificatePdf(certificate)}>
          Download PDF
        </Button>
      </CardActions>
    </Card>
  );
}
