import {
  GRADE_LEVEL_INVALID_MESSAGE,
  GRADE_LEVEL_REQUIRED_MESSAGE,
  isValidGradeLevel,
} from "./gradeLevels";

const MIN_PASSWORD_LENGTH = 8;
const USERNAME_MIN = 3;
const USERNAME_MAX = 64;

export function getPasswordError(password) {
  if (!password || !String(password).trim()) {
    return "Password is required";
  }

  const value = String(password);
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!/[a-z]/.test(value)) {
    return "Password must include a lowercase letter";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must include an uppercase letter";
  }
  if (!/[0-9]/.test(value)) {
    return "Password must include a number";
  }

  return "";
}

export function getUsernameError(username) {
  const value = String(username || "")
    .trim()
    .toLowerCase();
  if (!value) {
    return "Username is required";
  }
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters`;
  }
  if (/^\d{6,20}$/.test(value)) {
    return "";
  }
  if (!/^[a-z0-9]+([._-]?[a-z0-9]+)*$/.test(value)) {
    return "Use letters, numbers, dots, underscores, or hyphens (or a school/LRN ID)";
  }
  return "";
}

export function validateRegistrationForm(form) {
  const errors = {};

  if (!form.firstName?.trim()) {
    errors.firstName = "First name is required";
  }

  if (!form.lastName?.trim()) {
    errors.lastName = "Last name is required";
  }

  const usernameError = getUsernameError(form.username);
  if (usernameError) {
    errors.username = usernameError;
  }

  if (form.email?.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Enter a valid email address, or leave it blank";
    }
  }

  const passwordError = getPasswordError(form.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!form.gradeLevel?.trim()) {
    errors.gradeLevel = GRADE_LEVEL_REQUIRED_MESSAGE;
  } else if (!isValidGradeLevel(form.gradeLevel)) {
    errors.gradeLevel = GRADE_LEVEL_INVALID_MESSAGE;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export { MIN_PASSWORD_LENGTH };
