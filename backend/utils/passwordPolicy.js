/**
 * Stronger password rules for NEW accounts only.
 * Existing users keep their current passwords.
 */
export function validateNewPassword(password) {
  const value = String(password || '');

  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[a-z]/.test(value)) {
    return 'Password must include a lowercase letter';
  }
  if (!/[A-Z]/.test(value)) {
    return 'Password must include an uppercase letter';
  }
  if (!/[0-9]/.test(value)) {
    return 'Password must include a number';
  }

  return null;
}
