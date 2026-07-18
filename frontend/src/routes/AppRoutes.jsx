import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import StudentLayout from '../layouts/StudentLayout';
import TeacherLayout from '../layouts/TeacherLayout';
import AdminLayout from '../layouts/AdminLayout';
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentCoursesPage from '../pages/student/StudentCoursesPage';
import StudentCourseDetailPage from '../pages/student/StudentCourseDetailPage';
import StudentLessonPage from '../pages/student/StudentLessonPage';
import StudentQuizzesPage from '../pages/student/StudentQuizzesPage';
import StudentQuizPage from '../pages/student/StudentQuizPage';
import StudentGamesPage from '../pages/student/StudentGamesPage';
import StudentGamePage from '../pages/student/StudentGamePage';
import StudentAchievementsPage from '../pages/student/StudentAchievementsPage';
import StudentLeaderboardPage from '../pages/student/StudentLeaderboardPage';
import StudentCertificatesPage from '../pages/student/StudentCertificatesPage';
import StudentCertificateViewPage from '../pages/student/StudentCertificateViewPage';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import TeacherCoursesPage from '../pages/teacher/TeacherCoursesPage';
import TeacherCourseDetailPage from '../pages/teacher/TeacherCourseDetailPage';
import TeacherAiQuizPage from '../pages/teacher/TeacherAiQuizPage';
import TeacherAiGamePage from '../pages/teacher/TeacherAiGamePage';
import TeacherAiContentPage from '../pages/teacher/TeacherAiContentPage';
import TeacherAwardsPage from '../pages/teacher/TeacherAwardsPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminCoursesPage from '../pages/admin/AdminCoursesPage';
import AdminLeaderboardPage from '../pages/admin/AdminLeaderboardPage';
import AdminCertificatesPage from '../pages/admin/AdminCertificatesPage';
import AdminBadgesPage from '../pages/admin/AdminBadgesPage';
import StudentProfilePage from '../pages/student/StudentProfilePage';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';

function HomeRedirect() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <LandingPage />;

  if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === 'administrator') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute roles={['student']} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCoursesPage />} />
          <Route path="courses/:courseId" element={<StudentCourseDetailPage />} />
          <Route path="lessons/:lessonId" element={<StudentLessonPage />} />
          <Route path="quizzes" element={<StudentQuizzesPage />} />
          <Route path="quizzes/:quizId" element={<StudentQuizPage />} />
          <Route path="games" element={<StudentGamesPage />} />
          <Route path="games/:gameId" element={<StudentGamePage />} />
          <Route path="achievements" element={<StudentAchievementsPage />} />
          <Route path="leaderboard" element={<StudentLeaderboardPage />} />
          <Route path="certificates" element={<StudentCertificatesPage />} />
          <Route path="certificates/:certificateId" element={<StudentCertificateViewPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['teacher']} />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="courses" element={<TeacherCoursesPage />} />
          <Route path="courses/:courseId" element={<TeacherCourseDetailPage />} />
          <Route path="ai-content" element={<TeacherAiContentPage />} />
          <Route path="ai-quiz" element={<TeacherAiQuizPage />} />
          <Route path="ai-game" element={<TeacherAiGamePage />} />
          <Route path="awards" element={<TeacherAwardsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['administrator']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="leaderboard" element={<AdminLeaderboardPage />} />
          <Route path="certificates" element={<AdminCertificatesPage />} />
          <Route path="badges" element={<AdminBadgesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
