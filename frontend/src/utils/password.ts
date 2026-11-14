// Mirrors MedApp.Services/Validation/PasswordRules.cs; the API checks again.
export const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter and a digit';

export const validatePassword = (password: string): string | null => {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit.';
  return null;
};
