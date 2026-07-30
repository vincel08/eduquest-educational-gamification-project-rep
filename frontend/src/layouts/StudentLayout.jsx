import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import PersonIcon from '@mui/icons-material/Person';
import DashboardLayout from './DashboardLayout';

const navItems = [
  { label: 'Dashboard', path: '/student/dashboard', icon: <DashboardIcon /> },
  { label: 'Courses', path: '/student/courses', icon: <MenuBookIcon /> },
  { label: 'Quizzes', path: '/student/quizzes', icon: <QuizIcon /> },
  { label: 'Games', path: '/student/games', icon: <SportsEsportsIcon /> },
  { label: 'Achievements', path: '/student/achievements', icon: <EmojiEventsIcon /> },
  { label: 'Leaderboard', path: '/student/leaderboard', icon: <LeaderboardIcon /> },
  { label: 'Certificates', path: '/student/certificates', icon: <WorkspacePremiumIcon /> },
  { label: 'Profile', path: '/student/profile', icon: <PersonIcon /> },
];

export default function StudentLayout() {
  return <DashboardLayout title="Learner Quest" navItems={navItems} />;
}
