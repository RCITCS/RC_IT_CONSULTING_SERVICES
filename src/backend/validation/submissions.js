import { cleanText, isEmail, isPhone, requireFields } from './common.js';
import { validationError } from '../core/errors.js';

function contact(payload = {}) {
  const value = {
    firstName: cleanText(payload.firstName, 80),
    lastName: cleanText(payload.lastName, 80),
    company: cleanText(payload.company, 140),
    jobTitle: cleanText(payload.jobTitle, 140),
    email: cleanText(payload.email, 254),
    phone: cleanText(payload.phone, 30),
    consultationTopic: cleanText(payload.consultationTopic, 140),
    message: cleanText(payload.message, 4000),
    intent: cleanText(payload.intent, 80) || 'General enquiry',
    privacyConsent: payload.privacyConsent === true
  };
  requireFields(value, ['firstName', 'lastName', 'email', 'phone', 'consultationTopic', 'message']);
  if (!value.privacyConsent) throw validationError('Privacy confirmation is required.', { fields: ['privacyConsent'] });
  if (!isEmail(value.email)) throw validationError('Enter a valid email address.', { fields: ['email'] });
  if (!isPhone(value.phone)) throw validationError('Enter a valid phone number.', { fields: ['phone'] });
  return value;
}

function demo(payload = {}) {
  const value = {
    name: cleanText(payload.name, 120),
    company: cleanText(payload.company, 140),
    businessEmail: cleanText(payload.businessEmail, 254),
    phone: cleanText(payload.phone, 30),
    product: cleanText(payload.product, 120),
    notes: cleanText(payload.notes, 3000)
  };
  requireFields(value, ['name', 'company', 'businessEmail', 'product']);
  if (!isEmail(value.businessEmail)) throw validationError('Enter a valid business email.', { fields: ['businessEmail'] });
  if (value.phone && !isPhone(value.phone)) throw validationError('Enter a valid phone number.', { fields: ['phone'] });
  return value;
}

function consultation(payload = {}) {
  const value = {
    name: cleanText(payload.name, 120),
    company: cleanText(payload.company, 140),
    businessEmail: cleanText(payload.businessEmail, 254),
    phone: cleanText(payload.phone, 30),
    topic: cleanText(payload.topic, 140),
    brief: cleanText(payload.brief, 4000)
  };
  requireFields(value, ['name', 'company', 'businessEmail', 'topic']);
  if (!isEmail(value.businessEmail)) throw validationError('Enter a valid business email.', { fields: ['businessEmail'] });
  if (value.phone && !isPhone(value.phone)) throw validationError('Enter a valid phone number.', { fields: ['phone'] });
  return value;
}

function chat(payload = {}) {
  const value = {
    name: cleanText(payload.name, 120),
    company: cleanText(payload.company, 140),
    businessEmail: cleanText(payload.businessEmail, 254),
    message: cleanText(payload.message, 3000)
  };
  requireFields(value, ['name', 'businessEmail', 'message']);
  if (!isEmail(value.businessEmail)) throw validationError('Enter a valid business email.', { fields: ['businessEmail'] });
  return value;
}

const validators = Object.freeze({ contact, demo, consultation, chat });

export function validateSubmission(type, payload) {
  const validator = validators[type];
  if (!validator) throw validationError('Unsupported submission type.');
  return validator(payload);
}
