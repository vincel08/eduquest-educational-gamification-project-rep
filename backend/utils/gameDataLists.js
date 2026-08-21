/**
 * Prefer the first non-empty array. Empty [] must not shadow real content.
 */
export function firstNonEmptyList(...candidates) {
  for (const list of candidates) {
    if (Array.isArray(list) && list.length) return list;
  }
  for (const list of candidates) {
    if (Array.isArray(list)) return list;
  }
  return [];
}
