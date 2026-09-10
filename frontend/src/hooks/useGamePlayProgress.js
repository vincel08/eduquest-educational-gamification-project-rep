import { useEffect, useRef } from 'react';
import { useGameSession } from '../contexts/GameSessionContext';

/**
 * Snapshot of mid-game progress restored once from GamePreview sessionStorage.
 */
export function useRestoredGameProgress() {
  const { initialProgress } = useGameSession();
  const ref = useRef(null);
  if (ref.current === null) {
    ref.current =
      initialProgress && typeof initialProgress === 'object' ? initialProgress : {};
  }
  return ref.current;
}

/**
 * Keep sessionStorage updated with current mid-game progress.
 * @param {() => object} getSnapshot
 * @param {unknown[]} deps
 */
export function useSaveGameProgress(getSnapshot, deps) {
  const { saveProgress, persistEnabled } = useGameSession();
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  useEffect(() => {
    if (!persistEnabled || !saveProgress) return;
    saveProgress(getSnapshotRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps
  }, deps);
}

/** @deprecated prefer useRestoredGameProgress + useSaveGameProgress */
export default function useGamePlayProgress(getSnapshot, deps) {
  const saved = useRestoredGameProgress();
  useSaveGameProgress(getSnapshot, deps);
  return saved;
}
