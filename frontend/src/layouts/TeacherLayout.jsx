import DashboardIcon from "@mui/icons-material/Dashboard";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import GroupsIcon from "@mui/icons-material/Groups";
import QuizIcon from "@mui/icons-material/Quiz";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import DashboardLayout from "./DashboardLayout";
import { TeacherFiltersProvider } from "../contexts/TeacherFiltersContext";
import TeacherSidebarFilters from "../components/teacher/TeacherSidebarFilters";

const navItems = [
  { label: "Dashboard", path: "/teacher/dashboard", icon: <DashboardIcon /> },
  { label: "My Students", path: "/teacher/students", icon: <GroupsIcon /> },
  { label: "My Subjects", path: "/teacher/courses", icon: <MenuBookIcon /> },
  { label: "My Quizzes", path: "/teacher/quizzes", icon: <QuizIcon /> },
  { label: "My Games", path: "/teacher/games", icon: <SportsEsportsIcon /> },
  {
    label: "AI Content",
    path: "/teacher/ai-content",
    icon: <AutoFixHighIcon />,
  },
  { label: "AI Quiz", path: "/teacher/ai-quiz", icon: <AutoAwesomeIcon /> },
  { label: "AI Games", path: "/teacher/ai-game", icon: <SportsEsportsIcon /> },
  {
    label: "Badges",
    path: "/teacher/awards",
    icon: <EmojiEventsIcon />,
  },
];

export default function TeacherLayout() {
  return (
    <TeacherFiltersProvider>
      <DashboardLayout
        title="Teacher Studio"
        navItems={navItems}
        profilePath="/teacher/profile"
        sidebarFilters={<TeacherSidebarFilters />}
      />
    </TeacherFiltersProvider>
  );
}
