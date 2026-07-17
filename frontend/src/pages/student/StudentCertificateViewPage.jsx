import { useEffect, useState } from 'react';
import { Alert, Button, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import QRCode from 'qrcode';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import gamificationService from '../../services/gamificationService';
import { getErrorMessage } from '../../services/api';
import { downloadCertificatePdf } from '../../utils/certificatePdf';

export default function StudentCertificateViewPage() {
  const { certificateId } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    gamificationService.getIssuedCertificate(certificateId)
      .then(async (response) => {
        const data = response.data.data;
        setCertificate(data);
        const verifyUrl = `${window.location.origin}/student/certificates/${data.id}`;
        setQrUrl(await QRCode.toDataURL(verifyUrl, { margin: 1, width: 140 }));
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [certificateId]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadCertificatePdf(certificate);
    } catch (err) {
      setError(err.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error && !certificate) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <PageHeader title="Certificate" subtitle="Official EduQuest achievement record" />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Button variant="contained" sx={{ mb: 2 }} onClick={handleDownload} disabled={downloading}>
        {downloading ? 'Preparing PDF...' : 'Download PDF'}
      </Button>

      <div className="certificate-sheet">
        <Typography variant="overline">EduQuest Certificate of Achievement</Typography>
        <Typography variant="h3" sx={{ my: 2 }}>
          {certificate.title}
        </Typography>
        <Typography variant="h5">
          {certificate.first_name} {certificate.last_name}
        </Typography>
        <Typography sx={{ mt: 2, mb: 3 }} color="text.secondary">
          {certificate.description || 'Successfully completed the learning requirements.'}
        </Typography>
        <Typography>
          Course: {certificate.course_title || 'General Program'}
        </Typography>
        <Typography sx={{ mt: 1 }}>
          Issued: {dayjs(certificate.issued_at).format('MMMM D, YYYY')}
        </Typography>
        <Typography sx={{ mt: 2 }} fontWeight={700}>
          Code: {certificate.certificate_code}
        </Typography>
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="Certificate QR code"
            style={{ marginTop: 24, width: 120, height: 120 }}
          />
        ) : null}
      </div>
    </>
  );
}
