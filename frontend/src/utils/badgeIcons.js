import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import StarIcon from "@mui/icons-material/Star";
import SchoolIcon from "@mui/icons-material/School";
import QuizIcon from "@mui/icons-material/Quiz";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import PsychologyIcon from "@mui/icons-material/Psychology";
import Diversity3Icon from "@mui/icons-material/Diversity3";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import DiamondIcon from "@mui/icons-material/Diamond";

export const BADGE_ICON_OPTIONS = [
  { key: "emoji_events", label: "Trophy", Icon: EmojiEventsIcon },
  { key: "star", label: "Star", Icon: StarIcon },
  { key: "school", label: "School", Icon: SchoolIcon },
  { key: "quiz", label: "Quiz", Icon: QuizIcon },
  { key: "local_fire_department", label: "Streak", Icon: LocalFireDepartmentIcon },
  { key: "workspace_premium", label: "Premium", Icon: WorkspacePremiumIcon },
  { key: "military_tech", label: "Medal", Icon: MilitaryTechIcon },
  { key: "auto_awesome", label: "Sparkle", Icon: AutoAwesomeIcon },
  { key: "favorite", label: "Heart", Icon: FavoriteIcon },
  { key: "thumb_up", label: "Thumbs up", Icon: ThumbUpIcon },
  { key: "psychology", label: "Mind", Icon: PsychologyIcon },
  { key: "diversity_3", label: "Team", Icon: Diversity3Icon },
  { key: "sports_esports", label: "Games", Icon: SportsEsportsIcon },
  { key: "diamond", label: "Diamond", Icon: DiamondIcon },
];

const ICON_BY_KEY = Object.fromEntries(
  BADGE_ICON_OPTIONS.map((item) => [item.key, item.Icon]),
);

export function getBadgeIconComponent(iconKey) {
  return ICON_BY_KEY[iconKey] || EmojiEventsIcon;
}
