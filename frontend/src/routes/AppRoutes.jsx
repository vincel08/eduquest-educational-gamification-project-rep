import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import StudentLayout from "../layouts/StudentLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import AdminLayout from "../layouts/AdminLayout";
import StudentDashboard from "../pages/student/StudentDashboard";
import StudentCoursesPage from "../pages/student/StudentCoursesPage";
import StudentCourseDetailPage from "../pages/student/StudentCourseDetailPage";
import StudentLessonPage from "../pages/student/StudentLessonPage";
import StudentQuizzesPage from "../pages/student/StudentQuizzesPage";
import StudentQuizPage from "../pages/student/StudentQuizPage";
import StudentGamesPage from "../pages/student/StudentGamesPage";
import StudentGamePage from "../pages/student/StudentGamePage";
import StudentAchievementsPage from "../pages/student/StudentAchievementsPage";
import StudentLeaderboardPage from "../pages/student/StudentLeaderboardPage";
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import TeacherCoursesPage from "../pages/teacher/TeacherCoursesPage";
import TeacherCourseDetailPage from "../pages/teacher/TeacherCourseDetailPage";
import TeacherGradebookPage from "../pages/teacher/TeacherGradebookPage";
import TeacherAiQuizPage from "../pages/teacher/TeacherAiQuizPage";
import TeacherAiGamePage from "../pages/teacher/TeacherAiGamePage";
import TeacherAiContentPage from "../pages/teacher/TeacherAiContentPage";
import TeacherAwardsPage from "../pages/teacher/TeacherAwardsPage";
import TeacherQuizzesPage from "../pages/teacher/TeacherQuizzesPage";
import TeacherQuizEditorPage from "../pages/teacher/TeacherQuizEditorPage";
import TeacherGamesPage from "../pages/teacher/TeacherGamesPage";
import TeacherGameEditorPage from "../pages/teacher/TeacherGameEditorPage";
import TeacherProfilePage from "../pages/teacher/TeacherProfilePage";
import TeacherStudentsPage from "../pages/teacher/TeacherStudentsPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import AdminCoursesPage from "../pages/admin/AdminCoursesPage";
import AdminLeaderboardPage from "../pages/admin/AdminLeaderboardPage";
import AdminBadgesPage from "../pages/admin/AdminBadgesPage";
import AdminSectionsPage from "../pages/admin/AdminSectionsPage";
import AdminActivityLogsPage from "../pages/admin/AdminActivityLogsPage";
import StudentProfilePage from "../pages/student/StudentProfilePage";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "../components/common/LoadingScreen";

function HomeRedirect() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <LandingPage />;

  if (user.role === "teacher")
    return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === "administrator")
    return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute roles={["student"]} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCoursesPage />} />
          <Route
            path="courses/:courseId"
            element={<StudentCourseDetailPage />}
          />
          <Route path="lessons/:lessonId" element={<StudentLessonPage />} />
          <Route path="quizzes" element={<StudentQuizzesPage />} />
          <Route path="quizzes/:quizId" element={<StudentQuizPage />} />
          <Route path="games" element={<StudentGamesPage />} />
          <Route path="games/:gameId" element={<StudentGamePage />} />
          <Route path="achievements" element={<StudentAchievementsPage />} />
          <Route path="leaderboard" element={<StudentLeaderboardPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["teacher"]} />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="students" element={<TeacherStudentsPage />} />
          <Route path="courses" element={<TeacherCoursesPage />} />
          <Route
            path="courses/:courseId"
            element={<TeacherCourseDetailPage />}
          />
          <Route
            path="courses/:courseId/scores"
            element={<TeacherGradebookPage />}
          />
          <Route path="quizzes" element={<TeacherQuizzesPage />} />
          <Route path="quizzes/new" element={<TeacherQuizEditorPage />} />
          <Route
            path="quizzes/:quizId/edit"
            element={<TeacherQuizEditorPage />}
          />
          <Route path="games" element={<TeacherGamesPage />} />
          <Route
            path="games/:gameId/edit"
            element={<TeacherGameEditorPage />}
          />
          <Route path="ai-content" element={<TeacherAiContentPage />} />
          <Route path="ai-quiz" element={<TeacherAiQuizPage />} />
          <Route path="ai-game" element={<TeacherAiGamePage />} />
          <Route path="awards" element={<TeacherAwardsPage />} />
          <Route path="profile" element={<TeacherProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["administrator"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="leaderboard" element={<AdminLeaderboardPage />} />
          <Route path="badges" element={<AdminBadgesPage />} />
          <Route path="sections" element={<AdminSectionsPage />} />
          <Route path="activity" element={<AdminActivityLogsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
