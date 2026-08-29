import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import authService from '../../services/authService';
import { getErrorMessage } from '../../services/api';
import BrandLogo from '../../components/common/BrandLogo';
import AuthLiquidShell from '../../components/common/AuthLiquidShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setFeedback(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.forgotPassword({ email: trimmed });
      const eligible = Boolean(response.data?.data?.eligible);
      const reason = response.data?.data?.reason;
      const message = response.data?.message
        || (eligible
          ? 'A password reset link has been sent to that staff email address.'
          : 'This email is not eligible for staff password reset.');

      setFeedback({
        severity: eligible ? 'success' : 'warning',
        message,
        reason,
        eligible,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send reset link'));
    } finally {
      setLoading(false);
    }
  }

  const formLocked = loading || Boolean(feedback?.eligible);

  return (
    <AuthLiquidShell>
      <CardContent sx={{ p: { xs: 2.5, sm: 4 }, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <BrandLogo size="auth" to="/" />
        </Box>
        <Typography variant="h5" fontWeight={800} gutterBottom sx={{ textAlign: 'center' }}>
          Staff password reset
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
          Teachers and administrators can reset via email.
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Learners cannot use this page — even if they have an email on their account.
          Ask a school administrator to set a new password.
        </Alert>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {feedback ? (
          <Alert severity={feedback.severity} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        ) : null}

        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="Work email"
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (feedback && !feedback.eligible) {
                setFeedback(null);
              }
            }}
            disabled={formLocked}
            helperText={
              feedback?.reason === 'learner'
                ? 'This address belongs to a learner account.'
                : undefined
            }
          />
          <Button type="submit" variant="contained" size="large" disabled={formLocked}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </Stack>

        <Typography sx={{ mt: 3 }} variant="body2">
          <Link component={RouterLink} to="/login">
            Back to Login
          </Link>
        </Typography>
      </CardContent>
    </AuthLiquidShell>
  );
}
