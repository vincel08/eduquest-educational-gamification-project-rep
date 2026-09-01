import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import PageHeader from "../../components/common/PageHeader";
import LoadingScreen from "../../components/common/LoadingScreen";
import EmptyState from "../../components/common/EmptyState";
import BadgeCard from "../../components/gamification/BadgeCard";
import MedalCard from "../../components/gamification/MedalCard";
import XpBar from "../../components/gamification/XpBar";
import gamificationService from "../../services/gamificationService";
import { getErrorMessage } from "../../services/api";

export default function StudentAchievementsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamificationService
      .me()
      .then((response) => setData(response.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const badgeCollection = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.badgeCollection)) return data.badgeCollection;
    return (data.badges || [])
      .filter((badge) => badge.criteria_type !== "manual")
      .map((badge) => ({
        id: badge.badge_id || badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        unlocked: true,
        awardedAt: badge.awarded_at || null,
        progress: null,
        unlockHint: "",
      }));
  }, [data]);

  const medalCollection = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.medalCollection)) return data.medalCollection;
    return (data.medals || [])
      .filter((medal) => medal.criteria_type !== "manual")
      .map((medal) => ({
        id: medal.medal_id || medal.id,
        name: medal.name,
        description: medal.description,
        icon: medal.icon,
        tier: medal.tier,
        unlocked: true,
        awardedAt: medal.awarded_at || null,
        progress: null,
        unlockHint: "",
      }));
  }, [data]);

  const teacherAwardedBadges = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.teacherAwardedBadges)) {
      return data.teacherAwardedBadges;
    }
    return (data.badges || [])
      .filter((badge) => badge.criteria_type === "manual")
      .map((badge) => ({
        id: badge.badge_id || badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        unlocked: true,
        awardedAt: badge.awarded_at || null,
        progress: null,
        unlockHint: "Awarded by your teacher",
      }));
  }, [data]);

  const teacherAwardedMedals = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.teacherAwardedMedals)) {
      return data.teacherAwardedMedals;
    }
    return (data.medals || [])
      .filter((medal) => medal.criteria_type === "manual")
      .map((medal) => ({
        id: medal.medal_id || medal.id,
        name: medal.name,
        description: medal.description,
        icon: medal.icon,
        tier: medal.tier,
        unlocked: true,
        awardedAt: medal.awarded_at || null,
        progress: null,
        unlockHint: "Awarded by your teacher",
      }));
  }, [data]);

  if (loading) return <LoadingScreen />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const unlockedBadges = badgeCollection.filter((item) => item.unlocked).length;
  const unlockedMedals = medalCollection.filter((item) => item.unlocked).length;
  const teacherAwardCount =
    teacherAwardedBadges.length + teacherAwardedMedals.length;

  return (
    <>
      <PageHeader
        title="Trophy Room"
        subtitle="Unlock badges by learning — teacher awards show up separately."
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <XpBar xp={data.profile.xp} />
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 2 }}
        >
          <Chip
            icon={<EmojiEventsIcon />}
            label={`${unlockedBadges} / ${badgeCollection.length} unlocked`}
            sx={{ fontWeight: 800 }}
          />
          <Chip
            icon={<MilitaryTechIcon />}
            label={`${unlockedMedals} / ${medalCollection.length} medals`}
            sx={{ fontWeight: 800 }}
          />
          <Chip
            icon={<VolunteerActivismIcon />}
            label={`${teacherAwardCount} teacher award${teacherAwardCount === 1 ? "" : "s"}`}
            sx={{ fontWeight: 800 }}
          />
          <Chip
            label={`Rank #${data.profile.rank || "—"}`}
            variant="outlined"
            sx={{ fontWeight: 800 }}
          />
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Unlockable badges
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Color = unlocked. Gray + lock = keep going to unlock.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {badgeCollection.map((badge) => (
          <Grid key={badge.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <BadgeCard
              badge={badge}
              locked={!badge.unlocked}
              unlockHint={badge.unlockHint}
              progress={badge.progress}
              awardedAt={badge.awardedAt}
            />
          </Grid>
        ))}
        {!badgeCollection.length ? (
          <Grid size={12}>
            <EmptyState
              icon={<EmojiEventsIcon sx={{ fontSize: 36 }} />}
              title="No unlockable badges yet"
              description="Ask an admin to add XP, lesson, quiz, or streak badges."
              actionLabel="Go to dashboard"
              to="/student/dashboard"
              color="#FACC15"
            />
          </Grid>
        ) : null}
      </Grid>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Unlockable medals
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Bigger trophies from levels, ranking, and perfect quizzes.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {medalCollection.map((medal) => (
          <Grid key={medal.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <MedalCard
              medal={medal}
              locked={!medal.unlocked}
              unlockHint={medal.unlockHint}
              progress={medal.progress}
              awardedAt={medal.awardedAt}
            />
          </Grid>
        ))}
        {!medalCollection.length ? (
          <Grid size={12}>
            <EmptyState
              icon={<MilitaryTechIcon sx={{ fontSize: 36 }} />}
              title="No unlockable medals yet"
              description="Keep completing challenges to earn medals."
              actionLabel="Continue learning"
              to="/student/courses"
              color="#F97316"
            />
          </Grid>
        ) : null}
      </Grid>

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 2,
          border: "1px solid",
          borderColor: "secondary.main",
          background:
            "linear-gradient(160deg, rgba(139,92,246,0.12), rgba(59,130,246,0.06))",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 0.5 }}
        >
          <VolunteerActivismIcon color="secondary" />
          <Typography variant="h6" fontWeight={900}>
            Teacher awards
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Special badges your teacher gives you — no unlock progress needed.
        </Typography>

        {teacherAwardedBadges.length || teacherAwardedMedals.length ? (
          <Grid container spacing={2}>
            {teacherAwardedBadges.map((badge) => (
              <Grid key={`teacher-badge-${badge.id}`} size={{ xs: 12, sm: 6, md: 3 }}>
                <BadgeCard
                  badge={badge}
                  locked={false}
                  awardedAt={badge.awardedAt}
                  teacherAward
                />
              </Grid>
            ))}
            {teacherAwardedMedals.map((medal) => (
              <Grid key={`teacher-medal-${medal.id}`} size={{ xs: 12, sm: 6, md: 3 }}>
                <MedalCard
                  medal={medal}
                  locked={false}
                  awardedAt={medal.awardedAt}
                  teacherAward
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No teacher awards yet. Great work can earn a special badge from your
            teacher.
          </Typography>
        )}
      </Paper>
    </>
  );
}
