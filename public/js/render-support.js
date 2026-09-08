import { IMAGES } from './site-config.js';
import { FAQS } from './pages.js';
import { LEGAL_PAGES } from './legal-content.js';
import { pageHero, sectionHeading, arrow, esc } from './components.js';
import { field } from './forms.js';
import { pageTitle } from './render-helpers.js';

export function renderResume() {
  pageTitle('Upload your Resume');
  return `<main id="main-content">${pageHero({category:'Careers',title:'Upload your Resume',lead:'Share your professional profile for consideration across technology, consulting and delivery opportunities. We use the information you provide to understand your capability, experience and work-authorisation context.',image:IMAGES.careersResume,imageAlt:'Candidate handing a resume to a recruiter during a real professional interview',crumbs:[{label:'Home',href:'/'},{label:'Careers',href:'/careers/job-opportunities'},{label:'Upload your Resume'}]})}
    <section class="section"><div class="container split"><div><span class="eyebrow">Candidate guidance</span><h2>Help us understand where your experience is strongest.</h2><p>Profiles are most useful when they clearly show the problems you have worked on, your role in delivery, the technologies or disciplines you know well and the outcomes you were responsible for. Avoid relying only on lists of tools without explaining delivery context.</p><ul class="list-check"><li>Summarise your strongest engineering, consulting or delivery capability.</li><li>Show recent project responsibilities and measurable contribution where appropriate.</li><li>Include current location and relevant work-authorisation status.</li><li>Provide a current CV in PDF, DOC or DOCX format.</li></ul></div><div class="topic-grid" style="grid-template-columns:1fr;"><article class="topic-card"><span class="eyebrow">Technology</span><h3>Engineering, cloud, data and security</h3><p>Application engineering, architecture, APIs, cloud/platform engineering, data engineering, analytics, cyber security, DevOps and quality engineering.</p></article><article class="topic-card"><span class="eyebrow">Consulting & delivery</span><h3>Business and transformation capability</h3><p>Business analysis, delivery management, technology consulting, risk, strategy, service management and implementation support.</p></article></div></div></section>
    <section class="section section--soft"><div class="container form-shell">${sectionHeading('Candidate profile','Tell us about your experience','Provide the information needed to understand your background, core skills and work-authorisation context. Submission does not guarantee a vacancy or interview; profiles may be considered when a relevant requirement becomes available.')}
      <form data-api-form="/api/resume" novalidate><div class="form-grid">${field('name','Name','text',true)}${field('email','Email','email',true)}${field('phone','Phone Number','tel',false,'phone')}${field('location','Current Location')} ${field('primarySkill','Primary Skill','text',true)}${field('yearsExperience','Years of Experience')} ${field('rightToWork','Right to Work / Visa Status')} ${field('linkedin','LinkedIn URL','url')}<div class="form-field form-field--full"><label for="resume-file">CV / Resume *</label><input id="resume-file" name="resumeFile" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required><span class="field-error"></span></div><div class="form-field form-field--full"><label style="display:flex;gap:.7rem;align-items:flex-start;font-weight:600"><input type="checkbox" name="consent" required style="width:18px;min-height:18px;margin-top:.2rem"> I consent to RC processing this information for recruitment purposes.</label><span class="field-error"></span></div></div><div class="form-actions"><button class="btn btn--primary" type="submit">Submit Profile</button><p class="form-status" data-form-status></p></div></form>
    </div></section></main>`;
}

