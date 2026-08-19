import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import DashboardLayout from "./DashboardLayout";

const navItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: <DashboardIcon /> },
  { label: "Users", path: "/admin/users", icon: <PeopleIcon /> },
  { label: "Subjects", path: "/admin/courses", icon: <MenuBookIcon /> },
  { label: "Badges", path: "/admin/badges", icon: <EmojiEventsIcon /> },
  {
    label: "Leaderboard",
    path: "/admin/leaderboard",
    icon: <LeaderboardIcon />,
  },
];

export default function AdminLayout() {
  return <DashboardLayout title="Admin Control" navItems={navItems} />;
}
