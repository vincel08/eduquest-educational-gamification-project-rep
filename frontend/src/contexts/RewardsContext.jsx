import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { celebrate, celebrateLevelUp } from '../utils/confetti';
import { playSound, SOUND_KEYS } from '../utils/soundEffects';
import XpFloatLayer from '../components/rewards/XpFloatLayer';
import LevelUpDialog from '../components/rewards/LevelUpDialog';
import BadgeUnlockDialog from '../components/rewards/BadgeUnlockDialog';
import CertificateCelebrationDialog from '../components/rewards/CertificateCelebrationDialog';

const RewardsContext = createContext(null);
const LEVEL_KEY_PREFIX = 'eduquest_level_celebrated_';

function wasLevelCelebrated(level) {
  try {
    return sessionStorage.getItem(`${LEVEL_KEY_PREFIX}${level}`) === '1';
  } catch {
    return false;
  }
}

function markLevelCelebrated(level) {
  try {
    sessionStorage.setItem(`${LEVEL_KEY_PREFIX}${level}`, '1');
  } catch {
    // ignore
  }
}

export function RewardsProvider({ children }) {
  const [xpFloats, setXpFloats] = useState([]);
  const [levelUp, setLevelUp] = useState(null);
  const [badgeQueue, setBadgeQueue] = useState([]);
  const [activeBadge, setActiveBadge] = useState(null);
  const [certificate, setCertificate] = useState(null);

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
  const notifyReward = useCallback((payload = {}) => {
    const {
      xpEarned = 0,
      previousLevel = null,
      nextProfile = null,
      badges = [],
      medals = [],
      certificate: earnedCertificate = null,
      celebrateWin = false,
    } = payload;

    if (xpEarned > 0) showXpFloat(xpEarned);
    if (celebrateWin) celebrate();

    const nextLevel = Number(nextProfile?.level);
    const prevLevel = Number(previousLevel);
    if (
      nextProfile
      && Number.isFinite(nextLevel)
      && Number.isFinite(prevLevel)
      && nextLevel > prevLevel
      && !wasLevelCelebrated(nextLevel)
    ) {
      markLevelCelebrated(nextLevel);
      celebrateLevelUp(2600);
      playSound(SOUND_KEYS.levelUp);
      setLevelUp({
        previousLevel: prevLevel,
        newLevel: nextLevel,
        xpEarned,
        xp: nextProfile.xp,
      });
    }

    const unlocks = [
      ...badges.map((badge) => ({ ...badge, kind: 'badge' })),
      ...medals.map((medal) => ({
        ...medal,
        kind: 'medal',
        name: medal.name,
        description: medal.description,
        color: medal.color,
      })),
    ];
    if (unlocks.length) {
      playSound(SOUND_KEYS.badgeUnlocked);
      enqueueBadges(unlocks);
    }

    if (earnedCertificate) {
      celebrateLevelUp(2000);
      setCertificate(earnedCertificate);
    }
  }, [enqueueBadges, showXpFloat]);

  const value = useMemo(() => ({
    notifyReward,
    showXpFloat,
  }), [notifyReward, showXpFloat]);

  return (
    <RewardsContext.Provider value={value}>
      {children}
      <XpFloatLayer items={xpFloats} />
      <LevelUpDialog
        open={Boolean(levelUp)}
        data={levelUp}
        onClose={() => setLevelUp(null)}
      />
      <BadgeUnlockDialog
        open={Boolean(activeBadge)}
        item={activeBadge}
        onClose={dismissBadge}
      />
      <CertificateCelebrationDialog
        open={Boolean(certificate)}
        certificate={certificate}
        onClose={() => setCertificate(null)}
      />
    </RewardsContext.Provider>
  );
}

export function useRewards() {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error('useRewards must be used within RewardsProvider');
  }
  return context;
}
