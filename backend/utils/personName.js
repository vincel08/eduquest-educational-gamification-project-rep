const NAME_PATTERN = /^[\p{L}][\p{L}\s.'’-]*$/u;

export function getPersonNameError(value, label) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (!name) return `${label} is required`;
  if (name.length > 50 || !NAME_PATTERN.test(name)) {
    return `${label} can only include letters, spaces, apostrophes, or hyphens`;
  }
  return "";
}

export function normalizePersonName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
