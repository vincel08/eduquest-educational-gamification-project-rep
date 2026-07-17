import crypto from 'crypto';

export function generateCertificateCode() {
  const segment = () => crypto.randomBytes(3).toString('hex').toUpperCase();
  return `EQ-${segment()}-${segment()}-${segment()}`;
}