export function renderJobs() {
  pageTitle('Job Opportunities');
  return `<main id="main-content">${pageHero({category:'Careers',title:'Job Opportunities',lead:'Explore opportunities to work across consulting, engineering, data, cloud, cyber security and technology delivery. Roles are published when an active requirement is available.',image:IMAGES.careersJob,imageAlt:'Candidate and interviewers discussing a role around a laptop in a real professional interview',crumbs:[{label:'Home',href:'/'},{label:'Careers'},{label:'Job Opportunities'}]})}
    <section class="section"><div class="container"><div class="empty-state career-vacancy-state"><span class="eyebrow">Current opportunities</span><h2>There are no published vacancies at this time.</h2><p>We do not display placeholder roles. When an active requirement is approved, the vacancy should include the role purpose, core responsibilities, required capability, location or working model and the appropriate application route.</p><p>Experienced technology and consulting professionals can still submit a profile for consideration when a relevant future requirement becomes available.</p><a class="btn btn--primary" href="/careers/upload-your-resume">Upload your Resume ${arrow()}</a></div></div></section>
    <section class="section section--soft"><div class="container">${sectionHeading('Capability areas','The disciplines we typically recruit around','Role availability changes with client demand and project scope. The capability map below indicates the professional disciplines relevant to the RC service portfolio; it does not represent current vacancies.')}<div class="topic-grid"><article class="topic-card"><h3>Engineering & Architecture</h3><p>Application development, APIs, integration, solution architecture, DevOps, platform engineering and technical leadership.</p></article><article class="topic-card"><h3>Cloud, Data & Security</h3><p>Cloud engineering, data engineering, analytics, cyber security, reliability and operational resilience.</p></article><article class="topic-card"><h3>Consulting & Delivery</h3><p>Business analysis, project delivery, transformation, risk, quality engineering, service management and implementation support.</p></article></div></div></section>
    <section class="section"><div class="container">${sectionHeading('Recruitment approach','Clear requirements and role context before selection','A professional recruitment process should make it clear what the role exists to achieve, how it fits the delivery environment and what evidence is needed from candidates.')}
      <div class="delivery-steps"><article><span>01</span><h3>Requirement</h3><p>The role is defined around an approved business or client requirement, responsibilities and expected capability.</p></article><article><span>02</span><h3>Profile review</h3><p>Relevant experience, delivery context, technical depth and role fit are assessed against the requirement.</p></article><article><span>03</span><h3>Discussion</h3><p>Where appropriate, interviews explore practical experience, judgement, communication and the candidate's role in previous delivery.</p></article><article><span>04</span><h3>Decision</h3><p>Any next steps should be communicated against the actual role and engagement context rather than a generic talent-pool promise.</p></article></div>
    </div></section></main>`;
}

export function renderFaqs() {
  pageTitle('FAQs');
  return `<main id="main-content">${pageHero({category:'FAQs',title:'Frequently Asked Questions',lead:'Answers to common questions about RC IT Services, engagement models, careers, products and access.',image:IMAGES.consulting,imageAlt:'Business and technology consultants in a real professional meeting',crumbs:[{label:'Home',href:'/'},{label:'FAQs'}]})}
    <section class="section"><div class="container"><div class="accordion">${FAQS.map(([q,a],i)=>`<div class="accordion-item" data-accordion-item><button class="accordion-trigger" type="button" data-accordion-trigger aria-expanded="false" aria-controls="faq-${i}"><span>${esc(q)}</span><span aria-hidden="true">+</span></button><div class="accordion-panel" id="faq-${i}"><p>${esc(a)}</p></div></div>`).join('')}</div></div></section></main>`;
}

export function renderBlog() {
  pageTitle('Blog');
  return `<main id="main-content">${pageHero({category:'Blog',title:'Insights and delivery perspectives',lead:'Perspectives on engineering, architecture, cloud, data, AI, management and industry technology, organised around the decisions and operating realities behind delivery.',image:IMAGES.whitePapers,imageAlt:'Professional research desk with laptop, documents and handwritten notes',crumbs:[{label:'Home',href:'/'},{label:'Blog'}]})}
    <section class="section"><div class="container">${sectionHeading('Editorial areas','Topics aligned to the service portfolio','The insights area is organised around the same disciplines RC supports through consulting and delivery. Published material should add decision context rather than repeat marketing copy.')}<div class="topic-grid"><article class="topic-card"><h3>Engineering & Architecture</h3><p>Maintainability, integration, quality, modernisation, platform decisions and delivery trade-offs.</p></article><article class="topic-card"><h3>Cloud, Data & AI</h3><p>Cloud transformation, data engineering, analytics, controlled AI adoption and operating governance.</p></article><article class="topic-card"><h3>Management & Industry</h3><p>Strategy, risk, sustainability and industry-specific technology context.</p></article></div></div></section></main>`;
}

export function renderLogin() {
  pageTitle('Login');
  return `<main id="main-content">${pageHero({category:'Login',title:'Client / Staff Login',lead:'Secure access is reserved for authorised RC client and staff users.',image:IMAGES.support,imageAlt:'Professional support team working with computers and headsets in a real office',crumbs:[{label:'Home',href:'/'},{label:'Login'}]})}
    <section class="section"><div class="container split"><div><span class="eyebrow">Secure access</span><h2>Access to RC workspaces is provisioned directly.</h2><p>Client and staff environments may contain project, delivery or operational information and are therefore not open for public self-registration. Access is provided to authorised users for the specific workspace or service they are entitled to use.</p><ul class="list-check"><li>Access is role-based and linked to an authorised business relationship.</li><li>Credentials and workspace permissions are managed through the relevant RC engagement.</li><li>Users who cannot access an expected workspace should contact their RC point of contact.</li></ul></div><div class="empty-state"><span class="eyebrow">Need access?</span><h2>Contact the RC team</h2><p>If you are an existing client, partner or staff member and require access assistance, use the contact page and identify the relevant project or service.</p><a class="btn btn--primary" href="/contact">Contact Us ${arrow()}</a></div></div></section></main>`;
}

