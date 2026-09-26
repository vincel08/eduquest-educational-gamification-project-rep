import DashboardIcon from "@mui/icons-material/Dashboard";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TimelineIcon from "@mui/icons-material/Timeline";
import DashboardLayout from "./DashboardLayout";
import QuestMascot from "../components/rewards/QuestMascot";

const navItems = [
  { label: "Dashboard", path: "/student/dashboard", icon: <DashboardIcon /> },
  { label: "My Subjects", path: "/student/courses", icon: <MenuBookIcon /> },
  {
    label: "Progress Tracking",
    path: "/student/progress",
    icon: <TimelineIcon />,
  },
  {
    label: "Badges & Medals",
    path: "/student/achievements",
    icon: <EmojiEventsIcon />,
  },
];

export default function StudentLayout() {
  return (
    <>
      <DashboardLayout
        title="Learner Quest"
        navItems={navItems}
        profilePath="/student/profile"
      />
      <QuestMascot />
    </>
  );
}
