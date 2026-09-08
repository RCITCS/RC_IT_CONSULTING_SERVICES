import { validationError } from '../core/errors.js';

export function cleanText(value, max = 4000) {
  return String(value ?? '').replace(/\0/g, '').trim().slice(0, max);
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(cleanText(value, 254));
}

export function isPhone(value) {
  return /^[+()\d\s.-]{7,30}$/.test(cleanText(value, 30));
}

export function requireFields(record, fields) {
  const missing = fields.filter((field) => !record[field]);
  if (missing.length) {
    throw validationError(`Missing required fields: ${missing.join(', ')}`, { fields: missing });
  }
}
