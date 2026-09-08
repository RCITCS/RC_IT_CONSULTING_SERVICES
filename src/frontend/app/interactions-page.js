import { field, bindForms } from './forms.js';
import { openDialog, showToast } from './ui.js';

function applyContactIntent(intent) {
  const input = document.getElementById('contact-intent');
  if (input) input.value = intent;
}

export function bindContactOptions() {
  const params = new URLSearchParams(location.search);
  if (params.get('intent') === 'consultation') applyContactIntent('Consult our Expert');

  document.querySelectorAll('[data-chat-now]').forEach((button) => button.addEventListener('click', () => {
    openDialog('chat-with-us', 'Chat With Us', `
      <p>Send a message to the RC technology team. This message flow records the enquiry through the website endpoint.</p>
      <form data-api-form="/api/chat" novalidate>
        <div class="form-grid">${field('name','Name','text',true)}${field('businessEmail','Business Email','email',true)}${field('company','Company')}</div>
        <div class="form-field" style="margin-top:1rem"><label for="chat-message">Message *</label><textarea id="chat-message" name="message" required></textarea><span class="field-error"></span></div>
        <div class="form-actions"><button class="btn btn--primary" type="submit">Submit</button><p class="form-status" data-form-status></p></div>
      </form>`);
    bindForms();
  }));

  document.querySelectorAll('[data-contact-intent]').forEach((button) => button.addEventListener('click', () => {
    applyContactIntent(button.dataset.contactIntent);
    const form = document.getElementById('contact-form');
    form?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
    const topic = document.getElementById('consultation-topic');
    if (button.dataset.contactIntent === 'Consult our Expert' && topic) topic.focus({preventScroll:true});
    else form?.querySelector('input:not([type="hidden"])')?.focus({preventScroll:true});
  }));
}

export function bindLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.elements.email.value.trim(); const password = form.elements.password.value;
    const status = document.getElementById('login-status');
    if (!email || !password) { status.textContent = 'Email and password are required.'; status.style.color='var(--color-danger)'; return; }
    try {
      const response = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const result = await response.json();
      status.textContent = result.message; status.style.color = response.ok ? 'var(--color-success)' : 'var(--color-warning)';
      showToast(result.message, !response.ok);
    } catch { status.textContent='Login service is unavailable.'; status.style.color='var(--color-danger)'; }
  });
}
