import { useEffect, useState } from 'react';
import { Alert, Grid, Typography } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import CertificateCard from '../../components/gamification/CertificateCard';
import gamificationService from '../../services/gamificationService';
import { getErrorMessage } from '../../services/api';

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamificationService.myCertificates()
      .then((response) => setCertificates(response.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Certificates"
        subtitle="Download and showcase your earned certificates."
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Grid container spacing={2}>
        {certificates.map((certificate) => (
          <Grid key={certificate.id} size={{ xs: 12, md: 4 }}>
            <CertificateCard certificate={certificate} />
          </Grid>
        ))}
      </Grid>
      {!certificates.length && !error ? (
        <Typography color="text.secondary">
          No certificates yet. Complete courses to earn them.
        </Typography>
      ) : null}
    </>
  );
}
