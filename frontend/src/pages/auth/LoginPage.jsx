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

const roleHome = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  administrator: "/admin/dashboard",
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login({
        login: form.login.trim(),
        password: form.password,
      });
      navigate(roleHome[user.role] || "/");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to login"));
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
        style={{ width: "100%", maxWidth: 460 }}
      >
        <Card sx={{ width: "100%" }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              EduWow
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Login to continue your learning adventure.
            </Typography>

            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : null}

            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField
                label="Username or email"
                type="text"
                required
                value={form.login}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, login: event.target.value }))
                }
                autoComplete="username"
                inputMode="text"
                helperText="Learners: username or school/LRN ID · Staff: email"
                slotProps={{
                  htmlInput: {
                    type: "text",
                    inputMode: "text",
                    autoCapitalize: "none",
                    autoCorrect: "off",
                    spellCheck: false,
                  },
                }}
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                slotProps={{
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
              <Stack spacing={0.5} alignItems="flex-end">
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  Learners: ask a school administrator to reset your
                  password.
                </Typography>
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                >
                  Staff forgot password?
                </Link>
              </Stack>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Login"}
              </Button>
            </Stack>

            <Typography sx={{ mt: 3 }} variant="body2">
              No account yet?{" "}
              <Link component={RouterLink} to="/register">
                Register
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}
