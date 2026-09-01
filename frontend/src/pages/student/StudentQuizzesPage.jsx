import { useEffect, useMemo, useState } from "react";
import { Alert, Grid } from "@mui/material";
import QuizIcon from "@mui/icons-material/Quiz";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import QuestCard from "../../components/common/QuestCard";
import EmptyState from "../../components/common/EmptyState";
import ContentTimestampToolbar from "../../components/common/ContentTimestampToolbar";
import courseService from "../../services/courseService";
import quizService from "../../services/quizService";
import { getErrorMessage } from "../../services/api";
import { applyTimestampControls } from "../../utils/contentTimestamps";

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const enrolledRes = await courseService.myCourses();
        const courses = enrolledRes.data.data || [];
        const quizGroups = await Promise.all(
          courses.map(async (course) => {
            const response = await courseService.quizzes(course.id);
            return (response.data.data || []).map((quiz) => ({
              ...quiz,
              courseTitle: course.subject || course.title,
            }));
          }),
        );
        setQuizzes(quizGroups.flat());
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visibleQuizzes = useMemo(
    () => applyTimestampControls(quizzes, { sort, filters }),
    [quizzes, sort, filters],
  );

  async function handleSubmitGrade(quizId) {
    setSubmittingId(quizId);
    setError("");
    try {
      await quizService.releaseGrade(quizId);
      setQuizzes((prev) =>
        prev.map((quiz) =>
          Number(quiz.id) === Number(quizId)
            ? {
                ...quiz,
                gradeReleased: true,
                unavailable: true,
              }
            : quiz,
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) return <LoadingScreen label="Loading quizzes..." showCards />;

  return (
    <>
      <PageHeader
        title="Quiz Arena"
        subtitle="Complete required lessons first, then test your knowledge for XP."
      />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <ContentTimestampToolbar
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFiltersChange={setFilters}
        showUpdatedFilters={false}
      />
      {visibleQuizzes.length ? (
        <Grid container spacing={2}>
          {visibleQuizzes.map((quiz) => {
            const unavailable = Boolean(
              quiz.locked ||
                quiz.isClosed ||
                quiz.outOfAttempts ||
                quiz.gradeReleased ||
                quiz.unavailable,
            );
            let unlockMessage = quiz.unlockMessage;
            let status = `${quiz.question_count || 0} Qs`;
            let statusColor = "secondary";
            if (quiz.locked) {
              status = "Locked";
              statusColor = "warning";
            } else if (quiz.isClosed) {
              status = "Closed";
              statusColor = "warning";
              unlockMessage =
                unlockMessage ||
                "This quiz is closed (past due date or school year ended).";
            } else if (quiz.gradeReleased) {
              status = "Submitted";
              statusColor = "success";
              unlockMessage =
                unlockMessage ||
                "You already submitted this quiz grade. It is no longer available.";
            } else if (quiz.outOfAttempts) {
              status = "No attempts";
              statusColor = "warning";
              unlockMessage =
                unlockMessage || "You used all attempts for this quiz.";
            } else if (quiz.hasPassed) {
              status = "Passed";
              statusColor = "success";
            }
            const metaParts = [
              quiz.bestScore != null
                ? `Best ${Number(quiz.bestScore).toFixed(0)}%`
                : null,
              quiz.attemptsRemaining != null
                ? `${quiz.attemptsRemaining} attempt(s) left`
                : null,
              quiz.dueAt || quiz.due_at
                ? `Due ${new Date(quiz.dueAt || quiz.due_at).toLocaleString()}`
                : null,
            ].filter(Boolean);

            const canSubmitEarly =
              !unavailable &&
              Boolean(quiz.hasAttempted) &&
              Number(quiz.attemptsRemaining) > 0 &&
              !quiz.gradeReleased;

            let actionLabel = "Start Challenge";
            if (quiz.hasOverride && !unavailable) {
              actionLabel = "Continue (extended)";
            } else if (quiz.locked) {
              actionLabel = "Finish lesson first";
            } else if (quiz.gradeReleased) {
              actionLabel = "Submitted";
            } else if (quiz.isClosed || quiz.outOfAttempts) {
              actionLabel = "Unavailable";
            } else if (quiz.hasAttempted) {
              actionLabel =
                quiz.attemptsRemaining > 0
                  ? "Use another attempt"
                  : "Open quiz";
            }

            return (
              <Grid key={quiz.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <QuestCard
                  title={quiz.title}
                  description={quiz.courseTitle || quiz.description}
                  icon={<QuizIcon />}
                  accent="purple"
                  difficulty={quiz.difficulty || "Challenge"}
                  xpReward={quiz.xp_reward}
                  estimatedTime={quiz.time_limit_minutes}
                  status={status}
                  statusColor={statusColor}
                  meta={metaParts.join(" · ") || undefined}
                  showTimestamp
                  item={quiz}
                  locked={unavailable}
                  unlockMessage={unlockMessage}
                  to={
                    unavailable ? undefined : `/student/quizzes/${quiz.id}`
                  }
                  actionLabel={actionLabel}
                  secondaryActionLabel={
                    canSubmitEarly ? "Submit result" : undefined
                  }
                  onSecondaryAction={
                    canSubmitEarly
                      ? () => handleSubmitGrade(quiz.id)
                      : undefined
                  }
                  secondaryLoading={Number(submittingId) === Number(quiz.id)}
                />
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <EmptyState
          icon={<QuizIcon sx={{ fontSize: 36 }} />}
          title="No quizzes yet"
          description="Enroll in a subject first — new challenges will appear here."
          actionLabel="Browse subjects"
          to="/student/courses"
          color="#8B5CF6"
        />
      )}
    </>
  );
}
