import { useEffect, useState } from "react";
import { Alert, Button, Chip, Stack } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import PublishIcon from "@mui/icons-material/Publish";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PageContainer from "../../components/common/PageContainer";
import LoadingScreen from "../../components/common/LoadingScreen";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import ManualQuizEditor from "../../components/quiz/ManualQuizEditor";
import QuizPreviewDialog from "../../components/quiz/QuizPreviewDialog";
import courseService from "../../services/courseService";
import quizService from "../../services/quizService";
import { getErrorMessage } from "../../services/api";
import { useTeacherFilters } from "../../contexts/TeacherFiltersContext";
import {
  blankQuestion,
  editorQuestionToPayload,
  mapApiQuestionToEditor,
  validateEditorQuiz,
} from "../../utils/manualQuizHelpers";

const emptyForm = {
  title: "",
  description: "",
  courseId: "",
  lessonId: "",
  difficulty: "medium",
  passingScore: 70,
  timeLimitMinutes: 15,
  xpReward: 50,
  dueAt: "",
};

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TeacherQuizEditorPage() {
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !quizId || quizId === "new";
  const { schoolYear, gradeLevel } = useTeacherFilters();

  const [form, setForm] = useState(emptyForm);
  const [questions, setQuestions] = useState([
    blankQuestion("multiple_choice"),
  ]);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [savedQuizId, setSavedQuizId] = useState(isNew ? null : Number(quizId));
  const [publishOpen, setPublishOpen] = useState(false);

  useEffect(() => {
    const params = { limit: 100 };
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
          // Editing an existing quiz: keep its course even if outside current filters.
          if (!isNew && prev.courseId) return prev;

          const presetCourseId = searchParams.get("courseId");
          if (
            isNew
            && presetCourseId
            && list.some((course) => String(course.id) === String(presetCourseId))
          ) {
            return { ...prev, courseId: String(presetCourseId), lessonId: "" };
          }

          return {
            ...prev,
            courseId: list[0] ? String(list[0].id) : "",
            lessonId: "",
          };
        });
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [isNew, searchParams, schoolYear, gradeLevel]);

  useEffect(() => {
    if (!form.courseId) {
      setLessons([]);
      return;
    }
    courseService
      .lessons(form.courseId)
      .then((response) => setLessons(response.data.data || []))
      .catch((err) => setError(getErrorMessage(err)));
  }, [form.courseId]);

  // Keep the quiz's subject selectable when editing outside current sidebar filters.
  useEffect(() => {
    if (isNew || !form.courseId) return undefined;
    const exists = courses.some(
      (course) => String(course.id) === String(form.courseId),
    );
    if (exists) return undefined;

    let active = true;
    courseService
      .getById(form.courseId)
      .then((response) => {
        if (!active) return;
        const course = response.data.data;
        if (!course) return;
        setCourses((prev) => {
          if (prev.some((item) => String(item.id) === String(course.id))) {
            return prev;
          }
          return [course, ...prev];
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isNew, form.courseId, courses]);

  useEffect(() => {
    if (isNew) return undefined;
    let active = true;
    setLoading(true);
    quizService
      .getById(quizId)
      .then((response) => {
        if (!active) return;
        const quiz = response.data.data;
        setSavedQuizId(quiz.id);
        setForm({
          title: quiz.title || "",
          description: quiz.description || "",
          courseId: String(quiz.course_id),
          lessonId: quiz.lesson_id ? String(quiz.lesson_id) : "",
          difficulty: "medium",
          passingScore: quiz.passing_score || 70,
          timeLimitMinutes: quiz.time_limit_minutes || 15,
          xpReward: quiz.xp_reward || 50,
          dueAt: toDatetimeLocalValue(quiz.due_at),
        });
        const mapped = (quiz.questions || []).map(mapApiQuestionToEditor);
        setQuestions(
          mapped.length ? mapped : [blankQuestion("multiple_choice")],
        );
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isNew, quizId]);

  function buildMetaPayload() {
    const payload = {
      lessonId: form.lessonId ? Number(form.lessonId) : null,
      title: String(form.title || "").trim(),
      description: form.description || null,
      passingScore: Number(form.passingScore) || 70,
      timeLimitMinutes: Number(form.timeLimitMinutes) || null,
      xpReward: Number(form.xpReward) || 50,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      questions: questions.map(editorQuestionToPayload),
    };

    // Course is set only on create. Never force isPublished:false on update
    // (that would unpublish an already-live quiz when saving a draft edit).
    if (!savedQuizId) {
      payload.courseId = Number(form.courseId);
      payload.isPublished = false;
    }

    return payload;
  }

  async function uploadPendingImages(quiz) {
    const savedQuestions = quiz.questions || [];
    for (let i = 0; i < questions.length; i += 1) {
      const local = questions[i];
      const saved = savedQuestions[i];
      if (
        local?.questionType === "image_question" &&
        local.imageFile &&
        saved?.id
      ) {
        await quizService.attachImage(saved.id, local.imageFile);
      }
    }
  }

  async function saveDraft() {
    setError("");
    setMessage("");
    const validationErrors = validateEditorQuiz(form, questions);
    if (validationErrors.length) {
      setError(validationErrors[0]);
      return null;
    }

    setSaving(true);
    try {
      const payload = buildMetaPayload();
      let response;
      if (savedQuizId) {
        response = await quizService.update(savedQuizId, payload);
      } else {
        response = await quizService.create(payload);
      }
      const quiz = response.data.data;
      setSavedQuizId(quiz.id);
      await uploadPendingImages(quiz);

      const refreshed = await quizService.getById(quiz.id);
      const fresh = refreshed.data.data;
      setQuestions((fresh.questions || []).map(mapApiQuestionToEditor));
      setMessage("Draft saved. Students cannot see unpublished quizzes.");
      if (isNew) {
        navigate(`/teacher/quizzes/${quiz.id}/edit`, { replace: true });
      }
      return fresh;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    const quiz = await saveDraft();
    if (!quiz) return;
    try {
      const response = await quizService.preview(quiz.id);
      setPreviewQuiz(response.data.data);
      setPreviewOpen(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handlePublish() {
    setError("");
    setMessage("");
    const quiz = await saveDraft();
    if (!quiz) return;

    setSaving(true);
    try {
      await quizService.publish(quiz.id);
      setMessage("Quiz published. Enrolled students can now take it.");
      navigate("/teacher/quizzes");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <PageContainer>
      <Stack spacing={3}>
        <PageHeader
          title={isNew ? "Create Quiz" : "Edit Quiz"}
          subtitle="Manual quiz creation works even when AI is unavailable. Published quizzes use the same student scoring, XP, badges, and medals as AI quizzes."
          action={
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ sm: "center" }}
            >
              <Chip
                label={isNew || !savedQuizId ? "Draft" : "Editing"}
                sx={{ bgcolor: "rgba(255,255,255,0.92)", fontWeight: 800 }}
              />
              <Chip
                label={`${questions.length} question${questions.length === 1 ? "" : "s"}`}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontWeight: 800,
                }}
              />
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                disabled={saving}
                onClick={saveDraft}
              >
                Save Draft
              </Button>
              <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                disabled={saving}
                onClick={handlePreview}
              >
                Preview
              </Button>
              <Button
                variant="contained"
                startIcon={<PublishIcon />}
                disabled={saving}
                onClick={() => setPublishOpen(true)}
                sx={{
                  bgcolor: "#FACC15",
                  color: "#1E293B",
                  "&:hover": { bgcolor: "#FDE047" },
                }}
              >
                Publish
              </Button>
            </Stack>
          }
        />

        {error ? <Alert severity="error">{error}</Alert> : null}
        {message ? <Alert severity="success">{message}</Alert> : null}

        <ManualQuizEditor
          form={form}
          setForm={setForm}
          questions={questions}
          setQuestions={setQuestions}
          courses={courses}
          lessons={lessons}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          courseLocked={Boolean(savedQuizId)}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="flex-end"
        >
          <Button
            variant="outlined"
            disabled={saving}
            onClick={saveDraft}
            startIcon={<SaveIcon />}
          >
            Save Draft
          </Button>
          <Button
            variant="outlined"
            disabled={saving}
            onClick={handlePreview}
            startIcon={<VisibilityIcon />}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => setPublishOpen(true)}
            startIcon={<PublishIcon />}
          >
            Publish
          </Button>
        </Stack>

        <QuizPreviewDialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          quiz={previewQuiz}
        />

        <ConfirmDialog
          open={publishOpen}
          title="Publish this quiz?"
          description={
            <>
              <strong>{form.title.trim() || "This quiz"}</strong> will become
              available to enrolled students.
            </>
          }
          details="Your latest draft is saved first, then published. Students can take it and earn XP once it’s live."
          cancelLabel="Keep editing"
          confirmLabel="Publish quiz"
          loading={saving}
          loadingLabel="Publishing…"
          onClose={() => setPublishOpen(false)}
          onConfirm={async () => {
            setPublishOpen(false);
            await handlePublish();
          }}
        />
      </Stack>
    </PageContainer>
  );
}
