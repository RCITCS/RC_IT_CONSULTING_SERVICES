import { IMAGES } from '../app/site-config.js';
import { getPublishedJob, getPublishedJobs } from '../app/career-job-catalog.js';
import { pageHero, sectionHeading, arrow, esc } from '../app/components.js';
import { field } from '../app/forms.js';
import { pageTitle } from '../app/render-helpers.js';

function jobMeta(job) {
  return [job.location, job.workStyle, job.employmentType, job.experience].filter(Boolean);
}

function jobListItem(job, selectedSlug = '') {
  const active = job.slug === selectedSlug;
  return `<a class="career-role-card${active ? ' is-active' : ''}" href="/careers/jobs/${esc(job.slug)}#role-detail"${active ? ' aria-current="page"' : ''}>
    <span class="career-role-card__department">${esc(job.department || 'Technology')}</span>
    <h3>${esc(job.title)}</h3>
    <div class="career-role-card__meta">${jobMeta(job).map((item)=>`<span>${esc(item)}</span>`).join('')}</div>
    ${job.jobCode ? `<span class="career-role-card__code">${esc(job.jobCode)}</span>` : ''}
  </a>`;
}

function detailList(title, items = []) {
  if (!items.length) return '';
  return `<section class="career-role-section"><h3>${esc(title)}</h3><ul>${items.map((item)=>`<li>${esc(item)}</li>`).join('')}</ul></section>`;
}

function tagGroup(title, items = []) {
  if (!items.length) return '';
  return `<section class="career-role-section career-role-section--tags"><h3>${esc(title)}</h3><div class="career-role-tags">${items.map((item)=>`<span>${esc(item)}</span>`).join('')}</div></section>`;
}

function roleDetail(job) {
  return `<article class="career-role-detail" id="role-detail">
    <div class="career-role-detail__head">
      <div><span class="eyebrow">${esc(job.department || 'Current opening')}</span><h2>${esc(job.title)}</h2><p>${esc(job.summary || '')}</p></div>
      <a class="btn btn--primary career-apply-cta" href="/careers/jobs/${esc(job.slug)}/apply">Apply for this role ${arrow()}</a>
    </div>
    <div class="career-role-facts" aria-label="Role facts">
      ${job.location ? `<div><span>Location</span><strong>${esc(job.location)}</strong></div>` : ''}
      ${job.workStyle ? `<div><span>Working style</span><strong>${esc(job.workStyle)}</strong></div>` : ''}
      ${job.employmentType ? `<div><span>Employment type</span><strong>${esc(job.employmentType)}</strong></div>` : ''}
      ${job.experience ? `<div><span>Experience</span><strong>${esc(job.experience)}</strong></div>` : ''}
    </div>
    ${tagGroup('Technology environment', job.technologies)}
    ${tagGroup('Industry context', job.industries)}
    ${(job.description || []).length ? `<section class="career-role-section"><h3>Job description</h3>${job.description.map((paragraph)=>`<p>${esc(paragraph)}</p>`).join('')}</section>` : ''}
    ${detailList('Key responsibilities', job.responsibilities)}
    ${detailList('Qualifications', job.qualifications)}
    ${detailList('Preferred qualifications', job.preferredQualifications)}
    ${detailList('Benefits & employment terms', job.benefits)}
    ${detailList('Nature of working style', job.workingStyle)}
    ${job.locationDetails ? `<section class="career-role-section"><h3>Location</h3><p>${esc(job.locationDetails)}</p></section>` : ''}
    <div class="career-role-detail__footer"><a class="btn btn--primary" href="/careers/jobs/${esc(job.slug)}/apply">Apply now ${arrow()}</a><a class="btn btn--secondary" href="/careers">Back to all openings</a></div>
  </article>`;
}

function emptyOpenings() {
  return `<div class="career-no-openings">
    <span class="eyebrow">Current openings</span>
    <h2>No roles are currently published.</h2>
    <p>RC only publishes approved vacancies with a defined role purpose, responsibilities, qualifications, working model and application route. We do not display placeholder jobs or collect speculative CVs through a separate resume page.</p>
    <p>When a role becomes available, it will appear here with the complete job description and a dedicated application journey.</p>
  </div>`;
}

function openingsBrowser(selectedSlug = '') {
  const jobs = getPublishedJobs();
  if (!jobs.length) return emptyOpenings();
  const selected = getPublishedJob(selectedSlug) || jobs[0];
  return `<div class="career-browser">
    <aside class="career-role-list" aria-label="Current openings">
      <div class="career-role-list__head"><span class="eyebrow">Current openings</span><strong>${jobs.length} ${jobs.length === 1 ? 'role' : 'roles'}</strong></div>
      <div class="career-role-list__items">${jobs.map((job)=>jobListItem(job, selected.slug)).join('')}</div>
    </aside>
    ${roleDetail(selected)}
  </div>`;
}

