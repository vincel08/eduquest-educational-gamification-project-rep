const USERNAME_MIN = 3;
const USERNAME_MAX = 64;

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$|^[a-z0-9]{3,64}$/;

export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidUsername(value) {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return false;
  }
  // Allow LRN / school IDs (digits) and simple login names.
  if (/^\d{6,20}$/.test(username)) {
    return true;
  }
  return USERNAME_PATTERN.test(username);
}

export const USERNAME_INVALID_MESSAGE =
  'Username must be 3–64 characters (letters, numbers, dots, underscores, or hyphens), or a school/LRN ID.';

export const USERNAME_REQUIRED_MESSAGE = 'Username is required.';
