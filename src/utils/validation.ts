export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone || !phone.trim()) {
    return 'Mobile number is required';
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) {
    return 'Enter a valid 10-digit mobile number';
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address';
  }
  return null;
};

export const validatePositiveNumber = (
  value: number | string,
  fieldName: string,
  allowZero = false
): string | null => {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }
  if (allowZero) {
    if (num < 0) {
      return `${fieldName} cannot be negative`;
    }
  } else {
    if (num <= 0) {
      return `${fieldName} must be greater than zero`;
    }
  }
  return null;
};

export const validateNonNegativeNumber = (
  value: number | string,
  fieldName: string
): string | null => {
  return validatePositiveNumber(value, fieldName, true);
};

export const validateMaxValue = (
  value: number | string,
  max: number,
  fieldName: string
): string | null => {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return null;
  if (num > max) {
    return `${fieldName} cannot exceed ${max}`;
  }
  return null;
};

export const validateDate = (date: string, fieldName: string): string | null => {
  if (!date || !date.trim()) {
    return `${fieldName} is required`;
  }
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return `Enter a valid ${fieldName.toLowerCase()}`;
  }
  return null;
};

export const validateNotFutureDate = (date: string, fieldName: string): string | null => {
  if (!date || !date.trim()) return null;
  const parsed = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed > today) {
    return `${fieldName} cannot be in the future`;
  }
  return null;
};

export const validateMinDate = (date: string, minDate: Date, fieldName: string): string | null => {
  if (!date || !date.trim()) return null;
  const parsed = new Date(date);
  if (parsed < minDate) {
    return `${fieldName} cannot be before ${minDate.toLocaleDateString()}`;
  }
  return null;
};

export const validateSelect = (value: string, fieldName: string): string | null => {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateArrayLength = (
  arr: unknown[],
  minLength: number,
  fieldName: string
): string | null => {
  if (arr.length < minLength) {
    return `Add at least ${minLength} ${fieldName.toLowerCase()}${minLength > 1 ? 's' : ''}`;
  }
  return null;
};