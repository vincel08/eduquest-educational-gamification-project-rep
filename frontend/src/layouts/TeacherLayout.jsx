import DashboardIcon from "@mui/icons-material/Dashboard";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import QuizIcon from "@mui/icons-material/Quiz";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import PersonIcon from "@mui/icons-material/Person";
import DashboardLayout from "./DashboardLayout";
import { TeacherFiltersProvider } from "../contexts/TeacherFiltersContext";
import TeacherSidebarFilters from "../components/teacher/TeacherSidebarFilters";

const navItems = [
  { label: "Dashboard", path: "/teacher/dashboard", icon: <DashboardIcon /> },
  { label: "My Subjects", path: "/teacher/courses", icon: <MenuBookIcon /> },
  { label: "Quizzes", path: "/teacher/quizzes", icon: <QuizIcon /> },
  {
    label: "AI Content",
    path: "/teacher/ai-content",
    icon: <AutoFixHighIcon />,
  },
  { label: "AI Quiz", path: "/teacher/ai-quiz", icon: <AutoAwesomeIcon /> },
  { label: "AI Games", path: "/teacher/ai-game", icon: <SportsEsportsIcon /> },
  {
    label: "Award Badges",
    path: "/teacher/awards",
    icon: <MilitaryTechIcon />,
  },
  { label: "Profile", path: "/teacher/profile", icon: <PersonIcon /> },
];

export default function TeacherLayout() {
  return (
    <TeacherFiltersProvider>
      <DashboardLayout
        title="Teacher Studio"
        navItems={navItems}
        sidebarFilters={<TeacherSidebarFilters />}
      />
    </TeacherFiltersProvider>
  );
}
