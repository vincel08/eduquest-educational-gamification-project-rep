import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { getErrorMessage } from "../../services/api";
import {
  getPasswordError,
  getUsernameError,
  MIN_PASSWORD_LENGTH,
  validateRegistrationForm,
} from "../../utils/authValidation";
import { GRADE_LEVELS, GRADE_LEVEL_PLACEHOLDER } from "../../utils/gradeLevels";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    role: "student",
    gradeLevel: "",
    schoolName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field) {
    return (event) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));

      if (field === "password") {
        setFieldErrors((prev) => ({
          ...prev,
          password: value ? getPasswordError(value) : prev.password,
        }));
      } else if (field === "username") {
        setFieldErrors((prev) => ({
          ...prev,
          username: value ? getUsernameError(value) : prev.username,
        }));
      } else if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: "" }));
      }
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validation = validateRegistrationForm(form);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError(
        validation.errors.password ||
          Object.values(validation.errors)[0] ||
          "Please fix the highlighted fields",
      );
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      await register({
        ...form,
        role: "student",
        email: form.email.trim() || undefined,
      });
      navigate("/student/dashboard");
    } catch (err) {
      const message = getErrorMessage(err, "Unable to register");
      setError(message);

      if (message.toLowerCase().includes("password")) {
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
    <Box
      sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: 560 }}
      >
        <Card sx={{ width: "100%" }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              Join EduWow
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create your learner account with a username or email. If you
              forget your password later, ask a school administrator.
            </Typography>

            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : null}

            <Stack
              component="form"
              spacing={2}
              onSubmit={handleSubmit}
              noValidate
            >
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="First name"
                  required
                  fullWidth
                  value={form.firstName}
                  onChange={updateField("firstName")}
                  error={Boolean(fieldErrors.firstName)}
                  helperText={fieldErrors.firstName}
                />
                <TextField
                  label="Last name"
                  required
                  fullWidth
                  value={form.lastName}
                  onChange={updateField("lastName")}
                  error={Boolean(fieldErrors.lastName)}
                  helperText={fieldErrors.lastName}
                />
              </Stack>
              <TextField
                label="Username or school/LRN ID"
                required
                value={form.username}
                onChange={updateField("username")}
                error={Boolean(fieldErrors.username)}
                helperText={
                  fieldErrors.username ||
                  "This is how you sign in. Email is not required."
                }
                autoComplete="username"
              />
              <TextField
                label="Email (optional)"
                type="email"
                value={form.email}
                onChange={updateField("email")}
                error={Boolean(fieldErrors.email)}
                helperText={
                  fieldErrors.email || "Leave blank if you do not have an email"
                }
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={updateField("password")}
                error={Boolean(fieldErrors.password)}
                helperText={
                  fieldErrors.password ||
                  `At least ${MIN_PASSWORD_LENGTH} characters with uppercase, lowercase, and a number`
                }
                slotProps={{
                  htmlInput: { minLength: MIN_PASSWORD_LENGTH },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Alert severity="info">
                Student registration only. Teacher accounts must be created by
                an administrator.
              </Alert>
              <TextField
                select
                label="Grade Level"
                required
                fullWidth
                value={form.gradeLevel}
                onChange={updateField("gradeLevel")}
                error={Boolean(fieldErrors.gradeLevel)}
                helperText={fieldErrors.gradeLevel}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (!selected) {
                      return GRADE_LEVEL_PLACEHOLDER;
                    }
                    return selected;
                  },
                }}
              >
                <MenuItem value="" disabled>
                  {GRADE_LEVEL_PLACEHOLDER}
                </MenuItem>
                {GRADE_LEVELS.map((grade) => (
                  <MenuItem key={grade} value={grade}>
                    {grade}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="School name"
                value={form.schoolName}
                onChange={updateField("schoolName")}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Register"}
              </Button>
            </Stack>

            <Typography sx={{ mt: 3 }} variant="body2">
              Already have an account?{" "}
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
