import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import StyleIcon from "@mui/icons-material/Style";
import GridViewIcon from "@mui/icons-material/GridView";
import GridOnIcon from "@mui/icons-material/GridOn";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import LockIcon from "@mui/icons-material/Lock";
import ExploreIcon from "@mui/icons-material/Explore";
import ExtensionIcon from "@mui/icons-material/Extension";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import AiGeneratedReviewPanel from "../../components/ai-review/AiGeneratedReviewPanel";
import courseService from "../../services/courseService";
import aiReviewService from "../../services/aiReviewService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";

const GAME_TYPE_OPTIONS = [
  {
    value: "auto",
    label: "Auto Select",
    icon: <AutoAwesomeIcon />,
    color: "#6366F1",
  },
  {
    value: "flashcards",
    label: "Flashcards",
    icon: <StyleIcon />,
    color: "#3B82F6",
  },
  {
    value: "memory_match",
    label: "Memory Match",
    icon: <GridViewIcon />,
    color: "#8B5CF6",
  },
  {
    value: "crossword",
    label: "Crossword",
    icon: <GridOnIcon />,
    color: "#10B981",
  },
  {
    value: "word_search",
    label: "Word Search",
    icon: <ManageSearchIcon />,
    color: "#F59E0B",
  },
  {
    value: "quiz_show",
    label: "Quiz Show",
    icon: <LiveTvIcon />,
    color: "#EF4444",
  },
  {
    value: "jeopardy",
    label: "Jeopardy",
    icon: <ViewColumnIcon />,
    color: "#7C3AED",
  },
  {
    value: "drag_drop",
    label: "Drag and Drop",
    icon: <DragIndicatorIcon />,
    color: "#0EA5E9",
  },
  {
    value: "spin_wheel",
    label: "Spin Wheel",
    icon: <DonutLargeIcon />,
    color: "#F97316",
  },
  {
    value: "millionaire",
    label: "Millionaire",
    icon: <MonetizationOnIcon />,
    color: "#FACC15",
  },
  {
    value: "escape_room",
    label: "Escape Room",
    icon: <LockIcon />,
    color: "#64748B",
  },
  {
    value: "mission_adventure",
    label: "Mission Adventure",
    icon: <ExploreIcon />,
    color: "#22C55E",
  },
  {
    value: "puzzle_challenge",
    label: "Puzzle Challenge",
    icon: <ExtensionIcon />,
    color: "#EC4899",
  },
];

