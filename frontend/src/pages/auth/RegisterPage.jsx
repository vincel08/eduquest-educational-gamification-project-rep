import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/api';
import {
  getPasswordError,
  MIN_PASSWORD_LENGTH,
  validateRegistrationForm,
} from '../../utils/authValidation';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'student',
    gradeLevel: 'Grade 10',
    schoolName: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field) {
    return (event) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));

      if (field === 'password') {
        setFieldErrors((prev) => ({
          ...prev,
          password: value ? getPasswordError(value) : prev.password,
        }));
      } else if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: '' }));
      }
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const validation = validateRegistrationForm(form);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError(
        validation.errors.password
        || Object.values(validation.errors)[0]
        || 'Please fix the highlighted fields'
      );
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const user = await register(form);
      navigate(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to register');
      setError(message);

      if (message.toLowerCase().includes('password')) {
        setFieldErrors((prev) => ({
          ...prev,
          password: message,
        }));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 560 }}
      >
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              Join EduQuest
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create your account and start earning XP.
            </Typography>

            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

            <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="First name"
                  required
                  fullWidth
                  value={form.firstName}
                  onChange={updateField('firstName')}
                  error={Boolean(fieldErrors.firstName)}
                  helperText={fieldErrors.firstName}
                />
                <TextField
                  label="Last name"
                  required
                  fullWidth
                  value={form.lastName}
                  onChange={updateField('lastName')}
                  error={Boolean(fieldErrors.lastName)}
                  helperText={fieldErrors.lastName}
                />
              </Stack>
              <TextField
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={updateField('email')}
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
              />
              <TextField
                label="Password"
                type="password"
                required
                value={form.password}
                onChange={updateField('password')}
                error={Boolean(fieldErrors.password)}
                helperText={
                  fieldErrors.password
                  || `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
                }
                slotProps={{ htmlInput: { minLength: MIN_PASSWORD_LENGTH } }}
              />
              <TextField select label="Role" value={form.role} onChange={updateField('role')}>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
              </TextField>
              {form.role === 'student' ? (
                <>
                  <TextField label="Grade level" value={form.gradeLevel} onChange={updateField('gradeLevel')} />
                  <TextField label="School name" value={form.schoolName} onChange={updateField('schoolName')} />
                </>
              ) : null}
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Creating account...' : 'Register'}
              </Button>
            </Stack>

            <Typography sx={{ mt: 3 }} variant="body2">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login">
                Login
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}
