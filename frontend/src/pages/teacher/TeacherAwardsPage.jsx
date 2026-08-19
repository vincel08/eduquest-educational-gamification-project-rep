import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import courseService from "../../services/courseService";
import gamificationService from "../../services/gamificationService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";

export default function TeacherAwardsPage() {
  const { toQueryParams, schoolYear, gradeLevel, section } = useTeacherFilters();
  const [badges, setBadges] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ studentId: "", badgeId: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const filterParams = toQueryParams();
        const courseParams = { limit: 50 };
        if (filterParams.gradeLevel) {
          courseParams.gradeLevel = filterParams.gradeLevel;
        }
        const [badgesRes, coursesRes] = await Promise.all([
          gamificationService.badges(),
          courseService.list(courseParams),
        ]);
        setBadges(badgesRes.data.data || []);

        const courses = coursesRes.data.data.courses || [];
        const enrollmentGroups = await Promise.all(
          courses.map((course) =>
            courseService.enrollments(course.id, filterParams),
          ),
        );
        const map = new Map();
        enrollmentGroups.forEach((response) => {
          (response.data.data || []).forEach((student) => {
            map.set(student.student_id, student);
          });
        });
        setStudents(Array.from(map.values()));
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }
    load();
  }, [schoolYear, gradeLevel, section, toQueryParams]);

  async function handleAward(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await gamificationService.awardBadge({
        studentId: Number(form.studentId),
        badgeId: Number(form.badgeId),
      });
      setMessage("Badge awarded successfully");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Award Badges"
        subtitle="Manually recognize outstanding student performance."
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

      <Paper sx={{ p: 3 }}>
        <Stack component="form" spacing={2} onSubmit={handleAward}>
          <TextField
            select
            label="Student"
            value={form.studentId}
            onChange={(e) =>
              setForm((p) => ({ ...p, studentId: e.target.value }))
            }
          >
            {students.map((student) => (
              <MenuItem key={student.student_id} value={student.student_id}>
                {student.first_name} {student.last_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Badge"
            value={form.badgeId}
            onChange={(e) =>
              setForm((p) => ({ ...p, badgeId: e.target.value }))
            }
          >
            {badges.map((badge) => (
              <MenuItem key={badge.id} value={badge.id}>
                {badge.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !form.studentId || !form.badgeId}
          >
            {loading ? "Awarding..." : "Award Badge"}
          </Button>
        </Stack>
        {!students.length ? (
          <Typography sx={{ mt: 2 }} color="text.secondary">
            No enrolled students found yet.
          </Typography>
        ) : null}
      </Paper>
    </>
  );
}
