import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import InsightsIcon from '@mui/icons-material/Insights';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DashboardLayout from './DashboardLayout';

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <DashboardIcon /> },
  { label: 'Users', path: '/admin/users', icon: <PeopleIcon /> },
  { label: 'Courses', path: '/admin/courses', icon: <MenuBookIcon /> },
  { label: 'Badges', path: '/admin/badges', icon: <EmojiEventsIcon /> },
  { label: 'Leaderboard', path: '/admin/leaderboard', icon: <LeaderboardIcon /> },
  { label: 'Certificates', path: '/admin/certificates', icon: <WorkspacePremiumIcon /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <InsightsIcon /> },
];

export default function AdminLayout() {
  return <DashboardLayout title="Admin Control" navItems={navItems} />;
}
