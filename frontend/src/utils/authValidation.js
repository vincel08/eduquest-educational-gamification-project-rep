import {
  GRADE_LEVEL_INVALID_MESSAGE,
  GRADE_LEVEL_REQUIRED_MESSAGE,
  isValidGradeLevel,
} from './gradeLevels';

const MIN_PASSWORD_LENGTH = 8;

export function getPasswordError(password) {
  if (!password || !String(password).trim()) {
    return 'Password is required';
  }

  const value = String(password);
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
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

  return '';
}

export function validateRegistrationForm(form) {
  const errors = {};

  if (!form.firstName?.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!form.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  }

  if (!form.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address';
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
