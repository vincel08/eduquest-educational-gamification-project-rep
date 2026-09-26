import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { Link as RouterLink } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import EmptyState from "../../components/common/EmptyState";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";

function compareNames(a, b) {
  const last = String(a.lastName || "").localeCompare(String(b.lastName || ""));
  if (last !== 0) return last;
  return String(a.firstName || "").localeCompare(String(b.firstName || ""));
}

function averageProgress(students) {
  if (!students.length) return 0;
  const total = students.reduce((sum, student) => sum + student.progress, 0);
  return Math.round(total / students.length);
}

export default function TeacherStudentsPage() {
  const { toQueryParams, schoolYear, gradeLevel, section } = useTeacherFilters();
  const [groups, setGroups] = useState([]);
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

        const nextGroups = enrollmentGroups
          .map(({ course, enrollments }) => {
            const students = enrollments
              .map((row) => ({
                studentId: row.student_id,
                firstName: row.first_name,
                lastName: row.last_name,
                username: row.username,
                email: row.email,
                gradeLevel: row.grade_level,
                section: row.section,
                schoolYear: row.school_year,
                level: row.level || 1,
                xp: row.xp || 0,
                progress: Number(row.progress_percent) || 0,
              }))
              .sort(compareNames);

            return {
              id: course.id,
              title: course.subject || course.title || "Subject",
              gradeLevel: course.grade_level || "",
              schoolYear: course.school_year || "",
              students,
            };
          })
          .filter((group) => group.students.length)
          .sort((a, b) => {
            const title = String(a.title).localeCompare(String(b.title));
            if (title !== 0) return title;
            return String(a.gradeLevel).localeCompare(String(b.gradeLevel));
          });

        if (active) setGroups(nextGroups);
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

  const studentCount = useMemo(() => {
    const ids = new Set();
    groups.forEach((group) => {
      group.students.forEach((student) => ids.add(student.studentId));
    });
    return ids.size;
  }, [groups]);

  if (loading) return <LoadingScreen label="Loading students..." />;

  return (
    <PageContainer>
      <PageHeader
        title="My Students"
        subtitle={`Grouped by subject · ${studentCount} student${studentCount === 1 ? "" : "s"} · ${filterHint}`}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {!groups.length ? (
        <EmptyState
          title="No students yet"
          description="Students appear here after they enroll in your subjects. Adjust sidebar filters if you expected to see someone."
          actionLabel="My Subjects"
          to="/teacher/courses"
        />
      ) : (
        <Stack spacing={2.5}>
          {groups.map((group) => {
            const progress = averageProgress(group.students);
            const meta = [
              group.gradeLevel,
              group.schoolYear ? `SY ${group.schoolYear}` : "",
              `${group.students.length} student${group.students.length === 1 ? "" : "s"}`,
              `${progress}% average lesson progress`,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <Paper key={group.id} sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                  sx={{ mb: 1.5 }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MenuBookIcon color="primary" />
                      <Typography variant="h6" fontWeight={900}>
                        {group.title}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {meta}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={RouterLink}
                      to={`/teacher/courses/${group.id}`}
                      size="small"
                      variant="outlined"
                    >
                      Open subject
                    </Button>
                    <Button
                      component={RouterLink}
                      to={`/teacher/courses/${group.id}/scores`}
                      size="small"
                      variant="contained"
                    >
                      Class scores
                    </Button>
                  </Stack>
                </Stack>
                <ResponsiveTableContainer>
                  <Table size="small" sx={{ minWidth: 640 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Grade</TableCell>
                        <TableCell>Section</TableCell>
                        <TableCell>Level / XP</TableCell>
                        <TableCell>Lesson progress</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.students.map((student) => (
                        <TableRow key={`${group.id}-${student.studentId}`} hover>
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
                              {student.xp} XP
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={`${student.progress}%`}
                              color={student.progress >= 70 ? "success" : "default"}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTableContainer>
              </Paper>
            );
          })}
        </Stack>
      )}
    </PageContainer>
  );
}
