import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export async function downloadCertificatePdf(certificate) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, width, 28, 'F');
  doc.rect(0, height - 28, width, 28, 'F');

  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(2);
  doc.rect(36, 48, width - 72, height - 96);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 118, 110);
  doc.text('EduQuest Certificate of Achievement', width / 2, 90, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(20, 20, 20);
  doc.text(certificate.title || 'Certificate', width / 2, 150, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('This certifies that', width / 2, 190, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(
    `${certificate.first_name || ''} ${certificate.last_name || ''}`.trim() || 'Student',
    width / 2,
    225,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  const description = certificate.description
    || 'Successfully completed the learning requirements.';
  doc.text(description, width / 2, 260, { align: 'center', maxWidth: width - 160 });

  doc.text(`Course: ${certificate.course_title || 'General Program'}`, width / 2, 300, { align: 'center' });
  doc.text(`Certificate No: ${certificate.certificate_code}`, width / 2, 325, { align: 'center' });

  if (certificate.issued_at) {
    const issued = new Date(certificate.issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Issued: ${issued}`, width / 2, 350, { align: 'center' });
  }

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text('Digitally verified by EduQuest LMS', width / 2, height - 70, { align: 'center' });

  const verifyUrl = `${window.location.origin}/student/certificates/${certificate.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
  doc.addImage(qrDataUrl, 'PNG', width - 150, height - 160, 90, 90);

  doc.save(`${certificate.certificate_code || 'eduquest-certificate'}.pdf`);
}
