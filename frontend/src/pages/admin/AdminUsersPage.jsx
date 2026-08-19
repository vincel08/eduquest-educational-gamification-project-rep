import { useEffect, useMemo, useState, Fragment } from 'react';
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
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import userService from '../../services/userService';
import classSectionService from '../../services/classSectionService';
import { getErrorMessage } from '../../services/api';
import { useAdminFilters } from '../../contexts/AdminFiltersContext';
import { useClassSectionsRevision } from '../../utils/classSectionsEvents';
import { GRADE_LEVELS } from '../../utils/gradeLevels';
import {
  defaultSchoolYearValue,
  listSchoolYearOptions,
} from '../../utils/schoolYears';
import { SECTION_PLACEHOLDER } from '../../utils/classSections';

const emptyForm = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  role: 'student',
  gradeLevel: 'Grade 10',
  schoolName: 'EduWow High',
  section: '',
  schoolYear: defaultSchoolYearValue(),
};

export default function AdminUsersPage() {
  const { toQueryParams, schoolYear, gradeLevel, section } = useAdminFilters();
  const sectionsRevision = useClassSectionsRevision();
  const schoolYearOptions = listSchoolYearOptions({ includeAll: false });
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    if (!form.schoolYear || !form.gradeLevel || form.role !== 'student') {
      setSectionOptions([]);
      return undefined;
    }
    classSectionService
      .options({ schoolYear: form.schoolYear, gradeLevel: form.gradeLevel })
      .then((response) => {
        if (!active) return;
        const options = response.data.data || [];
        setSectionOptions(options);
        setForm((prev) =>
          prev.section && !options.includes(prev.section)
            ? { ...prev, section: '' }
            : prev,
        );
      })
      .catch(() => {
        if (!active) return;
        setSectionOptions([]);
      });
    return () => {
      active = false;
    };
  }, [form.schoolYear, form.gradeLevel, form.role, sectionsRevision]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = {
      limit: 100,
      ...toQueryParams(),
    };
    if (roleFilter !== 'all') {
      params.role = roleFilter;
    }
    if (search) {
      params.search = search;
    }
    userService
      .list(params)
      .then((response) => {
        if (!active) return;
        setUsers(response.data.data.users || []);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [schoolYear, gradeLevel, section, roleFilter, search, toQueryParams]);

  async function reloadUsers() {
    try {
      const params = {
        limit: 100,
        ...toQueryParams(),
      };
      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }
      if (search) {
        params.search = search;
      }
      const response = await userService.list(params);
      setUsers(response.data.data.users || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

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
      await reloadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleActive(user) {
    try {
      await userService.update(user.id, { isActive: !user.isActive });
      await reloadUsers();
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

  const isStudentRole = form.role === 'student';
  const userGroups = useMemo(() => {
    const groups = [
      { key: 'administrator', label: 'Administrators', users: [] },
      { key: 'teacher', label: 'Teachers', users: [] },
      { key: 'student', label: 'Students', users: [] },
    ];
    const byRole = Object.fromEntries(groups.map((group) => [group.key, group]));
    users.forEach((user) => {
      const group = byRole[user.role];
      if (group) group.users.push(user);
    });
    return groups.filter((group) => group.users.length > 0);
  }, [users]);

  if (loading && !users.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Search and filter by role. Sidebar school year / grade / section filters apply to students (and section advisers)."
        action={<Button variant="contained" onClick={() => setOpen(true)}>Add User</Button>}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          label="Search"
          placeholder="Name, username, or email"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          fullWidth
        />
        <TextField
          select
          size="small"
          label="Role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          sx={{ minWidth: { sm: 180 } }}
        >
          <MenuItem value="all">All roles</MenuItem>
          <MenuItem value="administrator">Administrators</MenuItem>
          <MenuItem value="teacher">Teachers</MenuItem>
          <MenuItem value="student">Students</MenuItem>
        </TextField>
      </Stack>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 110 }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 90 }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>Section</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 110 }}>School Year</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userGroups.map((group) => (
                <Fragment key={group.key}>
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      sx={{
                        bgcolor: 'action.hover',
                        py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={800}>
                        {group.label} ({group.users.length})
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {group.users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.username || '—'}
                      </TableCell>
                      <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email || '—'}
                      </TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{user.role}</TableCell>
                      <TableCell>
                        {user.role === 'student' ? user.gradeLevel || '—' : '—'}
                      </TableCell>
                      <TableCell>
                        {user.role === 'student' ? user.section || '—' : '—'}
                      </TableCell>
                      <TableCell>
                        {user.role === 'student'
                          ? user.schoolYear
                            ? `SY ${user.schoolYear}`
                            : '—'
                          : '—'}
                      </TableCell>
                      <TableCell>{user.isActive ? 'Active' : 'Inactive'}</TableCell>
                      <TableCell>
                        <Stack alignItems="flex-start" spacing={0}>
                          <Button
                            size="small"
                            onClick={() => toggleActive(user)}
                            sx={{ px: 0.5, justifyContent: 'flex-start' }}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          {user.role === 'student' ? (
                            <Button
                              size="small"
                              onClick={() => {
                                setPasswordTarget(user);
                                setNewPassword('');
                              }}
                              sx={{ px: 0.5, justifyContent: 'flex-start' }}
                            >
                              Set password
                            </Button>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              {!users.length ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    No users match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
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
              <>
                <TextField
                  label="Username or school/LRN ID"
                  required
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  helperText="Required for students. Used to sign in."
                />
                <TextField
                  select
                  label="Grade Level"
                  required
                  value={form.gradeLevel}
                  onChange={(e) => setForm((p) => ({ ...p, gradeLevel: e.target.value }))}
                >
                  {GRADE_LEVELS.map((grade) => (
                    <MenuItem key={grade} value={grade}>
                      {grade}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="School Year"
                  required
                  value={form.schoolYear}
                  onChange={(e) => setForm((p) => ({ ...p, schoolYear: e.target.value }))}
                >
                  {schoolYearOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Section"
                  required
                  value={form.section}
                  onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
                  placeholder={SECTION_PLACEHOLDER}
                  helperText={
                    sectionOptions.length
                      ? 'Choose from admin-managed sections'
                      : 'No sections for this grade — add one under Sections first'
                  }
                  disabled={!sectionOptions.length}
                >
                  {sectionOptions.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="School name"
                  value={form.schoolName}
                  onChange={(e) => setForm((p) => ({ ...p, schoolName: e.target.value }))}
                />
              </>
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