export function renderCareersPage(pathName = '/careers') {
  const match = pathName.match(/^\/careers\/jobs\/([^/]+)$/);
  const selectedSlug = match?.[1] || '';
  const selected = selectedSlug ? getPublishedJob(selectedSlug) : null;
  if (selectedSlug && !selected) return renderCareerRoleNotFound();

  pageTitle(selected ? `${selected.title} | Careers` : 'Careers');
  return `<main id="main-content" class="careers-page">
    ${pageHero({
      category:'Careers',
      title:'Build meaningful technology with accountable teams',
      lead:'Explore opportunities across consulting, application engineering, cloud, data, cyber security, quality engineering, support and industry technology. Every published role includes the context candidates need to assess fit before applying.',
      image:IMAGES.careersJob,
      imageAlt:'Candidate and interviewers discussing a professional role around a laptop in a real interview setting',
      crumbs:[{label:'Home',href:'/'},{label:'Careers'}]
    })}

    <section class="career-intro section"><div class="container career-intro__grid">
      <div><span class="eyebrow">Careers at RC</span><h2>Review the complete role before you apply.</h2><p>Current openings are organised around specific positions rather than a generic resume collection. Select a role to review its job description, technology environment, industry context, qualifications, experience level, working style and location.</p></div>
      <a class="btn btn--primary" href="#current-openings">View current openings ${arrow()}</a>
    </div></section>

    <section class="section section--soft" id="current-openings"><div class="container">
      ${sectionHeading('Current openings','Find a position that matches your experience','Select an opening from the role list. The full job description remains in the main panel so candidates can compare positions without navigating through disconnected career pages.')}
      ${openingsBrowser(selected?.slug || '')}
    </div></section>

    <section class="section"><div class="container">
      ${sectionHeading('Working at RC','Delivery standards shape the employee experience','Technology roles are organised around accountable delivery, professional engineering practices and clear client or project outcomes.')}
      <div class="career-principles">
        <article><span>01</span><h3>Client-impact work</h3><p>Roles are connected to defined business or delivery outcomes rather than artificial internal assignments.</p></article>
        <article><span>02</span><h3>Professional craft</h3><p>Engineering, consulting and delivery decisions are expected to be explainable, maintainable and grounded in the operating context.</p></article>
        <article><span>03</span><h3>Clear ownership</h3><p>Responsibilities, interfaces, quality expectations and escalation paths should be visible across teams and engagements.</p></article>
        <article><span>04</span><h3>Continuous learning</h3><p>Capability grows through real delivery, peer review, feedback and exposure to changing technologies and business environments.</p></article>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container">
      ${sectionHeading('Hiring journey','A structured process from application to decision','The exact interview sequence may vary by role, but candidates should understand the purpose of each stage and the position they are being assessed for.')}
      <div class="career-hiring-steps">
        <article><span>01</span><h3>Apply</h3><p>Submit your details against a specific published role together with the requested resume and cover letter.</p></article>
        <article><span>02</span><h3>Role review</h3><p>Relevant experience, capability and work context are reviewed against the actual vacancy requirements.</p></article>
        <article><span>03</span><h3>Interview / assessment</h3><p>Where appropriate, discussions explore practical experience, judgement, communication and role-specific capability.</p></article>
        <article><span>04</span><h3>Decision</h3><p>Next steps are communicated in the context of the published vacancy and applicable checks or approvals.</p></article>
      </div>
    </div></section>

    <section class="career-privacy section"><div class="container career-privacy__inner"><div><span class="eyebrow">Candidate privacy</span><h2>Apply only to a role you intend to be considered for.</h2><p>Candidate information is processed for recruitment purposes. Do not upload passwords, identity credentials or unnecessary sensitive information. Review the Privacy Policy before submitting an application.</p></div><a class="btn btn--secondary" href="/privacy">Read Privacy Policy</a></div></section>
  </main>`;
}

