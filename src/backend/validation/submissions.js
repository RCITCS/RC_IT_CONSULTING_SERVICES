import { boundedText, isEmail, isPhone, requireFields } from './common.js';
import { validationError } from '../core/errors.js';

function contact(payload = {}) {
  const value = {
    firstName: boundedText(payload.firstName, 'firstName', 80),
    lastName: boundedText(payload.lastName, 'lastName', 80),
    company: boundedText(payload.company, 'company', 140),
    jobTitle: boundedText(payload.jobTitle, 'jobTitle', 140),
    email: boundedText(payload.email, 'email', 254),
    phone: boundedText(payload.phone, 'phone', 30),
    consultationTopic: boundedText(payload.consultationTopic, 'consultationTopic', 140),
    message: boundedText(payload.message, 'message', 4000),
    intent: boundedText(payload.intent, 'intent', 80) || 'General enquiry',
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
    name: boundedText(payload.name, 'name', 120),
    company: boundedText(payload.company, 'company', 140),
    businessEmail: boundedText(payload.businessEmail, 'businessEmail', 254),
    phone: boundedText(payload.phone, 'phone', 30),
    product: boundedText(payload.product, 'product', 120),
    notes: boundedText(payload.notes, 'notes', 3000)
  };
  requireFields(value, ['name', 'company', 'businessEmail', 'product']);
  if (!isEmail(value.businessEmail)) throw validationError('Enter a valid business email.', { fields: ['businessEmail'] });
  if (value.phone && !isPhone(value.phone)) throw validationError('Enter a valid phone number.', { fields: ['phone'] });
  return value;
}

function consultation(payload = {}) {
  const value = {
    name: boundedText(payload.name, 'name', 120),
    company: boundedText(payload.company, 'company', 140),
    businessEmail: boundedText(payload.businessEmail, 'businessEmail', 254),
    phone: boundedText(payload.phone, 'phone', 30),
    topic: boundedText(payload.topic, 'topic', 140),
    brief: boundedText(payload.brief, 'brief', 4000)
  };
  requireFields(value, ['name', 'company', 'businessEmail', 'topic']);
  if (!isEmail(value.businessEmail)) throw validationError('Enter a valid business email.', { fields: ['businessEmail'] });
  if (value.phone && !isPhone(value.phone)) throw validationError('Enter a valid phone number.', { fields: ['phone'] });
  return value;
}

function chat(payload = {}) {
  const value = {
    name: boundedText(payload.name, 'name', 120),
    company: boundedText(payload.company, 'company', 140),
    businessEmail: boundedText(payload.businessEmail, 'businessEmail', 254),
    message: boundedText(payload.message, 'message', 3000)
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
