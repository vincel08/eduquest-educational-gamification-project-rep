import {
  Avatar,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { motion } from "framer-motion";

const tierColors = {
  bronze: "#CD7F32",
  silver: "#9CA3AF",
  gold: "#FACC15",
  platinum: "#A78BFA",
  diamond: "#38BDF8",
  legendary: "#F97316",
};

export default function MedalCard({
  medal,
  locked = false,
  unlockHint = "",
  progress = null,
  awardedAt = null,
  teacherAward = false,
}) {
  const isLocked = Boolean(locked);
  const percent = Math.min(100, Math.max(0, Number(progress?.percent) || 0));
  const tierColor = tierColors[medal.tier] || "#FACC15";

  return (
    <Card
      className="glass-panel"
      component={motion.div}
      whileHover={isLocked ? undefined : { scale: 1.03, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      sx={{
        height: "100%",
        cursor: "default",
        opacity: isLocked ? 0.78 : 1,
        filter: isLocked ? "grayscale(0.85)" : "none",
        transition: "box-shadow 0.25s ease",
        "&:hover": isLocked
          ? undefined
          : { boxShadow: "0 18px 40px rgba(139,92,246,0.2)" },
      }}
    >
      <CardContent>
        <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center" }}>
          <Avatar
            sx={{
              bgcolor: isLocked ? "rgba(148,163,184,0.35)" : tierColor,
              color: isLocked
                ? "text.secondary"
                : medal.tier === "gold"
                  ? "#1E1B4B"
                  : "#fff",
              width: 72,
              height: 72,
              boxShadow: isLocked
                ? "none"
                : "0 10px 24px rgba(124, 58, 237, 0.28)",
            }}
          >
            {isLocked ? (
              <LockOutlinedIcon sx={{ fontSize: 32 }} />
            ) : (
              <MilitaryTechIcon sx={{ fontSize: 36 }} />
            )}
          </Avatar>

          <Stack
            direction="row"
            spacing={0.75}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              label={medal.tier || "medal"}
              size="small"
              sx={{
                textTransform: "capitalize",
                bgcolor: "rgba(250, 204, 21, 0.2)",
                color: "warning.dark",
                fontWeight: 800,
              }}
            />
            <Chip
              size="small"
              label={
                teacherAward ? "Teacher award" : isLocked ? "Locked" : "Unlocked"
              }
              color={
                teacherAward ? "secondary" : isLocked ? "default" : "success"
              }
              variant={isLocked ? "outlined" : "filled"}
              sx={{ fontWeight: 800 }}
            />
          </Stack>

          <Typography fontWeight={900}>{medal.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {medal.description}
          </Typography>

          {isLocked ? (
            <>
              <Typography variant="body2" fontWeight={700} color="text.secondary">
                {unlockHint || "Keep learning to unlock"}
              </Typography>
              {progress ? (
                <Stack spacing={0.5} sx={{ width: "100%", px: 0.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    color="secondary"
                    sx={{ height: 8, borderRadius: 999 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {progress.current} / {progress.target}
                  </Typography>
                </Stack>
              ) : null}
            </>
          ) : awardedAt ? (
            <Typography variant="caption" color="text.secondary">
              {teacherAward ? "Awarded" : "Earned"}{" "}
              {new Date(awardedAt).toLocaleDateString()}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
