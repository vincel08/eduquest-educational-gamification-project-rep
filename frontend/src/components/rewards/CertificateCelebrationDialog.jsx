import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function CertificateCelebrationDialog({ open, certificate, onClose }) {
  if (!certificate) return null;
  const certId = certificate.id || certificate.certificate_id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
        <Stack
          component={motion.div}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          spacing={1.5}
          alignItems="center"
        >
          <WorkspacePremiumIcon sx={{ fontSize: 72, color: '#8B5CF6' }} />
          <Typography variant="h4" fontWeight={900}>
            Congratulations!
          </Typography>
          <Typography color="text.secondary">
            You earned a certificate
            {certificate.title ? `: ${certificate.title}` : ''}
          </Typography>
          <Stack
            className="certificate-sheet"
            sx={{
              minHeight: 160,
              py: 3,
              px: 2,
              width: '100%',
              maxWidth: 420,
            }}
          >
            <Typography variant="h6" fontWeight={900}>Certificate of Achievement</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {certificate.certificate_code || 'EduQuest Certified Learner'}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1, flexWrap: 'wrap' }}>
        {certId ? (
          <Button
            component={RouterLink}
            to={`/student/certificates/${certId}`}
            variant="contained"
            onClick={onClose}
          >
            View / Download Certificate
          </Button>
        ) : null}
        <Button variant="outlined" onClick={onClose}>
          Continue Learning
        </Button>
      </DialogActions>
    </Dialog>
  );
}
