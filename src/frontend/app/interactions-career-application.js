const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const TUS_VERSION = '1.0.0';
const ALLOWED_DOCUMENTS = Object.freeze({
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});

function extensionOf(name = '') {
  return String(name).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
}

function documentDescriptor(kind, file) {
  if (!file) return null;
  const extension = extensionOf(file.name);
  if (!ALLOWED_DOCUMENTS[extension] || ALLOWED_DOCUMENTS[extension] !== file.type) {
    throw new Error(`${kind === 'resume' ? 'Resume' : 'Cover letter'} must be a PDF, DOC or DOCX file.`);
  }
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`${kind === 'resume' ? 'Resume' : 'Cover letter'} must be larger than 0 bytes and no more than 20 MB.`);
  }
  return Object.freeze({ kind, fileName: file.name, mimeType: file.type, sizeBytes: file.size });
}

function utf8Base64(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function uploadMetadata({ bucket, objectPath, mimeType }) {
  return [
    ['bucketName', bucket],
    ['objectName', objectPath],
    ['contentType', mimeType],
    ['cacheControl', 'no-store']
  ].map(([key, value]) => `${key} ${utf8Base64(value)}`).join(',');
}

async function parseApiResponse(response) {
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('The application service returned an invalid response.'); }
  if (!response.ok || payload?.ok !== true) {
    const error = new Error(String(payload?.message || 'The application could not be completed.'));
    error.code = String(payload?.code || 'APPLICATION_REJECTED');
    error.details = payload?.errors;
    throw error;
  }
  return payload;
}

async function applicationApi(body) {
  const response = await fetch('/api/career-application', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return parseApiResponse(response);
}

async function recoverOffset(uploadUrl, headers) {
  const response = await fetch(uploadUrl, {
    method: 'HEAD',
    headers: { ...headers, 'Tus-Resumable': TUS_VERSION },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('The secure upload could not be resumed.');
  const offset = Number(response.headers.get('upload-offset'));
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('The secure upload returned an invalid offset.');
  return offset;
}

async function patchChunk(uploadUrl, file, offset, chunkSize, headers) {
  const end = Math.min(file.size, offset + chunkSize);
  const chunk = file.slice(offset, end);
  const response = await fetch(uploadUrl, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Tus-Resumable': TUS_VERSION,
      'Upload-Offset': String(offset),
      'content-type': 'application/offset+octet-stream'
    },
    body: chunk
  });
  if (!response.ok) throw new Error('A secure upload chunk was rejected.');
  const nextOffset = Number(response.headers.get('upload-offset'));
  if (!Number.isSafeInteger(nextOffset) || nextOffset <= offset || nextOffset > file.size) {
    throw new Error('The secure upload returned an invalid progress offset.');
  }
  return nextOffset;
}

async function uploadTus(file, document, upload, onProgress) {
  const endpoint = String(upload.endpoint || '');
  if (!endpoint.startsWith('https://') || !endpoint.includes('/storage/v1/upload/resumable')) {
    throw new Error('Secure upload configuration is invalid.');
  }
  const chunkSize = Number(upload.chunkSize);
  if (chunkSize !== 6 * 1024 * 1024) throw new Error('Secure upload chunk configuration is invalid.');
  const sharedHeaders = {
    apikey: String(upload.apiKey || ''),
    'x-signature': String(document.signature || ''),
    'x-upsert': 'false'
  };
  if (!sharedHeaders.apikey || !sharedHeaders['x-signature']) throw new Error('Secure upload authorization is unavailable.');

  const createResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...sharedHeaders,
      'Tus-Resumable': TUS_VERSION,
      'Upload-Length': String(file.size),
      'Upload-Metadata': uploadMetadata({ bucket: upload.bucket, objectPath: document.objectPath, mimeType: file.type })
    }
  });
  if (createResponse.status !== 201) throw new Error('Secure upload could not be started.');
  const location = createResponse.headers.get('location');
  if (!location) throw new Error('Secure upload location is missing.');
  const uploadUrl = new URL(location, endpoint).toString();
  if (new URL(uploadUrl).origin !== new URL(endpoint).origin) throw new Error('Secure upload redirected to an unexpected origin.');

  let offset = Number(createResponse.headers.get('upload-offset') || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > file.size) offset = 0;
  onProgress(offset, file.size);

  while (offset < file.size) {
    let completed = false;
    let lastError;
    for (const delay of [0, 1000, 3000, 5000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        offset = await patchChunk(uploadUrl, file, offset, chunkSize, sharedHeaders);
        completed = true;
        onProgress(offset, file.size);
        break;
      } catch (error) {
        lastError = error;
        try {
          const recovered = await recoverOffset(uploadUrl, sharedHeaders);
          if (recovered > offset && recovered <= file.size) {
            offset = recovered;
            completed = true;
            onProgress(offset, file.size);
            break;
          }
        } catch { /* retry the original chunk */ }
      }
    }
    if (!completed) throw lastError || new Error('Secure upload failed.');
  }
}

