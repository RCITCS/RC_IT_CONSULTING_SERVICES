import { openDialog, showToast } from './ui.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE = /^[+()\d\s.-]{7,30}$/;

function setError(field, message = '') {
  const wrapper = field.closest('.form-field');
  const error = wrapper?.querySelector('.field-error');
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (error) error.textContent = message;
}

function validate(form) {
  let ok = true;
  const fields = [...form.querySelectorAll('input, textarea, select')];
  for (const field of fields) {
    if (field.disabled || field.type === 'hidden' || field.type === 'submit') continue;
    let message = '';
    if (field.required && field.type === 'checkbox' && !field.checked) message = 'This confirmation is required.';
    else if (field.required && !String(field.value || '').trim()) message = 'This field is required.';
    else if (field.type === 'email' && field.value && !EMAIL.test(field.value.trim())) message = 'Enter a valid email address.';
    else if (field.dataset.type === 'phone' && field.value && !PHONE.test(field.value.trim())) message = 'Enter a valid phone number.';
    else if (field.type === 'file' && field.files?.[0]) {
      const file = field.files[0];
      const allowed = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowed.includes(file.type)) message = 'Use PDF, DOC or DOCX.';
      else if (file.size > 5 * 1024 * 1024) message = 'File must be 5 MB or smaller.';
    }
    setError(field, message);
    if (message) ok = false;
  }
  const firstInvalid = form.querySelector('[aria-invalid="true"]');
  if (!ok && firstInvalid) firstInvalid.focus();
  return ok;
}

function formDataObject(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  for (const checkbox of form.querySelectorAll('input[type="checkbox"]')) data[checkbox.name] = checkbox.checked;
  return data;
}

async function submitJson(form, endpoint) {
  if (!validate(form)) return;
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  const original = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'Submitting…'; }
  if (status) { status.textContent = ''; status.style.color = ''; }
  try {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formDataObject(form))
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Submission failed.');
    form.reset();
    showToast(result.message || 'Submitted successfully.');
    if (status) { status.textContent = result.message || 'Submitted successfully.'; status.style.color = 'var(--color-success)'; }
  } catch (error) {
    const message = error?.message || 'Submission failed.';
    showToast(message, true);
    if (status) { status.textContent = message; status.style.color = 'var(--color-danger)'; }
  } finally {
    if (button) { button.disabled = false; button.textContent = original; }
  }
}

async function submitResume(form) {
  if (!validate(form)) return;
  const input = form.querySelector('input[type="file"]');
  const file = input?.files?.[0];
  if (!file) return;
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  const original = button?.textContent;
  button.disabled = true; button.textContent = 'Uploading…';
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const payload = formDataObject(form);
    payload.fileName = file.name;
    payload.mimeType = file.type;
    payload.fileBase64 = base64;
    const response = await fetch('/api/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'CV upload failed.');
    form.reset();
    showToast(result.message);
    if (status) { status.textContent = result.message; status.style.color = 'var(--color-success)'; }
  } catch (error) {
    const message = error?.message || 'CV upload failed.';
    showToast(message, true);
    if (status) { status.textContent = message; status.style.color = 'var(--color-danger)'; }
  } finally {
    button.disabled = false; button.textContent = original;
  }
}

export function bindForms() {
  document.querySelectorAll('form[data-api-form]:not([data-form-bound])').forEach((form) => {
    form.dataset.formBound = 'true';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const endpoint = form.dataset.apiForm;
      if (endpoint === '/api/resume') submitResume(form);
      else submitJson(form, endpoint);
    });
    form.querySelectorAll('input,textarea,select').forEach((field) => field.addEventListener('input', () => setError(field, '')));
  });

  document.querySelectorAll('[data-request-demo]:not([data-demo-bound])').forEach((button) => {
    button.dataset.demoBound = 'true';
    button.addEventListener('click', () => {
    const product = button.dataset.requestDemo || 'Product';
    openDialog(`demo-${product.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`, `Request a Demo · ${product}`, `
      <form data-api-form="/api/demo" novalidate>
        <div class="form-grid">
          ${field('name','Name','text',true)}${field('company','Company','text',true)}
          ${field('businessEmail','Business Email','email',true)}${field('phone','Phone Number','tel',false,'phone')}
          <input type="hidden" name="product" value="${product.replaceAll('"','&quot;')}">
          <div class="form-field form-field--full"><label for="demo-notes">What would you like to evaluate?</label><textarea id="demo-notes" name="notes"></textarea><span class="field-error"></span></div>
        </div>
        <div class="form-actions"><button class="btn btn--primary" type="submit">Submit</button><p class="form-status" data-form-status></p></div>
      </form>`);
    bindForms();
    });
  });
}

export function field(name, label, type = 'text', required = false, dataType = '') {
  const id = `field-${name}-${Math.random().toString(36).slice(2,7)}`;
  return `<div class="form-field"><label for="${id}">${label}${required ? ' *' : ''}</label><input id="${id}" name="${name}" type="${type}" ${required ? 'required' : ''} ${dataType ? `data-type="${dataType}"` : ''}><span class="field-error"></span></div>`;
}
