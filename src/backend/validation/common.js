import { validationError } from '../core/errors.js';

export function boundedText(value, field, max) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw validationError(`${field} must be text.`, { fields: [field] });
  }
  if (value.includes('\0')) {
    throw validationError(`${field} contains unsupported characters.`, { fields: [field] });
  }
  const normalized = value.trim();
  if (normalized.length > max) {
    throw validationError(`${field} must be ${max} characters or fewer.`, { fields: [field], maxLength: max });
  }
  return normalized;
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || ''));
}

export function isPhone(value) {
  return /^[+()\d\s.-]{7,30}$/.test(String(value || ''));
}

export function requireFields(record, fields) {
  const missing = fields.filter((field) => !record[field]);
  if (missing.length) {
    throw validationError(`Missing required fields: ${missing.join(', ')}`, { fields: missing });
  }
}
