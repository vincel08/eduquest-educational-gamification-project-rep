export const CONTENT_DIFFICULTIES = ["easy", "average", "difficult"];

const LEGACY = {
  easy: "easy",
  average: "average",
  medium: "average",
  difficult: "difficult",
  hard: "difficult",
};

export function normalizeContentDifficulty(value, fallback = "average") {
  const raw = String(value ?? "").trim().toLowerCase();
  if (LEGACY[raw]) return LEGACY[raw];
  return fallback;
}

export function contentDifficultyLabel(value) {
  const slug = normalizeContentDifficulty(value, "");
  if (slug === "easy") return "Easy";
  if (slug === "average") return "Average";
  if (slug === "difficult") return "Difficult";
  return "Average";
}
