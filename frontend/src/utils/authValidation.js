const MIN_PASSWORD_LENGTH = 8;

export function getPasswordError(password) {
  if (!password || !String(password).trim()) {
    return 'Password is required';
  }

  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
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

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export { MIN_PASSWORD_LENGTH };
