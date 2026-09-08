import { COMPANY, IMAGES } from './site-config.js';
import { pageHero, sectionHeading, ctaPanel, arrow, esc } from './components.js';
import { field } from './forms.js';
import { pageTitle, imageTag } from './render-helpers.js';

export function renderServicePage(page) {
  pageTitle(page.title);
  const dimensions = page.dimensions ? `<section class="section section--blue"><div class="container">${sectionHeading('Big Data dimensions', 'The operating characteristics that shape the data architecture')}<div class="topic-grid">${page.dimensions.map((d) => `<article class="topic-card"><h3>${esc(d)}</h3><p>Considered explicitly in data design, quality and operating decisions.</p></article>`).join('')}</div></div></section>` : '';
  return `<main id="main-content">
    ${pageHero({ ...page, crumbs: [{label:'Home',href:'/'},{label:'Services',href:'/services/it/consultancy-services'},{label:page.title}] })}
    <section class="section"><div class="container split"><div>${imageTag(page.image, page.imageAlt)}</div><div><span class="eyebrow">Service overview</span><h2>${esc(page.introTitle)}</h2><p>${esc(page.intro)}</p><ul class="list-check">${page.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div></div></section>
    ${dimensions}
    <section class="section section--soft"><div class="container">${sectionHeading('HOW WE HELP', `How RC approaches ${page.title}`, 'Explore the practical capabilities within this service area and open each topic for additional detail.')}
      <div class="help-grid">${page.howWeHelp.map((item, index) => `<article class="help-card"><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><button class="btn btn--text" type="button" data-read-more data-dialog-id="detail-${index}" data-title="${esc(item.title)}" data-detail="${esc(item.detail)}">Read More ${arrow()}</button></article>`).join('')}</div>
    </div></section>
    ${ctaPanel(`Talk to us about ${page.title}`)}
  </main>`;
}

export function renderIndustryPage(page) {
  pageTitle(page.title);
  return `<main id="main-content">
    ${pageHero({ ...page, crumbs:[{label:'Home',href:'/'},{label:'Industry',href:'/industry/automotive-industry-it-services'},{label:page.title}] })}
    <section class="section"><div class="container split"><div>${imageTag(page.image,page.imageAlt)}</div><div><span class="eyebrow">Industry context</span><h2>${esc(page.introTitle)}</h2><p>${esc(page.intro)}</p><ul class="list-check">${page.bullets.map((b)=>`<li>${esc(b)}</li>`).join('')}</ul></div></div></section>
    <section class="section section--soft"><div class="container">${sectionHeading('How we work', 'Industry context informs architecture and delivery', 'We do not use an industry label as decoration. Security, data, integration, availability, compliance and operating requirements change by context.')}
      <div class="trust-strip"><div class="trust-item"><strong>Discover</strong><span>Clarify users, systems, constraints and required outcomes.</span></div><div class="trust-item"><strong>Design</strong><span>Define solution boundaries, risks, interfaces and quality attributes.</span></div><div class="trust-item"><strong>Deliver</strong><span>Implement, verify, release and support against explicit acceptance criteria.</span></div></div>
    </div></section>${ctaPanel(`Discuss ${page.title} requirements`)}</main>`;
}

