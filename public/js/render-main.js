import { COMPANY, IMAGES } from './site-config.js';
import { pageHero, sectionHeading, ctaPanel, arrow, esc } from './components.js';
import { field } from './forms.js';
import { pageTitle, imageTag } from './render-helpers.js';

function editorialImage(page) {
  return {
    image: page.secondaryImage || page.image,
    alt: page.secondaryImageAlt || page.imageAlt
  };
}

export function renderServicePage(page, servicePath) {
  pageTitle(page.title);
  const secondary = editorialImage(page);
  const dimensions = page.dimensions ? `<section class="section section--blue"><div class="container">${sectionHeading('Big Data dimensions', 'The operating characteristics that shape the data architecture')}<div class="topic-grid">${page.dimensions.map((d) => `<article class="topic-card"><h3>${esc(d)}</h3><p>Considered explicitly in data design, quality and operating decisions.</p></article>`).join('')}</div></div></section>` : '';
  return `<main id="main-content">
    ${pageHero({ ...page, crumbs: [{label:'Home',href:'/'},{label:'Services',href:'/services/it/consultancy-services'},{label:page.title}] })}
    <section class="section"><div class="container split"><div>${imageTag(secondary.image, secondary.alt)}</div><div><span class="eyebrow">Service overview</span><h2>${esc(page.introTitle)}</h2><p>${esc(page.intro)}</p><ul class="list-check">${page.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div></div></section>
    ${dimensions}
    <section class="section section--soft"><div class="container">${sectionHeading('HOW WE HELP', `How RC approaches ${page.title}`, 'Explore the specialist capabilities within this service area. Each one covers the business context, delivery approach, controls and expected outcomes relevant to the work.')}
      <div class="help-grid">${page.howWeHelp.map((item) => `<article class="help-card"><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><a class="btn btn--text" href="${esc(servicePath)}/${esc(item.slug)}">Read More ${arrow()}</a></article>`).join('')}</div>
    </div></section>
    ${ctaPanel(`Talk to us about ${page.title}`)}
  </main>`;
}

function capabilityOutcome(item, page) {
  return `${item.title} is treated as part of the wider ${page.title} service, with decisions tied to business outcomes, ownership, security, data quality, operational readiness and measurable acceptance criteria.`;
}

export function renderServiceDetail({ page, item, servicePath }) {
  pageTitle(`${item.title} | ${page.title}`);
  const siblings = page.howWeHelp.filter((candidate) => candidate.slug !== item.slug);
  const secondary = editorialImage(page);
  return `<main id="main-content" class="service-detail-page">
    ${pageHero({
      category:`${page.title} · How We Help`,
      title:item.title,
      lead:item.summary,
      image:page.image,
      imageAlt:page.imageAlt,
      crumbs:[{label:'Home',href:'/'},{label:'Services',href:'/services/it/consultancy-services'},{label:page.title,href:servicePath},{label:item.title}]
    })}

    <section class="section"><div class="container detail-intro">
      <div class="detail-intro__media">${imageTag(secondary.image, secondary.alt)}</div>
      <div class="detail-intro__copy"><span class="eyebrow">Capability overview</span><h2>${esc(item.title)} in practice</h2><p class="detail-lead">${esc(item.detail)}</p><p>${esc(capabilityOutcome(item, page))}</p><a class="detail-back-link" href="${esc(servicePath)}">← Back to ${esc(page.title)}</a></div>
    </div></section>

    <section class="section section--soft"><div class="container detail-two-column">
      <div><span class="eyebrow">What the work covers</span><h2>Connected to the complete service context.</h2><p>${esc(page.intro)}</p></div>
      <ol class="detail-scope-list">${page.bullets.map((bullet, index) => `<li><span>${String(index + 1).padStart(2,'0')}</span><div><strong>${esc(bullet)}</strong><p>Considered as part of the scope, architecture, implementation and operating model for ${esc(item.title)}.</p></div></li>`).join('')}</ol>
    </div></section>

    <section class="section"><div class="container">${sectionHeading('Delivery approach', `How we structure ${item.title}`, 'The exact engagement changes by client context, but the work moves through explicit discovery, design, implementation and verification rather than ending with an isolated recommendation.')}
      <div class="delivery-steps">
        <article><span>01</span><h3>Discover</h3><p>Clarify the business problem, users, current systems, constraints, risks, data and desired outcome.</p></article>
        <article><span>02</span><h3>Design</h3><p>Define responsibilities, architecture boundaries, controls, interfaces, measures and acceptance criteria.</p></article>
        <article><span>03</span><h3>Implement</h3><p>Deliver the agreed capability in controlled increments with engineering, quality and stakeholder feedback built in.</p></article>
        <article><span>04</span><h3>Validate & operate</h3><p>Verify the outcome, document ownership, monitor behaviour and establish the next improvement cycle.</p></article>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container detail-outcome">
      <div><span class="eyebrow">Expected result</span><h2>A capability that can be used, governed and improved.</h2></div>
      <p>${esc(item.summary)} The objective is a practical outcome that fits the organisation's wider technology and operating environment rather than a standalone deliverable with no ownership after launch.</p>
    </div></section>

    ${siblings.length ? `<section class="section"><div class="container">${sectionHeading('Related capabilities', `More within ${page.title}`, 'Continue into another capability without returning to the main navigation.')}
      <div class="related-capabilities">${siblings.map((candidate) => `<a href="${esc(servicePath)}/${esc(candidate.slug)}"><span>${esc(candidate.title)}</span>${arrow()}</a>`).join('')}</div>
    </div></section>` : ''}

    ${ctaPanel(`Discuss ${item.title}`, `Tell us what you need to achieve with ${item.title}, what systems or processes are involved and what constraints are already known.`)}
  </main>`;
}

