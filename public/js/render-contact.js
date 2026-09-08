import { COMPANY, IMAGES } from './site-config.js';
import { pageHero, sectionHeading, arrow, esc } from './components.js';
import { field } from './forms.js';
import { pageTitle, imageTag } from './render-helpers.js';

export function renderContact() {
  pageTitle('Contact');
  return `<main id="main-content" class="contact-page">
    ${pageHero({
      category:'Contact',
      title:'Contact RC IT Services',
      lead:'One contact route for consulting, project delivery, specialist capability, managed support, product enquiries, partnerships and general business questions. Tell us what you are trying to achieve and we will route the enquiry to the appropriate service area.',
      image:IMAGES.contact,
      imageAlt:'Professional customer service representative using a headset in a real modern office',
      crumbs:[{label:'Home',href:'/'},{label:'Contact'}]
    })}

    <section class="section"><div class="container split contact-intro">
      <div>${imageTag(IMAGES.contactDetail,'Professional customer support team using headsets and computers in a real office')}</div>
      <div><span class="eyebrow">Business & consultation enquiries</span><h2>One destination. Clear routing.</h2>
        <p>We have consolidated general contact and expert consultation into one professional enquiry journey. You do not need to decide which internal team to approach before contacting us.</p>
        <p>Start with the business outcome, current environment, affected users or systems, target timeline and any constraints already known. The consultation topic in the form helps route the enquiry without creating multiple competing contact pages.</p>
        <ul class="list-check"><li>Technology strategy and architecture</li><li>Application, cloud, data and AI modernisation</li><li>Cyber security and IT support</li><li>Management and education consultancy</li><li>Products, partnerships and general business enquiries</li></ul>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container">
      ${sectionHeading('Contact options','Choose the route that matches your intent','Each option uses the same enquiry form. The selected intent is retained so your message arrives with the right context.')}
      <div class="contact-options contact-options--grid">
        <div class="contact-option"><span>01</span><h3>Consult our Expert</h3><p>Bring a technology decision, delivery problem, capability gap or transformation requirement into a focused discussion.</p><button class="btn btn--text" type="button" data-contact-intent="Consult our Expert">Start consultation ${arrow()}</button></div>
        <div class="contact-option"><span>02</span><h3>Write to Us</h3><p>Send a structured business enquiry with the relevant project, service or partnership context.</p><button class="btn btn--text" type="button" data-contact-intent="Write to Us">Start enquiry ${arrow()}</button></div>
        <div class="contact-option"><span>03</span><h3>Talk to Us</h3><p>Request a phone conversation and include your number, organisation and the subject you want to discuss.</p><button class="btn btn--text" type="button" data-contact-intent="Talk to Us">Request contact ${arrow()}</button></div>
        <div class="contact-option"><span>04</span><h3>Chat With Us</h3><p>Send a focused message to the technology team without leaving the current page.</p><button class="btn btn--text" type="button" data-chat-now>Chat Now &gt;&gt;&gt;</button></div>
      </div>
    </div></section>

    <section class="section"><div class="container contact-form-layout">
      <div><span class="eyebrow">What to include</span><h2>Help us understand the requirement.</h2>
        <p>A useful first enquiry does not need to be a complete specification. It should give enough information to understand the problem, determine the relevant capability and decide the next step.</p>
        <div class="contact-guidance">
          <div><strong>Business context</strong><span>What is changing, what is not working, or what decision needs to be made?</span></div>
          <div><strong>Technology context</strong><span>Which applications, platforms, data, integrations or teams are involved?</span></div>
          <div><strong>Timing</strong><span>Is there a target date, dependency, procurement window or urgent issue?</span></div>
          <div><strong>Outcome</strong><span>What would a successful engagement improve or enable?</span></div>
        </div>
      </div>

      <div id="contact-form" class="contact-form-panel">
        ${sectionHeading('Enquiry form','Tell us how to route your request','Select the consultation topic and provide enough context for the team to understand the requirement and appropriate next step.')}
        <form data-api-form="/api/contact" novalidate>
          <input type="hidden" name="intent" id="contact-intent" value="General enquiry">
          <div class="form-grid">
            ${field('firstName','First Name','text',true)}
            ${field('lastName','Last Name','text',true)}
            ${field('company','Company','text',true)}
            ${field('phone','Phone Number','tel',true,'phone')}
            ${field('businessEmail','Business Email','email',true)}
            ${field('jobTitle','Job Title','text',true)}
            <div class="form-field form-field--full"><label for="consultation-topic">Consultation topic *</label><select id="consultation-topic" name="consultationTopic" required><option value="">Choose a topic</option><option>IT Consultancy</option><option>Cyber Security</option><option>Artificial Intelligence</option><option>Cloud Computing</option><option>Big Data / Data Engineering</option><option>IT Support Services</option><option>Risk & Management Consulting</option><option>Strategy and Implementation</option><option>Sustainability</option><option>Education Consultancy</option><option>Products / Demonstration</option><option>Partnership</option><option>General Business Enquiry</option></select><span class="field-error"></span></div>
            <div class="form-field form-field--full"><label for="message">Message</label><textarea id="message" name="message" placeholder="Describe your requirement, target outcome, current environment, known constraints and preferred timeline."></textarea><span class="field-error"></span></div>
          </div>
          <div class="form-actions"><button class="btn btn--primary" type="submit">Submit Enquiry</button><p class="form-status" data-form-status></p></div>
        </form>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container contact-office-grid">
      <div>${sectionHeading('Registered office','Corporate details','The registered-office details below identify the legal entity operating RC IT Services.')}<div class="empty-state"><h2>${esc(COMPANY.legalName)}</h2><p>${esc(COMPANY.registeredOffice)}<br>Company No. ${esc(COMPANY.companyNumber)}</p></div></div>
      <div><span class="eyebrow">After you submit</span><h2>Clear routing and next-step ownership.</h2><p>The enquiry is reviewed against the selected topic and business context. Where a follow-up is appropriate, the next step may be clarification, a focused consultation, product demonstration or scoped delivery discussion.</p><p>Do not include passwords, secret keys, payment-card data or other unnecessary sensitive information in a public website enquiry.</p></div>
    </div></section>

    <section class="section"><div class="container">${sectionHeading('Map','Find the registered office')}<div style="overflow:hidden;border:1px solid var(--color-line);border-radius:.55rem;background:var(--color-surface-soft)"><iframe title="Map showing the registered office of R C OVERSEAS LTD" src="https://www.google.com/maps?q=93%20Metcalfe%20Court%20John%20Harrison%20Way%20London%20SE10%200BZ&output=embed" width="100%" height="420" style="display:block;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div></div></section>
  </main>`;
}
