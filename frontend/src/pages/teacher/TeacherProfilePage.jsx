import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import authService from "../../services/authService";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { buildAuthenticatedFileUrl } from "../../utils/fileUrls";
import { useAuth } from "../../contexts/AuthContext";

function resolveAvatarUrl(url) {
  if (!url) return undefined;
  if (url.startsWith("blob:")) {
    return url;
  }
  return buildAuthenticatedFileUrl(url) || undefined;
}

export default function TeacherProfilePage() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [subjectCount, setSubjectCount] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, coursesRes] = await Promise.all([
          authService.me(),
          courseService.list({ limit: 200 }),
        ]);
        const mePayload = meRes.data.data || {};
        const meUser = mePayload.user || mePayload;
        if (meUser) {
          updateProfile(mePayload.profile ?? null, meUser);
        }
        setForm({
          firstName: meUser?.firstName || user?.firstName || "",
          lastName: meUser?.lastName || user?.lastName || "",
        });
        setAvatarUrl(meUser?.avatarUrl || user?.avatarUrl || "");
        const courses =
          coursesRes.data.data?.courses || coursesRes.data.data || [];
        setSubjectCount(Array.isArray(courses) ? courses.length : 0);
      } catch (err) {
        setError(getErrorMessage(err));
        setForm({
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
        });
        setAvatarUrl(user?.avatarUrl || "");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [updateProfile, user?.firstName, user?.lastName, user?.avatarUrl]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await authService.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
      });
      updateProfile(response.data.data.profile, response.data.data.user);
      setAvatarUrl(response.data.data.user?.avatarUrl || "");
      setMessage("Profile updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingAvatar(true);
    setError("");
    setMessage("");
    try {
      const response = await authService.uploadAvatar(file);
      updateProfile(response.data.data.profile, response.data.data.user);
      setAvatarUrl(response.data.data.user?.avatarUrl || "");
      setMessage("Profile picture updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    setError("");
    setMessage("");
    try {
      const response = await authService.removeAvatar();
      updateProfile(response.data.data.profile, response.data.data.user);
      setAvatarUrl("");
      setMessage("Profile picture removed.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="My Profile"
        subtitle="Your teacher account details and photo"
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Avatar
              src={resolveAvatarUrl(avatarUrl)}
              sx={{
                width: 112,
                height: 112,
                mx: "auto",
                mb: 2,
                bgcolor: "secondary.main",
              }}
            >
              {(form.firstName || "T")[0]}
            </Avatar>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<PhotoCameraIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "Uploading..." : "Upload photo"}
              </Button>
              {avatarUrl ? (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<CancelRoundedIcon />}
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                >
                  Remove photo
                </Button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                hidden
                onChange={handleAvatarChange}
              />
              <Typography variant="caption" color="text.secondary">
                PNG, JPG, or WEBP up to 5MB
              </Typography>
            </Stack>
            <Typography variant="h5">
              {form.firstName} {form.lastName}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {user?.email || "No email on file"}
            </Typography>
            <Typography sx={{ mt: 1.5 }} color="text.secondary">
              Role: Teacher
            </Typography>
            <Typography color="text.secondary">
              Subjects: {subjectCount}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }} component="form" onSubmit={handleSave}>
            <Typography variant="h6" gutterBottom>
              Edit Profile
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="First name"
                value={form.firstName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
                required
              />
              <TextField
                label="Last name"
                value={form.lastName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
                required
              />
              <TextField
                label="Email"
                value={user?.email || ""}
                disabled
                helperText="Email is managed by your school administrator."
              />
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
