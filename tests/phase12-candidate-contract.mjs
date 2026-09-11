import assert from 'node:assert/strict';
import {
  CANDIDATE_CONSENT_VERSION,
  validateCandidateStartRequest,
  validateCandidateDocumentDescriptors
} from '../supabase/functions/_shared/candidate-application-contract.js';

const base = {
  jobSlug: 'senior-data-engineer',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ADA@example.com',
  phone: '+44 7700 900123',
  location: 'London, UK',
  linkedinUrl: 'https://www.linkedin.com/in/ada-lovelace',
  portfolioUrl: 'https://example.com/ada',
  consent: true,
  consentVersion: CANDIDATE_CONSENT_VERSION,
  website: '',
  documents: [{ kind: 'resume', fileName: 'ada-resume.pdf', mimeType: 'application/pdf', sizeBytes: 1024 }]
};

{
  const result = validateCandidateStartRequest({ ...base, coverLetterText: 'I am applying for this role.' });
  assert.equal(result.ok, true);
  assert.equal(result.candidate.email, 'ada@example.com');
  assert.equal(result.documents.length, 1);
}

{
  const result = validateCandidateStartRequest({
    ...base,
    coverLetterText: '',
    documents: [
      ...base.documents,
      { kind: 'cover_letter', fileName: 'cover.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 2048 }
    ]
  });
  assert.equal(result.ok, true, 'A cover-letter document must satisfy the cover letter/message requirement.');
}

{
  const result = validateCandidateStartRequest({ ...base, coverLetterText: '' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'COVER_LETTER_REQUIRED'));
}

{
  const result = validateCandidateStartRequest({ ...base, coverLetterText: 'Message', website: 'bot-filled' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'BOT_DETECTED'));
}

{
  const result = validateCandidateDocumentDescriptors([
    { kind: 'resume', fileName: 'resume.exe', mimeType: 'application/pdf', sizeBytes: 100 }
  ]);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'INVALID_FILE_TYPE'));
}

{
  const result = validateCandidateDocumentDescriptors([
    { kind: 'resume', fileName: 'resume.pdf', mimeType: 'application/pdf', sizeBytes: 20 * 1024 * 1024 + 1 }
  ]);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'INVALID_FILE_SIZE'));
}

console.log('PASS: Phase 12 requires validated candidate identity, affirmative consent, a resume, and either cover-letter message text or a private cover-letter document.');
