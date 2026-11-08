import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Collapse,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import EmptyState from "../../components/common/EmptyState";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";
import { formatSectionWithGrade } from "../../utils/classSections";

const PASSING_GRADE = 75;

function formatGrade(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number.toFixed(2);
}

function gradeColor(value) {
  if (value == null || value === "") return "text.secondary";
  return Number(value) < PASSING_GRADE ? "error.main" : "text.primary";
}

function studentLabel(student) {
  const name = `${student.lastName || ""}, ${student.firstName || ""}`
    .replace(/^,\s*|,\s*$/g, "")
    .trim();
  return name || "Student";
}

function classTitle(classRow) {
  const section = classRow.section
    ? formatSectionWithGrade(classRow.section, classRow.gradeLevel)
    : "No section";
  const grade = classRow.gradeLevel || "Grade not set";
  const year = classRow.schoolYear ? `SY ${classRow.schoolYear}` : "School year not set";
  return `${grade} · ${section} · ${year}`;
}

function classKey(classRow) {
  return `${classRow.schoolYear}|${classRow.gradeLevel}|${classRow.section}`;
}

function csvCell(value) {
  let cell = String(value ?? "");
  if (/^[=+@]/.test(cell)) cell = `'${cell}`;
  if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function downloadCsv(filename, rows) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileSlug(value) {
  const slug = String(value || "class")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "class";
}

function gradeFor(student, courseId) {
  return (
    (student?.grades || []).find(
      (grade) => Number(grade?.courseId) === Number(courseId),
    ) || null
  );
}

function summaryRows(classes) {
  const rows = [];
  classes.forEach((classRow, index) => {
    if (index > 0) rows.push([]);
    rows.push(["Summary of Grades"]);
    rows.push(["School Year", classRow.schoolYear || ""]);
    rows.push(["Grade", classRow.gradeLevel || ""]);
    rows.push(["Section", classRow.section || ""]);
    rows.push(["Teacher", classRow.teacherName || ""]);
    rows.push([]);
    rows.push([
      "No.",
      "Student",
      ...(classRow.subjects || []).map((subject) => subject.label),
      "Average",
    ]);
    (classRow.students || []).forEach((student, studentIndex) => {
      rows.push([
        studentIndex + 1,
        studentLabel(student),
        ...(classRow.subjects || []).map((subject) =>
          formatGrade(gradeFor(student, subject.courseId)?.score),
        ),
        formatGrade(student.average),
      ]);
    });
  });
  return rows;
}

function detailRows(classes) {
  const rows = [[
    "School Year",
    "Grade",
    "Section",
    "Student",
    "Subject",
    "Item",
    "Score",
  ]];
  for (const classRow of classes) {
    for (const student of classRow.students || []) {
      const name = studentLabel(student);
      (classRow.subjects || []).forEach((subject) => {
        const grade = gradeFor(student, subject.courseId);
        for (const item of grade?.assessments || []) {
          rows.push([
            classRow.schoolYear || "",
            classRow.gradeLevel || "",
            classRow.section || "",
            name,
            subject.label,
            `${item.type}: ${item.title}`,
            formatGrade(item.score),
          ]);
        }
        rows.push([
          classRow.schoolYear || "",
          classRow.gradeLevel || "",
          classRow.section || "",
          name,
          subject.label,
          "Subject grade",
          formatGrade(grade?.score),
        ]);
      });
      rows.push([
        classRow.schoolYear || "",
        classRow.gradeLevel || "",
        classRow.section || "",
        name,
        "",
        "General average",
        formatGrade(student.average),
      ]);
    }
  }
  return rows;
}

export default function TeacherGradeReportPage() {
  const { toQueryParams, schoolYear, gradeLevel, section } = useTeacherFilters();
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [openStudentKey, setOpenStudentKey] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    courseService
      .gradeSummary(toQueryParams())
      .then((response) => {
        if (!active) return;
        const next = response.data.data?.classes;
        setClasses(Array.isArray(next) ? next : []);
        setOpenStudentKey("");
      })
      .catch((err) => {
        if (!active) return;
        setClasses([]);
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [schoolYear, gradeLevel, section, toQueryParams]);

  const filterHint = useMemo(() => {
    const parts = [];
    if (schoolYear !== "all") parts.push(`SY ${schoolYear}`);
    if (gradeLevel !== "all") parts.push(gradeLevel);
    if (section !== "all") {
      parts.push(
        gradeLevel !== "all"
          ? formatSectionWithGrade(section, gradeLevel)
          : `Section ${section}`,
      );
    }
    return parts.length ? parts.join(" · ") : "All of your classes";
  }, [schoolYear, gradeLevel, section]);

  function exportSummary() {
    const slug = classes.length === 1
      ? fileSlug(`${classes[0].gradeLevel}-${classes[0].section}-${classes[0].schoolYear}`)
      : "all-classes";
    downloadCsv(`summary-of-grades-${slug}.csv`, summaryRows(classes));
  }

  function exportDetails() {
    const slug = classes.length === 1
      ? fileSlug(`${classes[0].gradeLevel}-${classes[0].section}-${classes[0].schoolYear}`)
      : "all-classes";
    downloadCsv(`student-grades-${slug}.csv`, detailRows(classes));
  }

  if (loading) return <LoadingScreen label="Loading grade reports..." />;

  return (
    <PageContainer>
      <PageHeader
        title="Summary of Grades"
        subtitle={`Released quiz and game scores, averaged per subject. Blank subjects are not included in the average. Scores below ${PASSING_GRADE} are highlighted. ${filterHint}`}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={exportSummary}
              disabled={!classes.length}
            >
              Export summary
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={exportDetails}
              disabled={!classes.length}
            >
              Export student grades
            </Button>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {!error && !classes.length ? (
        <EmptyState
          title="No class grades yet"
          description="Students appear here after they enroll in your subjects. Released quiz and game scores fill in each subject grade. Use the sidebar filters to pick a class."
          actionLabel="My Subjects"
          to="/teacher/courses"
        />
      ) : (
        <Stack spacing={2.5}>
          {classes.map((classRow) => (
            <Paper key={classKey(classRow)} sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="h6" fontWeight={800}>
                  {classTitle(classRow)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(classRow.students || []).length} student{(classRow.students || []).length === 1 ? "" : "s"}
                  {classRow.teacherName ? ` · ${classRow.teacherName}` : ""}
                </Typography>
              </Box>
              <ResponsiveTableContainer>
                <Table size="small" sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, width: 56 }}>No.</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 180 }}>Student</TableCell>
                      {(classRow.subjects || []).map((subject) => (
                        <TableCell
                          key={subject.courseId}
                          align="right"
                          sx={{ fontWeight: 800, minWidth: 110 }}
                        >
                          {subject.label}
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 800, minWidth: 100 }}>
                        Average
                      </TableCell>
                      <TableCell sx={{ width: 88 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(classRow.students || []).map((student, index) => {
                      const rowKey = `${classKey(classRow)}|${student.studentId}`;
                      const open = openStudentKey === rowKey;
                      return (
                        <Fragment key={rowKey}>
                          <TableRow hover>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <Typography fontWeight={700}>{studentLabel(student)}</Typography>
                            </TableCell>
                            {(classRow.subjects || []).map((subject) => {
                              const grade = gradeFor(student, subject.courseId);
                              return (
                                <TableCell
                                  key={subject.courseId}
                                  align="right"
                                  sx={{ color: gradeColor(grade?.score), fontWeight: 700 }}
                                >
                                  {formatGrade(grade?.score) || "—"}
                                </TableCell>
                              );
                            })}
                            <TableCell
                              align="right"
                              sx={{ color: gradeColor(student.average), fontWeight: 800 }}
                            >
                              {formatGrade(student.average) || "—"}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                onClick={() => setOpenStudentKey(open ? "" : rowKey)}
                                endIcon={open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              >
                                {open ? "Hide" : "Details"}
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow key={`${rowKey}-details`}>
                            <TableCell
                              colSpan={(classRow.subjects || []).length + 4}
                              sx={{ py: 0, borderBottom: open ? undefined : 0 }}
                            >
                              <Collapse in={open} timeout="auto" unmountOnExit>
                                <Box sx={{ py: 1.5 }}>
                                  <StudentDetail student={student} subjects={classRow.subjects} />
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </ResponsiveTableContainer>
            </Paper>
          ))}
        </Stack>
      )}
    </PageContainer>
  );
}

function StudentDetail({ student, subjects }) {
  const rows = [];
  (subjects || []).forEach((subject) => {
    const grade = gradeFor(student, subject.courseId);
    const assessments = grade?.assessments || [];
    if (!assessments.length) {
      rows.push({
        key: `${subject.courseId}-empty`,
        subject: subject.label,
        item: "No released scores",
        score: null,
      });
      return;
    }
    assessments.forEach((item) => {
      rows.push({
        key: `${subject.courseId}-${item.type}-${item.id}`,
        subject: subject.label,
        item: `${item.type}: ${item.title}`,
        score: item.score,
      });
    });
    rows.push({
      key: `${subject.courseId}-grade`,
      subject: subject.label,
      item: "Subject grade",
      score: grade.score,
      emphasis: true,
    });
  });

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 800 }}>Subject</TableCell>
          <TableCell sx={{ fontWeight: 800 }}>Item</TableCell>
          <TableCell align="right" sx={{ fontWeight: 800 }}>Score</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>{row.subject}</TableCell>
            <TableCell sx={{ fontWeight: row.emphasis ? 800 : 500 }}>{row.item}</TableCell>
            <TableCell
              align="right"
              sx={{ color: gradeColor(row.score), fontWeight: row.emphasis ? 800 : 600 }}
            >
              {formatGrade(row.score) || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
