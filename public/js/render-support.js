import { IMAGES } from './site-config.js';
import { FAQS } from './pages.js';
import { LEGAL_PAGES } from './legal-content.js';
import { pageHero, sectionHeading, arrow, esc } from './components.js';
import { field } from './forms.js';
import { pageTitle } from './render-helpers.js';

export function renderResume() {
  pageTitle('Upload your Resume');
  return `<main id="main-content">${pageHero({category:'Careers',title:'Upload your Resume',lead:'Submit your professional profile securely with file validation and explicit recruitment consent.',image:IMAGES.careers,imageAlt:'Professional technology team in a modern office',crumbs:[{label:'Home',href:'/'},{label:'Careers',href:'/careers/job-opportunities'},{label:'Upload your Resume'}]})}
    <section class="section"><div class="container form-shell">${sectionHeading('Candidate profile','Upload your Resume')}
      <form data-api-form="/api/resume" novalidate><div class="form-grid">${field('name','Name','text',true)}${field('email','Email','email',true)}${field('phone','Phone Number','tel',false,'phone')}${field('location','Current Location')} ${field('primarySkill','Primary Skill','text',true)}${field('yearsExperience','Years of Experience')} ${field('rightToWork','Right to Work / Visa Status')} ${field('linkedin','LinkedIn URL','url')}<div class="form-field form-field--full"><label for="resume-file">CV / Resume *</label><input id="resume-file" name="resumeFile" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required><span class="field-error"></span></div><div class="form-field form-field--full"><label style="display:flex;gap:.7rem;align-items:flex-start;font-weight:600"><input type="checkbox" name="consent" required style="width:18px;min-height:18px;margin-top:.2rem"> I consent to RC processing this information for recruitment purposes.</label><span class="field-error"></span></div></div><div class="form-actions"><button class="btn btn--primary" type="submit">Submit</button><p class="form-status" data-form-status></p></div></form>
    </div></section></main>`;
}

export function renderJobs() {
  pageTitle('Job Opportunities');
  return `<main id="main-content">${pageHero({category:'Careers',title:'Job Opportunities',lead:'Explore current opportunities and submit your profile for future technology and consulting roles.',image:IMAGES.careers,imageAlt:'Technology professionals working together in an office',crumbs:[{label:'Home',href:'/'},{label:'Careers'},{label:'Job Opportunities'}]})}
    <section class="section"><div class="container"><div class="empty-state"><h2>No current roles are published.</h2><p>You can still submit your profile through Upload your Resume. When RC approves a vacancy, this page can render the role, location, work model, responsibilities and application path without changing the navigation architecture.</p><a class="btn btn--primary" href="/careers/upload-your-resume">Upload your Resume ${arrow()}</a></div></div></section></main>`;
}

export function renderFaqs() {
  pageTitle('FAQs');
  return `<main id="main-content">${pageHero({category:'FAQs',title:'Frequently Asked Questions',lead:'Answers to common questions about the service structure, engagement paths, careers and working website behaviour.',image:IMAGES.consulting,imageAlt:'Business consultation meeting',crumbs:[{label:'Home',href:'/'},{label:'FAQs'}]})}
    <section class="section"><div class="container"><div class="accordion">${FAQS.map(([q,a],i)=>`<div class="accordion-item" data-accordion-item><button class="accordion-trigger" type="button" data-accordion-trigger aria-expanded="false" aria-controls="faq-${i}"><span>${esc(q)}</span><span aria-hidden="true">+</span></button><div class="accordion-panel" id="faq-${i}"><p>${esc(a)}</p></div></div>`).join('')}</div></div></section></main>`;
}

export function renderBlog() {
  pageTitle('Blog');
  return `<main id="main-content">${pageHero({category:'Blog',title:'Insights and delivery notes',lead:'Perspectives on engineering, architecture, cloud, data, AI, management and industry technology.',image:IMAGES.whitePapers,imageAlt:'Professional reading and editorial workspace',crumbs:[{label:'Home',href:'/'},{label:'Blog'}]})}
    <section class="section"><div class="container">${sectionHeading('Editorial areas','Topics aligned to the service portfolio')}<div class="topic-grid"><article class="topic-card"><h3>Engineering & Architecture</h3><p>Maintainability, integration, quality and delivery decisions.</p></article><article class="topic-card"><h3>Cloud, Data & AI</h3><p>Modernisation, data engineering, analytics and controlled AI adoption.</p></article><article class="topic-card"><h3>Management & Industry</h3><p>Strategy, risk, sustainability and industry-specific technology context.</p></article></div></div></section></main>`;
}

export function renderLogin() {
  pageTitle('Login');
  return `<main id="main-content">${pageHero({category:'Login',title:'Client / Staff Login',lead:'Secure access for authorised client and staff portal users.',image:IMAGES.support,imageAlt:'Professional enterprise technology office',crumbs:[{label:'Home',href:'/'},{label:'Login'}]})}
    <section class="section"><div class="container form-shell"><form id="login-form" novalidate><div class="form-grid">${field('email','Email','email',true)}${field('password','Password','password',true)}</div><div class="form-actions"><button class="btn btn--primary" type="submit">Login</button><p class="form-status" id="login-status"></p></div></form></div></section></main>`;
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
      image:IMAGES.contact,
      imageAlt:'Professional corporate office environment',
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

          <aside class="legal-review-note">
            <strong>Corporate governance note</strong>
            <p>These public website policies are structured for RC IT Services and R C OVERSEAS LTD. They should be reviewed whenever production suppliers, analytics, CRM, recruitment storage, client portals or material data-processing activities change.</p>
          </aside>
        </article>
      </div>
    </section>
  </main>`;
}

export function renderNotFound() {
  pageTitle('Page not found');
  return `<main id="main-content"><section class="section"><div class="container"><div class="empty-state"><span class="eyebrow">404</span><h1>Page not found</h1><p>The requested route is not part of the approved website structure.</p><a class="btn btn--primary" href="/">Home</a></div></div></section></main>`;
}
