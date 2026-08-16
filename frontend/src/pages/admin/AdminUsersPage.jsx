import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import userService from '../../services/userService';
import { getErrorMessage } from '../../services/api';

const emptyForm = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  role: 'student',
  gradeLevel: 'Grade 10',
  schoolName: 'EduWow High',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await userService.list({ limit: 100 });
      setUsers(response.data.data.users || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    setError('');
    setMessage('');
    try {
      const payload = {
        ...form,
        email: form.email.trim() || undefined,
        username: form.role === 'student' ? form.username.trim() : undefined,
      };
      await userService.create(payload);
      setOpen(false);
      setForm(emptyForm);
      setMessage('User created');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleActive(user) {
    try {
      await userService.update(user.id, { isActive: !user.isActive });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSetPassword() {
    setError('');
    try {
      await userService.setPassword(passwordTarget.id, { password: newPassword });
      setMessage(`Password updated for ${passwordTarget.firstName} ${passwordTarget.lastName}`);
      setPasswordTarget(null);
      setNewPassword('');
      setShowSetPassword(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <LoadingScreen />;

  const isStudentRole = form.role === 'student';

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Students use username (email optional). Only admins can reset learner passwords."
        action={<Button variant="contained" onClick={() => setOpen(true)}>Add User</Button>}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.firstName} {user.lastName}</TableCell>
                <TableCell>{user.username || '—'}</TableCell>
                <TableCell>{user.email || '—'}</TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>{user.role}</TableCell>
                <TableCell>{user.isActive ? 'Active' : 'Inactive'}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                    {user.role === 'student' ? (
                      <Button size="small" onClick={() => { setPasswordTarget(user); setNewPassword(''); }}>
                        Set password
                      </Button>
                    ) : null}
                    <Button size="small" onClick={() => toggleActive(user)}>
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="First name" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
            <TextField label="Last name" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            >
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="teacher">Teacher</MenuItem>
              <MenuItem value="administrator">Administrator</MenuItem>
            </TextField>
            {isStudentRole ? (
              <TextField
                label="Username or school/LRN ID"
                required
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                helperText="Required for students. Used to sign in."
              />
            ) : null}
            <TextField
              label={isStudentRole ? 'Email (optional)' : 'Email'}
              required={!isStudentRole}
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
            <TextField
              label="Password"
              type={showCreatePassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowCreatePassword((prev) => !prev)}
                        edge="end"
                      >
                        {showCreatePassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(passwordTarget)}
        onClose={() => {
          setPasswordTarget(null);
          setShowSetPassword(false);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Set password
          {passwordTarget ? ` · ${passwordTarget.firstName} ${passwordTarget.lastName}` : ''}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            sx={{ mt: 1 }}
            label="New password"
            type={showSetPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showSetPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowSetPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showSetPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPasswordTarget(null);
              setShowSetPassword(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSetPassword} disabled={!newPassword}>
            Save password
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
