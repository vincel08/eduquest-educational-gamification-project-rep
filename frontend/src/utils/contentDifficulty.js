export const CONTENT_DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "average", label: "Average" },
  { value: "difficult", label: "Difficult" },
];

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
  if (!raw && fallback === "") return "";
  return fallback || "average";
}

export function formatContentDifficulty(value) {
  const slug = normalizeContentDifficulty(value, "");
  return CONTENT_DIFFICULTIES.find((option) => option.value === slug)?.label || "";
}
