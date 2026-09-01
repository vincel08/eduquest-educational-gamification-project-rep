import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { motion } from "framer-motion";
import { getBadgeIconComponent } from "../../utils/badgeIcons";

export default function BadgeUnlockDialog({ open, item, onClose }) {
  if (!item) return null;
  const isMedal = item.kind === "medal";
  const BadgeIcon = getBadgeIconComponent(item.icon);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ textAlign: "center", pt: 4 }}>
        <Stack
          component={motion.div}
          className="eq-achievement-glow"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          spacing={1.5}
          alignItems="center"
        >
          <Avatar
            sx={{
              width: 88,
              height: 88,
              bgcolor: item.color || "#FACC15",
              color: "#1E293B",
              boxShadow: "0 0 0 8px rgba(250,204,21,0.25)",
            }}
          >
            {isMedal ? (
              <MilitaryTechIcon sx={{ fontSize: 44 }} />
            ) : (
              <BadgeIcon sx={{ fontSize: 44 }} />
            )}
          </Avatar>
          <Typography
            variant="overline"
            fontWeight={900}
            color="secondary.main"
          >
            {isMedal ? "Medal Unlocked!" : "Badge Unlocked!"}
          </Typography>
          <Typography variant="h5" fontWeight={900}>
            {item.name}
          </Typography>
          <Typography color="text.secondary">{item.description}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
        <Button variant="contained" color="secondary" onClick={onClose}>
          Awesome!
        </Button>
      </DialogActions>
    </Dialog>
  );
}
