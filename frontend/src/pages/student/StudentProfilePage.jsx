import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import NoPhotographyOutlinedIcon from "@mui/icons-material/NoPhotographyOutlined";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import gamificationService from "../../services/gamificationService";
import authService from "../../services/authService";
import classSectionService from "../../services/classSectionService";
import { getErrorMessage } from "../../services/api";
import { buildAuthenticatedFileUrl } from "../../utils/fileUrls";
import { useAuth } from "../../contexts/AuthContext";
import {
  GRADE_LEVELS,
  GRADE_LEVEL_PLACEHOLDER,
  isValidGradeLevel,
} from "../../utils/gradeLevels";
import {
  defaultSchoolYearValue,
  listSchoolYearOptions,
} from "../../utils/schoolYears";
import { SECTION_PLACEHOLDER } from "../../utils/classSections";
import { useClassSectionsRevision } from "../../utils/classSectionsEvents";

function resolveAvatarUrl(url) {
  if (!url) return undefined;
  if (url.startsWith("blob:")) {
    return url;
  }
  return buildAuthenticatedFileUrl(url) || undefined;
}

export default function StudentProfilePage() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);
  const sectionsRevision = useClassSectionsRevision();
  const schoolYearOptions = listSchoolYearOptions({ includeAll: false });
  const [data, setData] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gradeLevel: "",
    schoolName: "",
    section: "",
    schoolYear: defaultSchoolYearValue(),
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sectionOptions, setSectionOptions] = useState([]);

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
        setForm((prev) => {
          if (!prev.section) return prev;
          const matched = options.find(
            (item) => item.toLowerCase() === String(prev.section).toLowerCase(),
          );
          if (matched) {
            return matched === prev.section ? prev : { ...prev, section: matched };
          }
          return { ...prev, section: "" };
        });
      })
      .catch(() => {
        if (!active) return;
        setSectionOptions([]);
      });
    return () => {
      active = false;
    };
  }, [form.schoolYear, form.gradeLevel, sectionsRevision]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const meRes = await gamificationService.me();
        if (!active) return;
        const gamification = meRes.data.data;
        setData({ gamification });
        updateProfile(gamification.profile);
        const existingGrade = gamification.profile?.grade_level || "";
        const existingSection = gamification.profile?.section || "";
        setForm({
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          gradeLevel: isValidGradeLevel(existingGrade) ? existingGrade : "",
          schoolName: gamification.profile?.school_name || "",
          section: existingSection,
          schoolYear:
            gamification.profile?.school_year || defaultSchoolYearValue(),
        });
        setAvatarUrl(user?.avatarUrl || "");
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount/id load
  }, [user?.id]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await authService.updateProfile({
        ...form,
      });
      updateProfile(response.data.data.profile, response.data.data.user);
      setAvatarUrl(response.data.data.user?.avatarUrl || "");
      const nextProfile = response.data.data.profile || {};
      setForm((prev) => ({
        ...prev,
        firstName: response.data.data.user?.firstName ?? prev.firstName,
        lastName: response.data.data.user?.lastName ?? prev.lastName,
        gradeLevel: nextProfile.grade_level || prev.gradeLevel,
        schoolName: nextProfile.school_name || "",
        section: nextProfile.section || "",
        schoolYear: nextProfile.school_year || prev.schoolYear,
      }));
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          gamification: {
            ...prev.gamification,
            profile: {
              ...prev.gamification.profile,
              ...nextProfile,
            },
          },
        };
      });
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
  if (error && !data) return <Alert severity="error">{error}</Alert>;

  const studentProfile = data.gamification.profile;

  return (
    <>
      <PageHeader
        title="My Profile"
        subtitle="Photo, name, and class details"
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
                bgcolor: "primary.main",
              }}
            >
              {(form.firstName || "S")[0]}
            </Avatar>
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
              <Tooltip title={uploadingAvatar ? "Uploading…" : "Upload photo"}>
                <span>
                  <IconButton
                    color="primary"
                    aria-label="Upload photo"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    <PhotoCameraIcon />
                  </IconButton>
                </span>
              </Tooltip>
              {avatarUrl ? (
                <Tooltip title="Remove photo">
                  <span>
                    <IconButton
                      color="error"
                      aria-label="Remove photo"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                    >
                      <NoPhotographyOutlinedIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                hidden
                onChange={handleAvatarChange}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              PNG, JPG, or WEBP up to 5MB
            </Typography>
            <Typography variant="h5">
              {form.firstName} {form.lastName}
            </Typography>
            <Typography color="text.secondary">
              {user?.username ? `@${user.username}` : null}
              {user?.username && user?.email ? " · " : null}
              {user?.email || (!user?.username ? "No email on file" : null)}
            </Typography>
            <Typography sx={{ mt: 1 }}>
              Grade Level: {studentProfile.grade_level || "—"}
            </Typography>
            <Typography>
              Section: {studentProfile.section || "—"}
            </Typography>
            <Typography>
              School Year:{" "}
              {studentProfile.school_year
                ? `SY ${studentProfile.school_year}`
                : "—"}
            </Typography>
            {studentProfile.school_name ? (
              <Typography>School: {studentProfile.school_name}</Typography>
            ) : null}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }} component="form" onSubmit={handleSave}>
            <Typography variant="h6" gutterBottom>
              Edit Profile
            </Typography>
            {!studentProfile.grade_level ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Please select your grade level to complete your profile.
              </Alert>
            ) : null}
            <Stack spacing={2}>
              <TextField
                label="First name"
                value={form.firstName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, firstName: e.target.value }))
                }
              />
              <TextField
                label="Last name"
                value={form.lastName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lastName: e.target.value }))
                }
              />
              <TextField
                select
                label="Grade Level"
                fullWidth
                value={form.gradeLevel}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    gradeLevel: e.target.value,
                    section: "",
                  }))
                }
                helperText={
                  form.gradeLevel ? undefined : GRADE_LEVEL_PLACEHOLDER
                }
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
                <MenuItem value="">{GRADE_LEVEL_PLACEHOLDER}</MenuItem>
                {GRADE_LEVELS.map((grade) => (
                  <MenuItem key={grade} value={grade}>
                    {grade}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="School Year"
                fullWidth
                value={form.schoolYear}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    schoolYear: e.target.value,
                    section: "",
                  }))
                }
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
                value={form.section}
                onChange={(e) =>
                  setForm((p) => ({ ...p, section: e.target.value }))
                }
                helperText={
                  !form.gradeLevel
                    ? "Select a grade level first"
                    : sectionOptions.length
                      ? "Sections for this grade and school year"
                      : "No sections yet for this grade — ask an admin to add one"
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
                label="School"
                value={form.schoolName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, schoolName: e.target.value }))
                }
              />
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