export function renderCareerApplicationPage(slug = '') {
  const job = getPublishedJob(slug);
  if (!job) return renderCareerRoleNotFound();
  pageTitle(`Apply · ${job.title}`);

  return `<main id="main-content" class="career-application-page">
    ${pageHero({
      category:'Careers · Application',
      title:`Apply for ${job.title}`,
      lead:`Submit your application specifically for ${job.jobCode ? `${job.jobCode} · ` : ''}${job.location || 'this role'}. Your resume and cover letter are requested separately so the recruitment team can assess the application against the published vacancy.`,
      image:IMAGES.careersResume,
      imageAlt:'Candidate presenting application documents to a recruiter in a real professional recruitment setting',
      crumbs:[{label:'Home',href:'/'},{label:'Careers',href:'/careers'},{label:job.title,href:`/careers/jobs/${job.slug}`},{label:'Apply'}]
    })}

    <section class="section"><div class="container career-application-layout">
      <aside class="career-application-summary">
        <span class="eyebrow">Role summary</span><h2>${esc(job.title)}</h2><p>${esc(job.summary || '')}</p>
        <dl>
          ${job.location ? `<div><dt>Location</dt><dd>${esc(job.location)}</dd></div>` : ''}
          ${job.workStyle ? `<div><dt>Working style</dt><dd>${esc(job.workStyle)}</dd></div>` : ''}
          ${job.employmentType ? `<div><dt>Employment type</dt><dd>${esc(job.employmentType)}</dd></div>` : ''}
          ${job.experience ? `<div><dt>Experience</dt><dd>${esc(job.experience)}</dd></div>` : ''}
        </dl>
        ${job.technologies?.length ? `<div class="career-application-tech"><strong>Core technologies</strong><div class="career-role-tags career-role-tags--compact">${job.technologies.slice(0,6).map((item)=>`<span>${esc(item)}</span>`).join('')}</div></div>` : ''}
        <a href="/careers/jobs/${esc(job.slug)}">Review full job description ${arrow()}</a>
      </aside>

      <div class="career-application-form-shell">
        <span class="eyebrow">Application</span><h2>Your details and documents</h2><p>Fields marked * are required. Resume and cover letter files may be up to 20 MB each and should be PDF, DOC or DOCX.</p>
        <form data-career-application novalidate>
          <input type="hidden" name="jobSlug" value="${esc(job.slug)}"><input type="hidden" name="jobCode" value="${esc(job.jobCode || '')}">
          <div class="form-grid">
            ${field('firstName','First Name','text',true)}${field('lastName','Last Name','text',true)}
            ${field('email','Email','email',true)}${field('phone','Phone Number','tel',true,'phone')}
            ${field('location','Current Location','text',true)}${field('linkedin','LinkedIn URL','url')}
            ${field('yearsExperience','Years of Experience','text',true)}${field('noticePeriod','Notice Period / Availability')}
            ${field('rightToWork','Right to Work / Visa Status')}${field('currentEmployer','Current Employer')}
            <div class="form-field form-field--full career-file-field"><label for="career-resume">Resume / CV *</label><input id="career-resume" name="resume" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-max-mb="20" required><small>PDF, DOC or DOCX · maximum 20 MB</small><span class="field-error"></span></div>
            <div class="form-field form-field--full career-file-field"><label for="career-cover-letter">Cover Letter *</label><input id="career-cover-letter" name="coverLetter" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-max-mb="20" required><small>PDF, DOC or DOCX · maximum 20 MB</small><span class="field-error"></span></div>
            <div class="form-field form-field--full"><label for="career-note">Additional information</label><textarea id="career-note" name="additionalInformation" placeholder="Add role-relevant context only if it is not already clear from your application documents."></textarea><span class="field-error"></span></div>
            <div class="form-field form-field--full"><label class="consent-row"><input type="checkbox" name="consent" required><span>I consent to RC processing this application and the uploaded documents for recruitment purposes. See the <a href="/privacy">Privacy Policy</a>.</span></label><span class="field-error"></span></div>
          </div>
          <div class="career-storage-notice" role="note"><strong>Application document handling</strong><p>The form is designed for private direct-to-storage uploads rather than sending 20 MB documents through the website function. Document submission will be enabled when the approved private recruitment storage is connected.</p></div>
          <div class="form-actions"><button class="btn btn--primary" type="submit" disabled aria-disabled="true">Application submission pending storage setup</button></div>
        </form>
      </div>
    </section>
  </main>`;
}

function renderCareerRoleNotFound() {
  pageTitle('Career role not found');
  return `<main id="main-content"><section class="section"><div class="container"><div class="career-no-openings"><span class="eyebrow">Careers</span><h1>This vacancy is not currently published.</h1><p>The role may have closed, moved or may not yet be approved for publication.</p><a class="btn btn--primary" href="/careers">View current openings</a></div></div></section></main>`;
}
