import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { celebrate } from "../utils/confetti";
import { playSound, SOUND_KEYS } from "../utils/soundEffects";
import XpFloatLayer from "../components/rewards/XpFloatLayer";
import BadgeUnlockDialog from "../components/rewards/BadgeUnlockDialog";

const RewardsContext = createContext(null);

export function RewardsProvider({ children }) {
  const [xpFloats, setXpFloats] = useState([]);
  const [badgeQueue, setBadgeQueue] = useState([]);
  const [activeBadge, setActiveBadge] = useState(null);

  const showXpFloat = useCallback((amount) => {
    if (!amount) return;
    const id = `${Date.now()}_${Math.random()}`;
    setXpFloats((prev) => [...prev, { id, amount }]);
    playSound(SOUND_KEYS.xpGain);
    window.setTimeout(() => {
      setXpFloats((prev) => prev.filter((item) => item.id !== id));
    }, 1400);
  }, []);

  const enqueueBadges = useCallback((badges = []) => {
    if (!badges.length) return;
    setBadgeQueue((prev) => [...prev, ...badges]);
    setActiveBadge((current) => current || badges[0]);
  }, []);

  const dismissBadge = useCallback(() => {
    setBadgeQueue((prev) => {
      const next = prev.slice(1);
      setActiveBadge(next[0] || null);
      return next;
    });
  }, []);

  /**
   * Notify UI of XP / unlock rewards from an existing API response.
   * Does not call the backend.
   */
  const notifyReward = useCallback(
    (payload = {}) => {
      const {
        xpEarned = 0,
        badges = [],
        medals = [],
        celebrateWin = false,
      } = payload;

      if (xpEarned > 0) showXpFloat(xpEarned);
      if (celebrateWin) celebrate();

      const unlocks = [
        ...badges.map((badge) => ({ ...badge, kind: "badge" })),
        ...medals.map((medal) => ({
          ...medal,
          kind: "medal",
          name: medal.name,
          description: medal.description,
          color: medal.color,
        })),
      ];
      if (unlocks.length) {
        playSound(SOUND_KEYS.badgeUnlocked);
        enqueueBadges(unlocks);
      }
    },
    [enqueueBadges, showXpFloat],
  );

  const value = useMemo(
    () => ({
      notifyReward,
      showXpFloat,
    }),
    [notifyReward, showXpFloat],
  );

  return (
    <RewardsContext.Provider value={value}>
      {children}
      <XpFloatLayer items={xpFloats} />
      <BadgeUnlockDialog
        open={Boolean(activeBadge)}
        item={activeBadge}
        onClose={dismissBadge}
      />
    </RewardsContext.Provider>
  );
}

export function useRewards() {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error("useRewards must be used within RewardsProvider");
  }
  return context;
}
