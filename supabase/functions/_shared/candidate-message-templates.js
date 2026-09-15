const TEMPLATE_KEYS = Object.freeze({
  REVIEW_UPDATE: 'review_update',
  SHORTLISTED: 'shortlisted',
  INTERVIEW: 'interview',
  ASSESSMENT: 'assessment',
  OFFER_UPDATE: 'offer_update',
  REJECTION: 'rejection',
  WITHDRAWAL_ACK: 'withdrawal_ack'
});

export const CANDIDATE_MESSAGE_TEMPLATE_KEYS = TEMPLATE_KEYS;

export const CANDIDATE_MESSAGE_TEMPLATE_OPTIONS = Object.freeze([
  Object.freeze({ key: TEMPLATE_KEYS.REVIEW_UPDATE, label: 'Review update' }),
  Object.freeze({ key: TEMPLATE_KEYS.SHORTLISTED, label: 'Shortlisted' }),
  Object.freeze({ key: TEMPLATE_KEYS.INTERVIEW, label: 'Interview stage' }),
  Object.freeze({ key: TEMPLATE_KEYS.ASSESSMENT, label: 'Assessment stage' }),
  Object.freeze({ key: TEMPLATE_KEYS.OFFER_UPDATE, label: 'Offer-stage update' }),
  Object.freeze({ key: TEMPLATE_KEYS.REJECTION, label: 'Application outcome' }),
  Object.freeze({ key: TEMPLATE_KEYS.WITHDRAWAL_ACK, label: 'Withdrawal acknowledgement' })
]);

function text(value) {
  return String(value ?? '').trim();
}

function cleanHeader(value) {
  return text(value).replace(/[\r\n]+/g, ' ');
}

function persistedApplicationFields(application) {
  if (!application || typeof application !== 'object') throw new TypeError('Persisted application is required.');
  const firstName = text(application.first_name) || 'Candidate';
  const jobTitle = text(application.job_title) || 'the role you applied for';
  const reference = text(application.public_reference);
  if (!reference) throw new TypeError('Persisted application reference is required.');
  return Object.freeze({ firstName, jobTitle, reference });
}

export function candidateMessageTemplate(templateKey, application) {
  const key = text(templateKey).toLowerCase();
  const { firstName, jobTitle, reference } = persistedApplicationFields(application);
  const role = cleanHeader(jobTitle);
  const ref = cleanHeader(reference);
  const greeting = `Hi ${firstName},`;
  const signature = 'Regards,\nRC IT Services Recruitment Team';

  switch (key) {
    case TEMPLATE_KEYS.REVIEW_UPDATE:
      return Object.freeze({
        key,
        subject: `Application update — ${role} — ${ref}`,
        body: `${greeting}\n\nThank you for your application for ${jobTitle}. Your application is currently under review by our recruitment team.\n\nWe will contact you if we need additional information or when there is a further update.\n\nApplication reference: ${reference}\n\n${signature}`
      });
    case TEMPLATE_KEYS.SHORTLISTED:
      return Object.freeze({
        key,
        subject: `Application shortlisted — ${role} — ${ref}`,
        body: `${greeting}\n\nWe are pleased to let you know that your application for ${jobTitle} has progressed to our shortlist.\n\nOur recruitment team will contact you with the next-step details when they are confirmed.\n\nApplication reference: ${reference}\n\n${signature}`
      });
    case TEMPLATE_KEYS.INTERVIEW:
      return Object.freeze({
        key,
        subject: `Interview stage update — ${role} — ${ref}`,
        body: `${greeting}\n\nYour application for ${jobTitle} has progressed to the interview stage.\n\nOur recruitment team will provide the interview format, date, time and any preparation details separately once scheduling is confirmed.\n\nApplication reference: ${reference}\n\n${signature}`
      });
    case TEMPLATE_KEYS.ASSESSMENT:
      return Object.freeze({
        key,
        subject: `Assessment stage update — ${role} — ${ref}`,
        body: `${greeting}\n\nYour application for ${jobTitle} has progressed to the assessment stage.\n\nIf an assessment is required, our recruitment team will provide the instructions, deadline and access details separately.\n\nApplication reference: ${reference}\n\n${signature}`
      });
    case TEMPLATE_KEYS.OFFER_UPDATE:
      return Object.freeze({
        key,
        subject: `Application progress update — ${role} — ${ref}`,
        body: `${greeting}\n\nYour application for ${jobTitle} has progressed to the offer stage.\n\nThis message is a process update only. Any formal employment offer, compensation, conditions or contractual terms will be provided separately through the approved company process.\n\nApplication reference: ${reference}\n\n${signature}`
      });
    case TEMPLATE_KEYS.REJECTION:
      return Object.freeze({
        key,
        subject: `Application outcome — ${role} — ${ref}`,
        body: `${greeting}\n\nThank you for the time and effort you invested in applying for ${jobTitle}. After review, we will not be progressing your application further for this vacancy.\n\nWe appreciate your interest in RC IT Services and wish you well in your job search.\n\nApplication reference: ${reference}\n\n${signature}`
      });
    case TEMPLATE_KEYS.WITHDRAWAL_ACK:
      return Object.freeze({
        key,
        subject: `Application withdrawal acknowledged — ${role} — ${ref}`,
        body: `${greeting}\n\nWe acknowledge the withdrawal of your application for ${jobTitle}. No further recruitment action will be taken on this application unless you contact us and the application is formally reopened.\n\nApplication reference: ${reference}\n\n${signature}`
      });
    default:
      return null;
  }
}
