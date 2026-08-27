import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
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
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import ResponsiveTableContainer from "../../components/common/ResponsiveTableContainer";
import ReuseContentDialog from "../../components/teacher/ReuseContentDialog";
import quizService from "../../services/quizService";
import courseService from "../../services/courseService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";
import {
  defaultSchoolYearValue,
  listSchoolYearOptions,
} from "../../utils/schoolYears";

export default function TeacherQuizzesPage() {
  const navigate = useNavigate();
  const { gradeLevel } = useTeacherFilters();
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bankSchoolYear, setBankSchoolYear] = useState("all");
  const [reuseItem, setReuseItem] = useState(null);
  const [reuseLoading, setReuseLoading] = useState(false);
  const [reuseError, setReuseError] = useState("");

  const bankYearOptions = useMemo(
    () => listSchoolYearOptions({ includeAll: true }),
    [],
  );
  const currentSchoolYear = useMemo(() => defaultSchoolYearValue(), []);

  useEffect(() => {
    setLoading(true);
    const params = { schoolYear: bankSchoolYear };
    if (gradeLevel && gradeLevel !== "all") {
      params.gradeLevel = gradeLevel;
    }
    Promise.all([
      quizService.listMine(params),
      courseService.list({ limit: 200 }),
    ])
      .then(([quizRes, courseRes]) => {
        setQuizzes(quizRes.data.data || []);
        const list =
          courseRes.data.data?.courses || courseRes.data.data || [];
        setCourses(Array.isArray(list) ? list : []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [gradeLevel, bankSchoolYear]);

  const targetCourses = useMemo(() => {
    const sorted = [...courses].sort((a, b) => {
      const aCurrent = a.school_year === currentSchoolYear ? 0 : 1;
      const bCurrent = b.school_year === currentSchoolYear ? 0 : 1;
      if (aCurrent !== bCurrent) return aCurrent - bCurrent;
      return String(a.subject || a.title || "").localeCompare(
        String(b.subject || b.title || ""),
      );
    });
    return sorted;
  }, [courses, currentSchoolYear]);

  async function handleReuse({ courseId, title }) {
    if (!reuseItem) return;
    setReuseLoading(true);
    setReuseError("");
    try {
      const response = await quizService.copy(reuseItem.id, {
        courseId,
        title,
      });
      const created = response.data.data;
      setReuseItem(null);
      navigate(`/teacher/quizzes/${created.id}/edit`);
    } catch (err) {
      setReuseError(getErrorMessage(err));
    } finally {
      setReuseLoading(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="My Quizzes"
        subtitle="Quiz bank across school years — reuse a past quiz into the current subject as a new draft."
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              component={RouterLink}
              to="/teacher/ai-quiz"
              variant="outlined"
            >
              AI Quiz Generator
            </Button>
            <Button
              component={RouterLink}
              to="/teacher/quizzes/new"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Create Quiz
            </Button>
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          select
          size="small"
          label="Bank school year"
          value={bankSchoolYear}
          onChange={(event) => setBankSchoolYear(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          {bankYearOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper sx={{ p: 2 }}>
        {!quizzes.length ? (
          <Stack spacing={2} alignItems="flex-start" sx={{ p: 2 }}>
            <Typography color="text.secondary">
              No quizzes in this bank view. Create one, or switch school year to
              All school years.
            </Typography>
            <Button
              component={RouterLink}
              to="/teacher/quizzes/new"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Create Quiz
            </Button>
          </Stack>
        ) : (
          <ResponsiveTableContainer>
            <Table size="small" sx={{ minWidth: 780 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>School year</TableCell>
                  <TableCell>Questions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quizzes.map((quiz) => (
                  <TableRow key={quiz.id} hover>
                    <TableCell>
                      <Typography fontWeight={700}>{quiz.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {quiz.xp_reward} XP · Pass {quiz.passing_score}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {quiz.course_title || `Subject #${quiz.course_id}`}
                    </TableCell>
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
                        color={quiz.is_published ? "success" : "default"}
                        label={quiz.is_published ? "Published" : "Draft"}
                      />
                    </TableCell>
                    <TableCell>
                      {quiz.is_ai_generated ? (
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
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Button
                          size="small"
                          startIcon={<ContentCopyIcon />}
                          disabled={!Number(quiz.question_count)}
                          onClick={() => {
                            setReuseError("");
                            setReuseItem(quiz);
                          }}
                        >
                          Reuse
                        </Button>
                        <Button
                          component={RouterLink}
                          to={`/teacher/quizzes/${quiz.id}/edit`}
                          size="small"
                        >
                          Open
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        )}
      </Paper>

      <ReuseContentDialog
        open={Boolean(reuseItem)}
        onClose={() => {
          if (reuseLoading) return;
          setReuseItem(null);
          setReuseError("");
        }}
        onConfirm={handleReuse}
        itemTitle={reuseItem?.title || ""}
        itemSubtitle={
          reuseItem
            ? `${reuseItem.course_title || `Subject #${reuseItem.course_id}`}${
                reuseItem.school_year ? ` · SY ${reuseItem.school_year}` : ""
              } · ${reuseItem.question_count || 0} questions`
            : ""
        }
        courses={targetCourses}
        loading={reuseLoading}
        error={reuseError}
        contentLabel="quiz"
      />
    </Stack>
  );
}
