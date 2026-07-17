import { Button, Card, CardActions, CardContent, Typography } from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { Link as RouterLink } from 'react-router-dom';
import { downloadCertificatePdf } from '../../utils/certificatePdf';

export default function CertificateCard({ certificate }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <WorkspacePremiumIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {certificate.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {certificate.course_title || 'Course completion certificate'}
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
        >
          View
        </Button>
        <Button size="small" onClick={() => downloadCertificatePdf(certificate)}>
          Download PDF
        </Button>
      </CardActions>
    </Card>
  );
}