function fieldValue(form, name) {
  return String(new FormData(form).get(name) || '').trim();
}

function candidatePayload(form) {
  return {
    firstName: fieldValue(form, 'firstName'),
    lastName: fieldValue(form, 'lastName'),
    email: fieldValue(form, 'email'),
    phone: fieldValue(form, 'phone'),
    location: fieldValue(form, 'location'),
    linkedinUrl: fieldValue(form, 'linkedinUrl'),
    portfolioUrl: fieldValue(form, 'portfolioUrl'),
    coverLetterText: fieldValue(form, 'coverLetterText'),
    consent: form.elements.consent?.checked === true,
    consentVersion: String(form.dataset.consentVersion || ''),
    website: fieldValue(form, 'website')
  };
}

function filesFor(form) {
  const resume = form.elements.resume?.files?.[0] || null;
  const coverLetter = form.elements.coverLetter?.files?.[0] || null;
  if (!resume) throw new Error('Please attach your resume or CV.');
  const files = new Map([['resume', resume]]);
  if (coverLetter) files.set('cover_letter', coverLetter);
  return files;
}

function setBusy(form, busy) {
  for (const element of form.elements) element.disabled = busy;
  form.setAttribute('aria-busy', busy ? 'true' : 'false');
}

function setStatus(region, message, state = 'info') {
  region.dataset.state = state;
  region.textContent = message;
  region.hidden = false;
}

function successView(form, payload) {
  const reference = String(payload.reference || '');
  const submittedAt = payload.submittedAt ? new Date(payload.submittedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const responseWindow = String(payload.responseWindow || '');
  const container = form.closest('.career-application-form-shell');
  if (!container) return;
  container.innerHTML = `<span class="eyebrow">Application received</span><h2>Thank you. Your application has been recorded.</h2><p>Your application is stored against this vacancy and is ready for recruitment review.</p><div class="career-application-confirmation"><span>Application reference</span><strong>${reference.replace(/[&<>"']/g, '')}</strong>${submittedAt ? `<small>Submitted ${submittedAt.replace(/[&<>"']/g, '')}</small>` : ''}</div>${responseWindow ? `<p><strong>Expected review timeline:</strong> ${responseWindow.replace(/[&<>"']/g, '')}</p>` : ''}<p class="muted">Keep the application reference for your records. Candidate email delivery is handled separately from this persistence confirmation.</p>`;
}

export function bindCareerApplication() {
  const form = document.querySelector('form[data-career-application]');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  const status = form.querySelector('[data-application-status]');
  if (!status) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    let intakeToken = '';
    try {
      const candidate = candidatePayload(form);
      const files = filesFor(form);
      if (!candidate.coverLetterText && !files.has('cover_letter')) {
        throw new Error('Add a cover-letter message or attach a cover-letter document.');
      }
      const documents = [...files].map(([kind, file]) => documentDescriptor(kind, file));

      setBusy(form, true);
      setStatus(status, 'Preparing your secure application…');
      const started = await applicationApi({
        action: 'start',
        jobSlug: String(form.dataset.jobSlug || ''),
        ...candidate,
        documents
      });
      intakeToken = String(started.intakeToken || '');
      if (!intakeToken || !started.upload?.documents?.length) throw new Error('Secure upload session was not created.');

      for (const document of started.upload.documents) {
        const file = files.get(document.kind);
        if (!file) throw new Error('Secure upload manifest does not match the selected documents.');
        await uploadTus(file, document, started.upload, (uploaded, total) => {
          const percent = total ? Math.min(100, Math.round((uploaded / total) * 100)) : 0;
          setStatus(status, `Uploading ${document.kind === 'resume' ? 'resume' : 'cover letter'} securely… ${percent}%`);
        });
      }

      setStatus(status, 'Validating documents and recording your application…');
      const completed = await applicationApi({ action: 'finalize', intakeToken, candidate });
      successView(form, completed);
    } catch (error) {
      if (intakeToken) {
        try { await applicationApi({ action: 'cancel', intakeToken }); } catch { /* scheduled cleanup remains authoritative */ }
      }
      setBusy(form, false);
      setStatus(status, error instanceof Error ? error.message : 'The application could not be completed.', 'error');
    }
  });
}
