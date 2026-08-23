import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import authService from '../../services/authService';
import { getErrorMessage } from '../../services/api';
import { getPasswordError, MIN_PASSWORD_LENGTH } from '../../utils/authValidation';
import BrandLogo from '../../components/common/BrandLogo';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const missingToken = !token;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (missingToken) {
      setError('Your password reset link is invalid or has expired. Please request a new one.');
      return;
    }

    const errors = {};
    const passwordError = getPasswordError(password);
    if (passwordError) errors.password = passwordError;
    if (!confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError(errors.confirmPassword || errors.password || 'Please fix the highlighted fields');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const response = await authService.resetPassword({
        token,
        password,
        confirmPassword,
      });
      setSuccess(response.data?.message || 'Your password has been reset successfully.');
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Your password reset link is invalid or has expired. Please request a new one.'
        )
      );
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
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <BrandLogo size="auth" to="/" />
            </Box>
            <Typography variant="h5" fontWeight={800} gutterBottom sx={{ textAlign: 'center' }}>
              Reset Password
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Choose a new password for your EduWow account.
            </Typography>

            {missingToken ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                Your password reset link is invalid or has expired. Please request a new one.
              </Alert>
            ) : null}
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

            {success ? (
              <Button component={RouterLink} to="/login" variant="contained" size="large" fullWidth>
                Return to Login
              </Button>
            ) : (
              <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
                <TextField
                  label="New password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPassword(value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      password: value ? getPasswordError(value) : prev.password,
                    }));
                  }}
                  error={Boolean(fieldErrors.password)}
                  helperText={
                    fieldErrors.password
                    || `At least ${MIN_PASSWORD_LENGTH} characters with uppercase, lowercase, and a number`
                  }
                  disabled={loading || missingToken}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword((prev) => !prev)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label="Confirm password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(event) => {
                    const value = event.target.value;
                    setConfirmPassword(value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      confirmPassword:
                        value && value !== password ? 'Passwords do not match.' : '',
                    }));
                  }}
                  error={Boolean(fieldErrors.confirmPassword)}
                  helperText={fieldErrors.confirmPassword}
                  disabled={loading || missingToken}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || missingToken}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </Stack>
            )}

            <Typography sx={{ mt: 3 }} variant="body2">
              <Link component={RouterLink} to="/forgot-password">
                Request a new reset link
              </Link>
              {' · '}
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
