import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import ContentTimestamp from "../../components/common/ContentTimestamp";
import quizService from "../../services/quizService";
import { getErrorMessage } from "../../services/api";
import { useAdminFilters } from "../../contexts/AdminFiltersContext";
import useRefreshOnFocus from "../../hooks/useRefreshOnFocus";
import { defaultSchoolYearValue } from "../../utils/schoolYears";

function teacherLabel(row) {
  const name =
    `${row?.teacher_first_name || ""} ${row?.teacher_last_name || ""}`.trim();
  return name || "—";
}

function subjectLabel(row) {
  return (
    row?.course_subject || row?.course_title || `Subject #${row?.course_id}`
  );
}

function isFlagOn(value) {
  return value === true || value === 1 || value === "1";
}

export default function AdminQuizzesPage() {
  const { schoolYear, gradeLevel, toQueryParams } = useAdminFilters();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const requestIdRef = useRef(0);
  const currentSchoolYear = defaultSchoolYearValue();

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestIdRef.current;
      if (!silent) setLoading(true);
      const params = toQueryParams();
      delete params.section;
      try {
        const response = await quizService.listMine(params);
        if (requestId !== requestIdRef.current) return;
        setQuizzes(response.data.data || []);
        setError("");
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (!silent) setError(getErrorMessage(err));
      } finally {
        // Always clear loading for the latest request (avoids stuck spinner
        // when a silent refresh supersedes a visible one).
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [toQueryParams],
  );

  useEffect(() => {
    load();
    return () => {
      requestIdRef.current += 1;
    };
  }, [schoolYear, gradeLevel, load]);

  useRefreshOnFocus(() => load({ silent: true }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      const published = isFlagOn(quiz.is_published);
      const aiGenerated = isFlagOn(quiz.is_ai_generated);
      if (status === "published" && !published) return false;
      if (status === "draft" && published) return false;
      if (source === "ai" && !aiGenerated) return false;
      if (source === "manual" && aiGenerated) return false;
      if (!q) return true;
      const haystack = [quiz.title, subjectLabel(quiz), teacherLabel(quiz)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [quizzes, search, status, source]);

  if (loading && !quizzes.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title="Quizzes"
        subtitle="Platform-wide quiz overview. Read-only — teachers create and edit quizzes in their subjects."
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          label="Search"
          placeholder="Title, subject, or teacher"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
        />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          sx={{ minWidth: { sm: 160 } }}
        >
          <MenuItem value="all">All statuses</MenuItem>
          <MenuItem value="published">Published</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          sx={{ minWidth: { sm: 150 } }}
        >
          <MenuItem value="all">All sources</MenuItem>
          <MenuItem value="ai">AI</MenuItem>
          <MenuItem value="manual">Manual</MenuItem>
        </TextField>
      </Stack>

      <Paper sx={{ p: 2 }}>
        {!quizzes.length ? (
          <Typography color="text.secondary" sx={{ p: 1 }}>
            No quizzes for the selected school year
            {gradeLevel && gradeLevel !== "all" ? ` / ${gradeLevel}` : ""}.
          </Typography>
        ) : !filtered.length ? (
          <Typography color="text.secondary" sx={{ p: 1 }}>
            No quizzes match the current filters.
          </Typography>
        ) : (
          <ResponsiveTableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Teacher</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>School year</TableCell>
                  <TableCell>Questions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((quiz) => (
                  <TableRow key={quiz.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{quiz.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {quiz.xp_reward} XP · Pass {quiz.passing_score}%
                        {quiz.time_limit_minutes
                          ? ` · ${quiz.time_limit_minutes} min`
                          : ""}
                      </Typography>
                    </TableCell>
                    <TableCell>{subjectLabel(quiz)}</TableCell>
                    <TableCell>{teacherLabel(quiz)}</TableCell>
                    <TableCell>{quiz.grade_level || "—"}</TableCell>
                    <TableCell>
                      {quiz.school_year ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`SY ${quiz.school_year}`}
                          color={
                            quiz.school_year === currentSchoolYear
                              ? "primary"
                              : "default"
                          }
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{quiz.question_count || 0}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={isFlagOn(quiz.is_published) ? "success" : "default"}
                        label={
                          isFlagOn(quiz.is_published) ? "Published" : "Draft"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {isFlagOn(quiz.is_ai_generated) ? (
                        <Chip
                          size="small"
                          color="secondary"
                          variant="outlined"
                          label="AI"
                        />
                      ) : (
                        <Chip size="small" variant="outlined" label="Manual" />
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <ContentTimestamp item={quiz} dense sx={{ mt: 0 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        )}
      </Paper>
    </>
  );
}
