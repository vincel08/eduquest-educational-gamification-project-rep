import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import EmptyState from "../../components/common/EmptyState";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";

function SubjectsCell({ student }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const count = student.subjects.length;
  const avgProgress = count
    ? Math.round(
        student.subjects.reduce((sum, item) => sum + item.progress, 0) / count,
      )
    : 0;

  if (!count) {
    return (
      <Typography variant="body2" color="text.secondary">
        No subjects
      </Typography>
    );
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        endIcon={<ExpandMoreIcon />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ textTransform: "none", fontWeight: 700 }}
      >
        {count} subject{count === 1 ? "" : "s"} · avg {avgProgress}%
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: { sx: { minWidth: 240, maxHeight: 320 } },
        }}
      >
        {student.subjects.map((subject) => (
          <MenuItem
            key={`${student.studentId}-${subject.id}`}
            component={RouterLink}
            to={`/teacher/courses/${subject.id}`}
            onClick={() => setAnchorEl(null)}
          >
            <ListItemText
              primary={subject.title}
              secondary={`${subject.progress}% lesson progress`}
              primaryTypographyProps={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              label={`${subject.progress}%`}
              color={subject.progress >= 70 ? "success" : "default"}
              sx={{ ml: 1, fontWeight: 700 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function TeacherStudentsPage() {
  const { toQueryParams, schoolYear, gradeLevel, section } = useTeacherFilters();
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const filterParams = toQueryParams();
        const courseParams = { limit: 100 };
        if (filterParams.gradeLevel) courseParams.gradeLevel = filterParams.gradeLevel;
        if (filterParams.schoolYear) courseParams.schoolYear = filterParams.schoolYear;

        const coursesRes = await courseService.list(courseParams);
        const courses = coursesRes.data.data.courses || [];

        const enrollmentGroups = await Promise.all(
          courses.map(async (course) => {
            const response = await courseService.enrollments(course.id, filterParams);
            return {
              course,
              enrollments: response.data.data || [],
            };
          }),
        );

        const map = new Map();
        enrollmentGroups.forEach(({ course, enrollments }) => {
          enrollments.forEach((row) => {
            const id = row.student_id;
            const existing = map.get(id);
            const subjectTitle = course.subject || course.title || "Subject";
            if (!existing) {
              map.set(id, {
                studentId: id,
                firstName: row.first_name,
                lastName: row.last_name,
                username: row.username,
                email: row.email,
                gradeLevel: row.grade_level,
                section: row.section,
                schoolYear: row.school_year,
                level: row.level || 1,
                xp: row.xp || 0,
                subjects: [
                  {
                    id: course.id,
                    title: subjectTitle,
                    progress: Number(row.progress_percent) || 0,
                  },
                ],
              });
              return;
            }
            existing.subjects.push({
              id: course.id,
              title: subjectTitle,
              progress: Number(row.progress_percent) || 0,
            });
          });
        });

        const list = Array.from(map.values()).sort((a, b) => {
          const last = String(a.lastName || "").localeCompare(
            String(b.lastName || ""),
          );
          if (last !== 0) return last;
          return String(a.firstName || "").localeCompare(
            String(b.firstName || ""),
          );
        });

        if (active) setStudents(list);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [schoolYear, gradeLevel, section, toQueryParams]);

  const filterHint = useMemo(() => {
    const parts = [];
    if (schoolYear !== "all") parts.push(`SY ${schoolYear}`);
    if (gradeLevel !== "all") parts.push(gradeLevel);
    if (section !== "all") parts.push(`Section ${section}`);
    return parts.length
      ? parts.join(" · ")
      : "All school years, grades, and sections";
  }, [schoolYear, gradeLevel, section]);

  if (loading) return <LoadingScreen label="Loading students..." />;

  return (
    <PageContainer>
      <PageHeader
        title="My Students"
        subtitle={`Enrolled learners across your subjects · ${filterHint}`}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {!students.length ? (
        <EmptyState
          title="No students yet"
          description="Students appear here after they enroll in your subjects. Adjust sidebar filters if you expected to see someone."
          actionLabel="My Subjects"
          to="/teacher/courses"
        />
      ) : (
        <Paper>
          <ResponsiveTableContainer>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Level / XP</TableCell>
                  <TableCell>Subjects</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => {
                  const avgProgress = student.subjects.length
                    ? Math.round(
                        student.subjects.reduce(
                          (sum, item) => sum + item.progress,
                          0,
                        ) / student.subjects.length,
                      )
                    : 0;
                  return (
                    <TableRow key={student.studentId} hover>
                      <TableCell>
                        <Typography fontWeight={800}>
                          {student.lastName}, {student.firstName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.username || student.email || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" fontWeight={700}>
                            {student.gradeLevel || "—"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.schoolYear
                              ? `SY ${student.schoolYear}`
                              : "No school year"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {student.section || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          Level {student.level}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.xp} XP · ~{avgProgress}% progress
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <SubjectsCell student={student} />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          component={RouterLink}
                          to={`/teacher/courses/${student.subjects[0].id}/scores`}
                          size="small"
                          variant="outlined"
                        >
                          Scores
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        </Paper>
      )}
    </PageContainer>
  );
}