export function renderIndustryPage(page) {
  pageTitle(page.title);
  const secondary = editorialImage(page);
  return `<main id="main-content">
    ${pageHero({ ...page, crumbs:[{label:'Home',href:'/'},{label:'Industry',href:'/industry/automotive-industry-it-services'},{label:page.title}] })}
    <section class="section"><div class="container split"><div>${imageTag(secondary.image,secondary.alt)}</div><div><span class="eyebrow">Industry context</span><h2>${esc(page.introTitle)}</h2><p>${esc(page.intro)}</p><ul class="list-check">${page.bullets.map((b)=>`<li>${esc(b)}</li>`).join('')}</ul></div></div></section>
    <section class="section section--soft"><div class="container">${sectionHeading('How we work', 'Industry context informs architecture and delivery', 'Security, data, integration, availability, compliance and operating requirements change by context. Our delivery approach is shaped around those realities.')}
      <div class="trust-strip"><div class="trust-item"><strong>Discover</strong><span>Clarify users, systems, constraints and required outcomes.</span></div><div class="trust-item"><strong>Design</strong><span>Define solution boundaries, risks, interfaces and quality attributes.</span></div><div class="trust-item"><strong>Deliver</strong><span>Implement, verify, release and support against explicit acceptance criteria.</span></div></div>
    </div></section>${ctaPanel(`Discuss ${page.title} requirements`)}</main>`;
}

