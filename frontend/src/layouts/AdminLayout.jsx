import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import HistoryIcon from "@mui/icons-material/History";
import DashboardLayout from "./DashboardLayout";
import { AdminFiltersProvider } from "../contexts/AdminFiltersContext";
import AdminSidebarFilters from "../components/admin/AdminSidebarFilters";

const navItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: <DashboardIcon /> },
  { label: "Sections", path: "/admin/sections", icon: <GroupsIcon /> },
  { label: "Subjects", path: "/admin/courses", icon: <MenuBookIcon /> },
  { label: "Badges & Medals", path: "/admin/badges", icon: <EmojiEventsIcon /> },
  {
    label: "Leaderboard",
    path: "/admin/leaderboard",
    icon: <LeaderboardIcon />,
  },
  { label: "Activity", path: "/admin/activity", icon: <HistoryIcon /> },
  { label: "Users", path: "/admin/users", icon: <PeopleIcon /> },
];

export default function AdminLayout() {
  return (
    <AdminFiltersProvider>
      <DashboardLayout
        title="Admin Control"
        navItems={navItems}
        sidebarFilters={<AdminSidebarFilters />}
      />
    </AdminFiltersProvider>
  );
}
