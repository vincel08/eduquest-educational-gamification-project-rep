import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import authService from '../../services/authService';
import { getErrorMessage } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

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
      setSuccess(
        response.data?.message
        || 'If an account with that email exists, a password reset link has been sent.'
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send reset link'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 460 }}
      >
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              Forgot your password?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </Typography>

            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField
                label="Email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading || Boolean(success)}
              />
              <Button type="submit" variant="contained" size="large" disabled={loading || Boolean(success)}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Stack>

            <Typography sx={{ mt: 3 }} variant="body2">
              <Link component={RouterLink} to="/login">
                Back to Login
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}