export function renderAbout() {
  pageTitle('About Us');
  return `<main id="main-content">${pageHero({category:'About Us',title:'Technology delivery with clear ownership',lead:'RC IT Services is the dedicated technology-service presentation of R C OVERSEAS LTD, covering IT, management and education consulting capabilities.',image:IMAGES.about,imageAlt:'Professional technology team working together in a real office',crumbs:[{label:'Home',href:'/'},{label:'About Us'}]})}
    <section class="section"><div class="container split"><div>${imageTag(IMAGES.about,'Diverse professional team collaborating')}</div><div><span class="eyebrow">Company</span><h2>Built around delivery accountability.</h2><p>The company structure supports contract-based technology work, consulting and delivery teams. The website therefore emphasises clear capability, contact paths, careers intake and service ownership without inventing customer proof.</p><ul class="list-check"><li>Legal entity: ${esc(COMPANY.legalName)}</li><li>Company number: ${esc(COMPANY.companyNumber)}</li><li>IT consultancy activity aligned with the company SIC profile</li><li>Dedicated technology presentation separated from the education experience</li></ul></div></div></section>
    <section class="section section--soft"><div class="container">${sectionHeading('Delivery principles','What should remain true behind every page')}<div class="topic-grid"><article class="topic-card"><h3>Useful interactions</h3><p>Every interaction should have a clear purpose, destination and outcome.</p></article><article class="topic-card"><h3>Architecture before fashion</h3><p>Technology choices must match delivery and operational requirements.</p></article><article class="topic-card"><h3>Credibility through evidence</h3><p>Public claims should be specific, supportable and relevant to the service being discussed.</p></article></div></div></section>${ctaPanel()}</main>`;
}

export function renderProducts() {
  pageTitle('Our Products');
  return `<main id="main-content">${pageHero({category:'Our Products',title:'Products',lead:'Explore RC product capabilities and request a focused demonstration for your organisation.',image:IMAGES.products,imageAlt:'Professional laptop and digital product workspace',crumbs:[{label:'Home',href:'/'},{label:'Our Products'}]})}
    <section class="section"><div class="container">${sectionHeading('Product portfolio','Explore and request a demonstration','Select the product you want to evaluate and use Request a Demo to share your business context.')}
      <div class="product-grid"><article class="product-card"><span class="product-card__tag">Education platform</span><h3>Ed+ Cloud</h3><p>A cloud-based education platform designed to support connected student, service and operational workflows.</p><button class="btn btn--primary" type="button" data-request-demo="Ed+ Cloud">Request a Demo</button></article><article class="product-card"><span class="product-card__tag">Recruitment platform</span><h3>Recruit+ Cloud</h3><p>A cloud-based recruitment platform designed to support candidate, vacancy and hiring workflows.</p><button class="btn btn--primary" type="button" data-request-demo="Recruit+ Cloud">Request a Demo</button></article></div>
    </div></section>${ctaPanel('Need a product walkthrough?','Request a demonstration or contact the team with your evaluation requirements.')}</main>`;
}

export function renderWhitePapers() {
  pageTitle('White Papers');
  return `<main id="main-content">${pageHero({category:'Resources',title:'White Papers',lead:'A structured resource area for technology, management and industry perspectives.',image:IMAGES.whitePapers,imageAlt:'Real desk with professional reading and research materials',crumbs:[{label:'Home',href:'/'},{label:'White Papers'}]})}
    <section class="section"><div class="container">${sectionHeading('White Papers','Technology and management research themes','Explore research themes across cloud modernisation, data engineering and responsible AI delivery.')}
      <div class="topic-grid"><article class="topic-card"><h3>Cloud modernisation</h3><p>Architecture, migration, resilience and operating-model considerations.</p></article><article class="topic-card"><h3>Data engineering</h3><p>Reliable pipelines, governance, analytical models and operational quality.</p></article><article class="topic-card"><h3>Responsible AI delivery</h3><p>Use-case selection, evaluation, security, human oversight and integration.</p></article></div>
    </div></section>${ctaPanel('Looking for a specific point of view?','Use the consultation flow to tell us the technology or management topic you are evaluating.')}</main>`;
}