export default function TeacherAiGamePage() {
  const navigate = useNavigate();
  const { schoolYear, gradeLevel } = useTeacherFilters();
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [form, setForm] = useState({
    courseId: "",
    lessonId: "",
    topic: "",
    lessonContent: "",
    gameType: "auto",
  });
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const generateInFlight = useRef(false);

  useEffect(() => {
    const params = { limit: 50 };
    if (schoolYear && schoolYear !== "all") params.schoolYear = schoolYear;
    if (gradeLevel && gradeLevel !== "all") params.gradeLevel = gradeLevel;

    courseService
      .list(params)
      .then((response) => {
        const list = response.data.data.courses || [];
        setCourses(list);
        setForm((prev) => {
          const stillValid = list.some(
            (course) => String(course.id) === String(prev.courseId),
          );
          if (stillValid) return prev;
          return {
            ...prev,
            courseId: list[0] ? String(list[0].id) : "",
            lessonId: "",
          };
        });
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [schoolYear, gradeLevel]);

  useEffect(() => {
    if (!form.courseId) {
      setLessons([]);
      return;
    }

    courseService
      .lessons(form.courseId)
      .then((response) => {
        const list = response.data.data || [];
        setLessons(list);
        setForm((prev) => ({
          ...prev,
          lessonId: "",
        }));
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [form.courseId]);

  async function handleGenerate(event) {
    event.preventDefault();
    if (generateInFlight.current) return;
    generateInFlight.current = true;
    setLoading(true);
    setError("");
    setMessage("");
    setDraft(null);

    try {
      const response = await aiReviewService.createFromGame({
        courseId: Number(form.courseId),
        lessonId: form.lessonId ? Number(form.lessonId) : null,
        topic: form.topic.trim() || undefined,
        lessonContent:
          form.lessonContent.trim() || form.topic.trim() || undefined,
        gameType: form.gameType,
        requestId:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      });
      const data = response.data.data;
      if (data.source === "fallback") {
        setDraft(null);
        setError(
          data.warning ||
            "AI generation failed. Please configure GEMINI_API_KEY and try again.",
        );
        return;
      }
      if (!data.draft?.game) {
        setDraft(null);
        setError(
          "AI did not return a playable game. Try again or pick a different game type.",
        );
        return;
      }
      setDraft(data.draft);
      setMessage(
        data.warning ||
          "Game generated. Review and edit below before publishing.",
      );
    } catch (err) {
      setDraft(null);
      setError(getErrorMessage(err));
    } finally {
      generateInFlight.current = false;
      setLoading(false);
    }
  }

  const freeText = `${form.topic} ${form.lessonContent}`.trim();
  const canGenerate =
    Boolean(form.courseId) && (Boolean(form.lessonId) || freeText.length >= 3);

  return (
    <PageContainer>
      <PageHeader
        title="AI Game Generator"
        subtitle="Choose a game template, paste lesson text or link a lesson, then review and publish as a game (not a quiz)."
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

      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
        Game templates
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {GAME_TYPE_OPTIONS.map((option) => {
          const selected = form.gameType === option.value;
          return (
            <Grid key={option.value} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  borderColor: selected ? "secondary.main" : "divider",
                  borderWidth: selected ? 2 : 1,
                  bgcolor: selected
                    ? "rgba(139,92,246,0.06)"
                    : "background.paper",
                }}
              >
                <CardActionArea
                  onClick={() =>
                    setForm((prev) => ({ ...prev, gameType: option.value }))
                  }
                  sx={{ height: "100%" }}
                >
                  <CardContent sx={{ textAlign: "center", py: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        mx: "auto",
                        mb: 1,
                        borderRadius: 2.5,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: option.color,
                        color:
                          option.value === "millionaire" ? "#1E293B" : "#fff",
                      }}
                    >
                      {option.icon}
                    </Box>
                    <Typography variant="body2" fontWeight={800}>
                      {option.label}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack component="form" spacing={2} onSubmit={handleGenerate}>
          <TextField
            select
            label="Subject"
            value={form.courseId}
            onChange={(e) =>
              setForm((p) => ({ ...p, courseId: e.target.value, lessonId: "" }))
            }
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={String(course.id)}>
                {course.subject || course.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Topic"
            value={form.topic}
            onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
            placeholder="e.g. Fractions"
            helperText="Optional short title. You can generate from topic alone."
          />

          <TextField
            label="Lesson text"
            value={form.lessonContent}
            onChange={(e) =>
              setForm((p) => ({ ...p, lessonContent: e.target.value }))
            }
            multiline
            minRows={6}
            maxRows={14}
            placeholder="Paste lesson content used to generate the game…"
            helperText="Optional. Topic, lesson text, or a linked lesson — at least one is required."
          />

          <TextField
            select
            label="Link to lesson"
            value={form.lessonId}
            onChange={(e) =>
              setForm((p) => ({ ...p, lessonId: e.target.value }))
            }
            helperText={
              !lessons.length
                ? "No lessons in this subject yet — use topic or lesson text above."
                : "Optional. Links generation to an existing lesson."
            }
          >
            <MenuItem value="">None</MenuItem>
            {lessons.map((lesson) => (
              <MenuItem key={lesson.id} value={String(lesson.id)}>
                {lesson.title}
              </MenuItem>
            ))}
          </TextField>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !canGenerate}
          >
            {loading ? "Generating… this can take a few minutes" : "Generate Game"}
          </Button>
          {!canGenerate ? (
            <Typography variant="caption" color="text.secondary">
              Enter a topic or lesson text, or link a lesson, to enable
              Generate.
            </Typography>
          ) : null}
        </Stack>
      </Paper>

      {draft ? (
        <AiGeneratedReviewPanel
          key={draft.id}
          initialDraft={draft}
          mode="game"
          onCleared={() => {
            setDraft(null);
            setMessage("");
          }}
          onPublished={(payload) => {
            setDraft(null);
            const id = payload?.game?.id || payload?.gameId;
            if (id) {
              navigate(`/teacher/games/${id}/edit`);
            } else {
              setMessage(
                "Published. Open Games from the sidebar to revisit it.",
              );
            }
          }}
        />
      ) : null}
    </PageContainer>
  );
}