function renderLegalTable(table) {
  if (!table) return '';
  return `<div class="legal-table-wrap" role="region" aria-label="Policy information table" tabindex="0"><table class="legal-table"><thead><tr>${table.headers.map((header)=>`<th scope="col">${esc(header)}</th>`).join('')}</tr></thead><tbody>${table.rows.map((row)=>`<tr>${row.map((cell)=>`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderLegalLinks(links) {
  if (!links?.length) return '';
  return `<div class="legal-links">${links.map(([label, href])=>{
    const external = /^https?:\/\//i.test(href);
    return `<a class="legal-link" href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(label)} ${arrow()}</a>`;
  }).join('')}</div>`;
}

function renderLegalSection(section) {
  return `<section class="legal-section" id="${esc(section.id)}">
    <h2>${esc(section.title)}</h2>
    ${(section.paragraphs || []).map((paragraph)=>`<p>${esc(paragraph)}</p>`).join('')}
    ${section.bullets?.length ? `<ul>${section.bullets.map((item)=>`<li>${esc(item)}</li>`).join('')}</ul>` : ''}
    ${renderLegalTable(section.table)}
    ${section.note ? `<aside class="legal-note"><strong>Important</strong><p>${esc(section.note)}</p></aside>` : ''}
    ${renderLegalLinks(section.links)}
  </section>`;
}

export function renderLegal(kind) {
  const policy = LEGAL_PAGES[kind];
  if (!policy) return renderNotFound();
  pageTitle(policy.title);

  const related = [
    ['/privacy','Privacy Policy'],
    ['/cookies','Cookie Policy'],
    ['/terms','Terms of Use']
  ].filter(([href])=>href !== kind);

  return `<main id="main-content" class="legal-page">
    ${pageHero({
      category:policy.category,
      title:policy.title,
      lead:policy.lead,
      image:IMAGES.legal,
      imageAlt:'Real professional desk with a contract, laptop and business documents',
      crumbs:[{label:'Home',href:'/'},{label:policy.title}]
    })}

    <section class="legal-summary-band">
      <div class="container legal-summary-grid">
        <div>
          <span class="eyebrow">Policy overview</span>
          <p class="legal-summary-copy">${esc(policy.summary)}</p>
          <p class="legal-updated"><strong>Last updated:</strong> ${esc(policy.updated)}</p>
        </div>
        <div class="legal-facts" aria-label="Policy summary details">
          ${policy.highlights.map(([label,value])=>`<div class="legal-fact"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section legal-body-section">
      <div class="container legal-layout">
        <aside class="legal-toc" aria-label="On this page">
          <div class="legal-toc__inner">
            <span class="legal-toc__label">On this page</span>
            <nav>${policy.sections.map((section)=>`<a href="#${esc(section.id)}">${esc(section.title.replace(/^\d+\.\s*/,''))}</a>`).join('')}</nav>
          </div>
        </aside>

        <article class="legal-document">
          <div class="legal-document__intro">
            <span class="eyebrow">RC IT Services governance</span>
            <h2>${esc(policy.title)}</h2>
            <p>${esc(policy.summary)}</p>
          </div>
          ${policy.sections.map(renderLegalSection).join('')}

          <section class="legal-related" aria-label="Related legal pages">
            <span class="eyebrow">Related policies</span>
            <h2>Legal and privacy information</h2>
            <div class="legal-related__grid">
              ${related.map(([href,label])=>`<a href="${href}"><span>${esc(label)}</span>${arrow()}</a>`).join('')}
              <a href="/contact"><span>Contact RC IT Services</span>${arrow()}</a>
            </div>
          </section>
        </article>
      </div>
    </section>
  </main>`;
}

export function renderNotFound() {
  pageTitle('Page not found');
  return `<main id="main-content"><section class="section"><div class="container"><div class="empty-state"><span class="eyebrow">404</span><h1>Page not found</h1><p>The page you requested could not be found. It may have moved, or the address may be incorrect.</p><div class="hero-actions"><a class="btn btn--primary" href="/">Home</a><a class="btn btn--secondary" href="/contact">Contact Us</a></div></div></div></section></main>`;
}