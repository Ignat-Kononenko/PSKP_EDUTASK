export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const FULL_NAME_REGEX = /^[A-Za-zА-Яа-яЁё\- ]+$/u;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;

export const validateEmail = (email = '') => {
  const trimmed = email.trim();
  return Boolean(trimmed) && trimmed.length <= 255 && EMAIL_REGEX.test(trimmed);
};

export const validateFullName = (fullName = '') => {
  const trimmed = fullName.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return false;
  return FULL_NAME_REGEX.test(trimmed);
};

export const validatePassword = (password = '') => PASSWORD_REGEX.test(password) && /^[\x21-\x7E]+$/.test(password);

export const PASSWORD_REQUIREMENTS_TEXT = '8-20 символов, минимум одна заглавная и строчная буква, цифра и спецсимвол (!@#$%^&*), только латиница.';
