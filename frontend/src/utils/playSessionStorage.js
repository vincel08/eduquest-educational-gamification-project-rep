/**
 * Mid-session play progress for quizzes/games (survives refresh in this tab).
 */

export function playSessionKey(kind, userId, contentId) {
  const safeKind = String(kind || 'play');
  const safeUser = userId == null ? 'anon' : String(userId);
  const safeContent = contentId == null ? '0' : String(contentId);
  return `eduwow_play_${safeKind}_${safeUser}_${safeContent}`;
}

export function readPlaySession(key) {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writePlaySession(key, data) {
  if (!key || !data || typeof data !== 'object') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function clearPlaySession(key) {
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