export function renderConsultExpert() {
  pageTitle('Consult our Expert');
  return `<main id="main-content">${pageHero({category:'Consult our Expert',title:'Start with the problem, not a sales script',lead:'Describe the outcome you need, the systems involved and the constraints already known. Share enough context for the request to be routed to the appropriate service area.',image:IMAGES.consulting,imageAlt:'Technology consultants in a professional business meeting',crumbs:[{label:'Home',href:'/'},{label:'Consult our Expert'}]})}
    <section class="section"><div class="container form-shell">${sectionHeading('Consultation request','Tell us what you need to solve')}
      <form data-api-form="/api/consultation" novalidate><div class="form-grid">${field('name','Name','text',true)}${field('company','Company','text',true)}${field('businessEmail','Business Email','email',true)}${field('phone','Phone Number','tel',false,'phone')}<div class="form-field form-field--full"><label for="topic">Consultation topic *</label><select id="topic" name="topic" required><option value="">Choose a topic</option><option>IT Consultancy</option><option>Cyber Security</option><option>Artificial Intelligence</option><option>Cloud Computing</option><option>Big Data / Data Engineering</option><option>IT Support Services</option><option>Management Consulting</option><option>Education Consultancy</option></select><span class="field-error"></span></div><div class="form-field form-field--full"><label for="brief">Brief</label><textarea id="brief" name="brief" placeholder="Business outcome, current systems, known constraints and target timeline"></textarea><span class="field-error"></span></div></div><div class="form-actions"><button class="btn btn--primary" type="submit">Submit</button><p class="form-status" data-form-status></p></div></form>
    </div></section></main>`;
}

export function renderContact() {
  pageTitle('Contact');
  return `<main id="main-content">${pageHero({category:'Contact',title:'Contact Us',lead:'Choose the contact path that matches what you need. The enquiry form validates the same core business fields used by the reference site.',image:IMAGES.contact,imageAlt:'Modern professional office workspace',crumbs:[{label:'Home',href:'/'},{label:'Contact'}]})}
    <section class="section"><div class="container contact-grid"><div><span class="eyebrow">Contact options</span><h2>One destination, clear intent.</h2><div class="contact-options"><div class="contact-option"><h3>Write to Us</h3><p>Send a structured business enquiry through the form.</p><button class="btn btn--text" type="button" data-contact-intent="Write to Us">Start enquiry ${arrow()}</button></div><div class="contact-option"><h3>Talk to Us</h3><p>Request a phone conversation by including your number and preferred context.</p><button class="btn btn--text" type="button" data-contact-intent="Talk to Us">Request contact ${arrow()}</button></div><div class="contact-option"><h3>Email Us</h3><p>Use the business email field so the request can be routed correctly.</p><button class="btn btn--text" type="button" data-contact-intent="Email Us">Start enquiry ${arrow()}</button></div><div class="contact-option"><h3>Chat With Us</h3><p>Send a focused message to the technology team without leaving the page.</p><button class="btn btn--text" type="button" data-chat-now>Chat Now &gt;&gt;&gt;</button></div></div></div>
      <div id="contact-form">${sectionHeading('Enquiry form','Tell us how to route your request')}<form data-api-form="/api/contact" novalidate><input type="hidden" name="intent" id="contact-intent" value="General enquiry"><div class="form-grid">${field('firstName','First Name','text',true)}${field('lastName','Last Name','text',true)}${field('company','Company','text',true)}${field('phone','Phone Number','tel',true,'phone')}${field('businessEmail','Business Email','email',true)}${field('jobTitle','Job Title','text',true)}<div class="form-field form-field--full"><label for="message">Message</label><textarea id="message" name="message"></textarea><span class="field-error"></span></div></div><div class="form-actions"><button class="btn btn--primary" type="submit">Submit</button><p class="form-status" data-form-status></p></div></form></div></div></section>
    <section class="section section--soft"><div class="container">${sectionHeading('Registered office','Corporate details')}<div class="empty-state"><h2>${esc(COMPANY.legalName)}</h2><p>${esc(COMPANY.registeredOffice)}<br>Company No. ${esc(COMPANY.companyNumber)}</p></div></div></section>
    <section class="section"><div class="container">${sectionHeading('Map','Find the registered office')}<div style="overflow:hidden;border:1px solid var(--color-line);border-radius:1rem;background:var(--color-surface-soft)"><iframe title="Map showing the registered office of R C OVERSEAS LTD" src="https://www.google.com/maps?q=93%20Metcalfe%20Court%20John%20Harrison%20Way%20London%20SE10%200BZ&output=embed" width="100%" height="420" style="display:block;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div></div></section></main>`;
}
