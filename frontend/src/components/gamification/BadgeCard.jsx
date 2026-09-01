import {
  Avatar,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { motion } from "framer-motion";
import { getBadgeIconComponent } from "../../utils/badgeIcons";

export default function BadgeCard({
  badge,
  locked = false,
  unlockHint = "",
  progress = null,
  awardedAt = null,
  teacherAward = false,
}) {
  const isLocked = Boolean(locked);
  const percent = Math.min(100, Math.max(0, Number(progress?.percent) || 0));
  const BadgeIcon = getBadgeIconComponent(badge?.icon);

  return (
    <Card
      className={isLocked ? "glass-panel" : "glass-panel eq-achievement-glow"}
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
          : { boxShadow: "0 18px 40px rgba(250,204,21,0.22)" },
      }}
    >
      <CardContent>
        <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center" }}>
          <Avatar
            sx={{
              bgcolor: isLocked ? "rgba(148,163,184,0.35)" : badge.color || "#FACC15",
              color: isLocked ? "text.secondary" : "#1E1B4B",
              width: 72,
              height: 72,
              boxShadow: isLocked
                ? "none"
                : "0 10px 24px rgba(250, 204, 21, 0.45)",
              position: "relative",
            }}
          >
            {isLocked ? (
              <LockOutlinedIcon sx={{ fontSize: 32 }} />
            ) : (
              <BadgeIcon sx={{ fontSize: 36 }} />
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
              size="small"
              label={
                teacherAward
                  ? "Teacher award"
                  : isLocked
                    ? "Locked"
                    : "Unlocked"
              }
              color={
                teacherAward ? "secondary" : isLocked ? "default" : "success"
              }
              variant={isLocked ? "outlined" : "filled"}
              sx={{ fontWeight: 800 }}
            />
            {!teacherAward && badge?.difficulty ? (
              <Chip
                size="small"
                label={String(badge.difficulty)}
                variant="outlined"
                sx={{
                  fontWeight: 800,
                  textTransform: "capitalize",
                  borderColor:
                    badge.difficulty === "hard"
                      ? "error.main"
                      : badge.difficulty === "easy"
                        ? "success.main"
                        : "warning.main",
                  color:
                    badge.difficulty === "hard"
                      ? "error.main"
                      : badge.difficulty === "easy"
                        ? "success.main"
                        : "warning.main",
                }}
              />
            ) : null}
          </Stack>

          <Typography fontWeight={900}>{badge.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {badge.description}
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