export function renderAbout() {
  pageTitle('About Us');
  return `<main id="main-content">
    ${pageHero({
      category:'About Us',
      title:'Technology and consulting focused on lasting improvement',
      lead:'RC IT Services brings together technology consulting, digital transformation, management advisory and education consulting under R C OVERSEAS LTD.',
      image:IMAGES.about,
      imageAlt:'Professional technology and consulting team collaborating in a real office',
      crumbs:[{label:'Home',href:'/'},{label:'About Us'}]
    })}

    <section class="section"><div class="container split">
      <div>${imageTag(IMAGES.aboutDetail,'Engineers and technology professionals collaborating around project screens in a real office')}</div>
      <div><span class="eyebrow">Who we are</span><h2>Business understanding first. Technology applied with purpose.</h2>
        <p>We work with organisations that need to improve performance, modernise digital capabilities and turn strategy into practical delivery. Our approach is based on clear communication, transparent working relationships and teams that listen carefully to client priorities before recommending a solution.</p>
        <p>Technology programmes are most valuable when they improve the way a business operates. We therefore connect consulting, architecture, engineering and implementation so that digital change is tied to measurable business needs rather than isolated technology activity.</p>
        <ul class="list-check"><li>Technology consulting and digital transformation</li><li>Cloud, automation, artificial intelligence and data</li><li>Management consulting and implementation support</li><li>Education consulting and digital service capability</li></ul>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container">
      ${sectionHeading('How we work','Clarity in strategy. Discipline in engineering. Accountability in delivery.','These principles shape how we translate business priorities into technology decisions and how we carry those decisions through implementation and operation.')}
      <div class="topic-grid">
        <article class="topic-card"><h3>Clarity</h3><p>Make objectives, constraints, responsibilities and trade-offs explicit before complexity is introduced.</p></article>
        <article class="topic-card"><h3>Discipline</h3><p>Apply architecture, engineering, quality and security practices proportionate to the business risk and delivery context.</p></article>
        <article class="topic-card"><h3>Accountability</h3><p>Connect recommendations to ownership, measurable outcomes and an operating model that can sustain the delivered capability.</p></article>
      </div>
    </div></section>

    <section class="section"><div class="container split">
      <div><span class="eyebrow">Our direction</span><h2>Building capability for the next stage of business.</h2>
        <p>Our aim is to help clients remain relevant as technology, customer expectations and operating models change. That can include cloud modernisation, intelligent automation, secure digital platforms, data-driven decision support, connected systems and the management change required to make those capabilities useful.</p>
        <p>We also recognise that technology is only one part of transformation. Management and education consulting remain part of the broader RC service model where organisations need process, people and technology considerations to work together.</p>
      </div>
      <div class="topic-grid" style="grid-template-columns:1fr;">
        <article class="topic-card"><span class="eyebrow">Vision</span><h3>Help organisations use technology to create stronger, more adaptable businesses.</h3><p>We focus on practical improvement, responsible innovation and digital capability that can continue to evolve.</p></article>
        <article class="topic-card"><span class="eyebrow">Mission</span><h3>Connect strategy, technology and implementation through transparent delivery.</h3><p>We aim to make complex change easier to understand, govern and execute with clear responsibilities and measurable outcomes.</p></article>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container">
      ${sectionHeading('Corporate identity','R C OVERSEAS LTD')}
      <div class="trust-strip"><div class="trust-item"><strong>${esc(COMPANY.legalName)}</strong><span>Registered legal entity operating RC IT Services.</span></div><div class="trust-item"><strong>Company No. ${esc(COMPANY.companyNumber)}</strong><span>Registered in England and Wales.</span></div><div class="trust-item"><strong>London</strong><span>${esc(COMPANY.registeredOffice)}</span></div></div>
    </div></section>
    ${ctaPanel('Talk to RC IT Services','Tell us where your organisation is today, what needs to change and the outcome you need to achieve.')}
  </main>`;
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
  return `<main id="main-content">${pageHero({category:'Contact',title:'Contact Us',lead:'Tell us whether you need project delivery, specialist capability, managed support, a consultation or a partnership discussion. We will use the information you provide to route the enquiry to the appropriate service area.',image:IMAGES.contact,imageAlt:'Customer support professionals using headsets and computers in a real office',crumbs:[{label:'Home',href:'/'},{label:'Contact'}]})}
    <section class="section"><div class="container contact-grid"><div><span class="eyebrow">Contact options</span><h2>One destination, clear intent.</h2><div class="contact-options"><div class="contact-option"><h3>Write to Us</h3><p>Send a structured business enquiry through the form.</p><button class="btn btn--text" type="button" data-contact-intent="Write to Us">Start enquiry ${arrow()}</button></div><div class="contact-option"><h3>Talk to Us</h3><p>Request a phone conversation by including your number and preferred context.</p><button class="btn btn--text" type="button" data-contact-intent="Talk to Us">Request contact ${arrow()}</button></div><div class="contact-option"><h3>Email Us</h3><p>Use the business email field so the request can be routed correctly.</p><button class="btn btn--text" type="button" data-contact-intent="Email Us">Start enquiry ${arrow()}</button></div><div class="contact-option"><h3>Chat With Us</h3><p>Send a focused message to the technology team without leaving the page.</p><button class="btn btn--text" type="button" data-chat-now>Chat Now &gt;&gt;&gt;</button></div></div></div>
      <div id="contact-form">${sectionHeading('Enquiry form','Tell us how to route your request','Provide enough context for the team to understand the requirement, affected systems or service area, and the outcome you are trying to achieve.')}<form data-api-form="/api/contact" novalidate><input type="hidden" name="intent" id="contact-intent" value="General enquiry"><div class="form-grid">${field('firstName','First Name','text',true)}${field('lastName','Last Name','text',true)}${field('company','Company','text',true)}${field('phone','Phone Number','tel',true,'phone')}${field('businessEmail','Business Email','email',true)}${field('jobTitle','Job Title','text',true)}<div class="form-field form-field--full"><label for="message">Message</label><textarea id="message" name="message" placeholder="Describe your requirement, target outcome, known constraints and preferred timeline."></textarea><span class="field-error"></span></div></div><div class="form-actions"><button class="btn btn--primary" type="submit">Submit</button><p class="form-status" data-form-status></p></div></form></div></div></section>
    <section class="section section--soft"><div class="container split"><div>${imageTag(IMAGES.contactDetail,'Customer support team with headsets standing together in a real office')}</div><div>${sectionHeading('Registered office','Corporate details')}<div class="empty-state"><h2>${esc(COMPANY.legalName)}</h2><p>${esc(COMPANY.registeredOffice)}<br>Company No. ${esc(COMPANY.companyNumber)}</p></div></div></div></section>
    <section class="section"><div class="container">${sectionHeading('Map','Find the registered office')}<div style="overflow:hidden;border:1px solid var(--color-line);border-radius:.55rem;background:var(--color-surface-soft)"><iframe title="Map showing the registered office of R C OVERSEAS LTD" src="https://www.google.com/maps?q=93%20Metcalfe%20Court%20John%20Harrison%20Way%20London%20SE10%200BZ&output=embed" width="100%" height="420" style="display:block;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div></div></section></main>`;
}
