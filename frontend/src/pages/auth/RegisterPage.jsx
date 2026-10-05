import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import { Link as RouterLink } from "react-router-dom";
import { getErrorMessage } from "../../services/api";
import authService from "../../services/authService";
import BrandLogo from "../../components/common/BrandLogo";
import AuthLiquidShell from "../../components/common/AuthLiquidShell";
import classSectionService from "../../services/classSectionService";
import {
  getPasswordError,
  getUsernameError,
  MIN_PASSWORD_LENGTH,
  validateRegistrationForm,
} from "../../utils/authValidation";
import { GRADE_LEVELS, GRADE_LEVEL_PLACEHOLDER } from "../../utils/gradeLevels";
import {
  defaultSchoolYearValue,
  listSchoolYearOptions,
} from "../../utils/schoolYears";
import { SECTION_PLACEHOLDER } from "../../utils/classSections";
import { useClassSectionsRevision } from "../../utils/classSectionsEvents";

function fieldErrorFromMessage(message) {
  const text = String(message || "");
  const lower = text.toLowerCase();
  if (lower.includes("first name")) return { firstName: text };
  if (lower.includes("last name")) return { lastName: text };
  if (lower.includes("email")) return { email: text };
  if (lower.includes("password")) return { password: text };
  if (lower.includes("grade")) return { gradeLevel: text };
  if (lower.includes("section")) return { section: text };
  if (lower.includes("school year")) return { schoolYear: text };
  if (lower.includes("username")) return { username: text };
  return {};
}

export default function RegisterPage() {
  const sectionsRevision = useClassSectionsRevision();
  const schoolYearOptions = listSchoolYearOptions({ includeAll: false });
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    role: "student",
    gradeLevel: "",
    schoolName: "",
    section: "",
    schoolYear: defaultSchoolYearValue(),
  });
  const [sectionOptions, setSectionOptions] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!form.schoolYear || !form.gradeLevel) {
      setSectionOptions([]);
      return undefined;
    }
    classSectionService
      .options({ schoolYear: form.schoolYear, gradeLevel: form.gradeLevel })
      .then((response) => {
        if (!active) return;
        const options = response.data.data || [];
        setSectionOptions(options);
        setError("");
        setForm((prev) =>
          prev.section && !options.includes(prev.section)
            ? { ...prev, section: "" }
            : prev,
        );
      })
      .catch(() => {
        if (!active) return;
        setSectionOptions([]);
        setError("Could not load class sections. Check your connection and try again.");
      });
    return () => {
      active = false;
    };
  }, [form.schoolYear, form.gradeLevel, sectionsRevision]);

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

    if (form.gradeLevel && form.schoolYear && !sectionOptions.length) {
      setFieldErrors({
        section: "No sections yet for this grade — ask an admin to add one",
      });
      setError("No sections yet for this grade — ask an admin to add one");
      return;
    }

    if (form.section && sectionOptions.length && !sectionOptions.includes(form.section)) {
      setFieldErrors({ section: "Select a section from the list for this grade and school year." });
      setError("Select a section from the list for this grade and school year.");
      return;
    }

    setFieldErrors({});
    setLoading(true);

    const payload = {
      ...form,
      role: "student",
      email: form.email.trim() || undefined,
    };

    try {
      await authService.validateRegistration(payload);
      await authService.register(payload);
      setSubmitted(true);
    } catch (err) {
      const message = getErrorMessage(err, "Unable to register");
      setError(message);
      setFieldErrors((prev) => ({
        ...prev,
        ...fieldErrorFromMessage(message),
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLiquidShell maxWidth={560}>
      <CardContent sx={{ p: { xs: 2.5, sm: 4 }, position: "relative" }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
              <BrandLogo size="auth" to="/" />
            </Box>
            {submitted ? null : (
              <>
                <Typography variant="h5" fontWeight={800} gutterBottom sx={{ textAlign: "center" }}>
                  Join EduWow
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
                  Create your learner account with a username or email. An
                  administrator approves it before you can sign in.
                </Typography>
              </>
            )}

            {submitted ? (
              <Stack spacing={2}>
                <Alert severity="success">
                  Your account was submitted. You can sign in after an
                  administrator approves it.
                </Alert>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  fullWidth
                >
                  Back to sign in
                </Button>
              </Stack>
            ) : null}

            {error && !submitted ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : null}

            {submitted ? null : (
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
                select
                label="School Year"
                required
                fullWidth
                value={form.schoolYear}
                onChange={updateField("schoolYear")}
                error={Boolean(fieldErrors.schoolYear)}
                helperText={fieldErrors.schoolYear}
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
                fullWidth
                value={form.section}
                onChange={updateField("section")}
                error={Boolean(fieldErrors.section)}
                helperText={
                  fieldErrors.section ||
                  (!form.gradeLevel
                    ? "Select a grade level first"
                    : sectionOptions.length
                      ? SECTION_PLACEHOLDER
                      : "No sections yet for this grade — ask an admin to add one")
                }
                disabled={!form.gradeLevel || !sectionOptions.length}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (!selected) return SECTION_PLACEHOLDER;
                    return selected;
                  },
                }}
              >
                <MenuItem value="" disabled>
                  {SECTION_PLACEHOLDER}
                </MenuItem>
                {sectionOptions.map((section) => (
                  <MenuItem key={section} value={section}>
                    {section}
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
                disabled={loading || !form.section || !sectionOptions.length}
              >
                {loading ? "Creating account..." : "Register"}
              </Button>
            </Stack>
            )}

            {submitted ? null : (
            <Typography sx={{ mt: 3 }} variant="body2">
              Already have an account?{" "}
              <Link component={RouterLink} to="/login">
                Login
              </Link>
            </Typography>
            )}
          </CardContent>
    </AuthLiquidShell>
  );
}
