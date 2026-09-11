import { createPublicJobsRepository } from '../repositories/public-jobs-repository.js';
import { CANDIDATE_CONSENT_VERSION } from '../../../supabase/functions/_shared/candidate-application-contract.js';
import { appendRuntimeJobPosting, createRuntimeJobPosting } from './job-posting.js';

function esc(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function enumLabel(value = '') {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function paragraphs(value = '') {
  return String(value || '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

function publicDate(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', year: 'numeric', month: 'short', day: '2-digit'
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function jobMeta(job) {
  return [job.location, enumLabel(job.workplaceType), enumLabel(job.employmentType), job.experience].filter(Boolean);
}

function jobListItem(job, selectedSlug = '') {
  const active = job.slug === selectedSlug;
  return `<a class="career-role-card${active ? ' is-active' : ''}" href="/careers/jobs/${esc(job.slug)}#role-detail"${active ? ' aria-current="page"' : ''}>
    <span class="career-role-card__department">${esc(job.category || 'Technology')}</span>
    <h3>${esc(job.title)}</h3>
    <div class="career-role-card__meta">${jobMeta(job).map((item) => `<span>${esc(item)}</span>`).join('')}</div>
    ${job.code ? `<span class="career-role-card__code">${esc(job.code)}</span>` : ''}
  </a>`;
}

function detailList(title, items = []) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<section class="career-role-section"><h3>${esc(title)}</h3><ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>`;
}

function tagGroup(title, items = []) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<section class="career-role-section career-role-section--tags"><h3>${esc(title)}</h3><div class="career-role-tags">${items.map((item) => `<span>${esc(item)}</span>`).join('')}</div></section>`;
}

function fact(label, value) {
  if (value == null || String(value).trim() === '') return '';
  return `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

function roleDetail(job) {
  const description = paragraphs(job.description);
  const posted = publicDate(job.publishedAt);
  const closes = publicDate(job.closesAt);
  const applyHref = `/careers/jobs/${esc(job.slug)}/apply`;
  return `<article class="career-role-detail" id="role-detail">
    <div class="career-role-detail__head">
      <div><span class="eyebrow">${esc(job.category || 'Current opening')}</span><h2>${esc(job.title)}</h2><p>${esc(job.summary || '')}</p>${job.code ? `<span class="career-role-card__code">${esc(job.code)}</span>` : ''}</div>
      <a class="btn btn--primary career-apply-cta" href="${applyHref}">Apply for this role</a>
    </div>
    <div class="career-role-facts" aria-label="Role facts">
      ${fact('Location', job.location)}
      ${fact('Working style', job.workplaceType ? enumLabel(job.workplaceType) : '')}
      ${fact('Employment type', job.employmentType ? enumLabel(job.employmentType) : '')}
      ${fact('Experience', job.experience)}
      ${fact('Application response window', job.applicationResponseWindow)}
      ${fact('Posted', posted)}
      ${fact('Closing date', closes)}
    </div>
    ${tagGroup('Technology environment', job.technologies)}
    ${detailList('Required skills', job.requiredSkills)}
    ${detailList('Preferred skills', job.preferredSkills)}
    ${tagGroup('Industry context', job.industries)}
    ${description.length ? `<section class="career-role-section"><h3>Job description</h3>${description.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}</section>` : ''}
    ${detailList('Key responsibilities', job.responsibilities)}
    ${detailList('Qualifications', job.qualifications)}
    ${detailList('Preferred qualifications', job.preferredQualifications)}
    ${detailList('Benefits & employment terms', job.benefits)}
    ${detailList('Nature of working style', job.workingStyleDetails)}
    ${job.locationDetails ? `<section class="career-role-section"><h3>Location</h3><p>${esc(job.locationDetails)}</p></section>` : ''}
    <div class="career-role-detail__footer"><a class="btn btn--primary" href="${applyHref}">Apply now</a><a class="btn btn--secondary" href="/careers">Back to all openings</a></div>
  </article>`;
}

function emptyOpenings() {
  return `<div class="career-no-openings">
    <span class="eyebrow">Current openings</span>
    <h2>No roles are currently published.</h2>
    <p>RC only publishes approved vacancies with a defined role purpose, responsibilities, qualifications and working model. We do not display placeholder jobs or collect speculative CVs.</p>
    <p>When a role becomes available, it will appear here with the complete job description.</p>
  </div>`;
}

function openingsBrowser(jobs, selected = null) {
  if (!jobs.length || !selected) return emptyOpenings();
  return `<div class="career-browser">
    <aside class="career-role-list" aria-label="Current openings">
      <div class="career-role-list__head"><span class="eyebrow">Current openings</span><strong>${jobs.length} ${jobs.length === 1 ? 'role' : 'roles'}</strong></div>
      <div class="career-role-list__items">${jobs.map((job) => jobListItem(job, selected.slug)).join('')}</div>
    </aside>
    ${roleDetail(selected)}
  </div>`;
}

function applicationMain(job) {
  return `<main id="main-content" class="career-application-page">
    <section class="section section--soft"><div class="container"><div class="career-no-openings"><span class="eyebrow">Careers · Application</span><h1>Apply for ${esc(job.title)}</h1><p>${esc(job.code ? `${job.code} · ` : '')}${esc(job.location || 'RC IT Services')}</p></div></div></section>
    <section class="section"><div class="container career-application-layout">
      <aside class="career-application-summary">
        <span class="eyebrow">Role summary</span><h2>${esc(job.title)}</h2><p>${esc(job.summary || '')}</p>
        <dl>${job.location ? `<div><dt>Location</dt><dd>${esc(job.location)}</dd></div>` : ''}${job.workplaceType ? `<div><dt>Working style</dt><dd>${esc(enumLabel(job.workplaceType))}</dd></div>` : ''}${job.employmentType ? `<div><dt>Employment type</dt><dd>${esc(enumLabel(job.employmentType))}</dd></div>` : ''}${job.experience ? `<div><dt>Experience</dt><dd>${esc(job.experience)}</dd></div>` : ''}${job.applicationResponseWindow ? `<div><dt>Response window</dt><dd>${esc(job.applicationResponseWindow)}</dd></div>` : ''}</dl>
        ${job.technologies?.length ? `<div class="career-application-tech"><strong>Core technologies</strong><div class="career-role-tags career-role-tags--compact">${job.technologies.slice(0, 6).map((item) => `<span>${esc(item)}</span>`).join('')}</div></div>` : ''}
        <a href="/careers/jobs/${esc(job.slug)}">Review full job description <span aria-hidden="true">→</span></a>
      </aside>
      <div class="career-application-form-shell">
        <span class="eyebrow">Candidate application</span>
        <h2>Submit your application</h2>
        <p>Complete the candidate details below and attach your resume. Add a cover-letter message or attach a separate cover-letter document.</p>
        <form class="career-application-form" data-career-application data-job-slug="${esc(job.slug)}" data-consent-version="${esc(CANDIDATE_CONSENT_VERSION)}" method="post" action="/api/career-application">
          <div class="career-application-grid">
            <div class="form-field"><label for="candidate-first-name">First name *</label><input id="candidate-first-name" name="firstName" type="text" autocomplete="given-name" maxlength="80" required></div>
            <div class="form-field"><label for="candidate-last-name">Last name *</label><input id="candidate-last-name" name="lastName" type="text" autocomplete="family-name" maxlength="80" required></div>
            <div class="form-field"><label for="candidate-email">Email *</label><input id="candidate-email" name="email" type="email" autocomplete="email" maxlength="254" required></div>
            <div class="form-field"><label for="candidate-phone">Phone *</label><input id="candidate-phone" name="phone" type="tel" autocomplete="tel" maxlength="30" pattern="[+()0-9.\\-\\s]{7,30}" required></div>
            <div class="form-field"><label for="candidate-location">Location</label><input id="candidate-location" name="location" type="text" autocomplete="address-level2" maxlength="200"></div>
            <div class="form-field"><label for="candidate-linkedin">LinkedIn profile</label><input id="candidate-linkedin" name="linkedinUrl" type="url" inputmode="url" maxlength="500" placeholder="https://www.linkedin.com/in/..."></div>
            <div class="form-field career-application-grid__wide"><label for="candidate-portfolio">Portfolio / professional website</label><input id="candidate-portfolio" name="portfolioUrl" type="url" inputmode="url" maxlength="500" placeholder="https://..."></div>
          </div>
          <div class="form-field"><label for="candidate-cover-message">Cover-letter message</label><textarea id="candidate-cover-message" name="coverLetterText" maxlength="10000" rows="8" aria-describedby="cover-letter-help"></textarea><small id="cover-letter-help">Required unless you attach a separate cover-letter document below.</small></div>
          <div class="career-application-grid career-application-files">
            <div class="form-field career-file-field"><label for="candidate-resume">Resume / CV *</label><input id="candidate-resume" name="resume" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required><small>PDF, DOC or DOCX · maximum 20 MB · private storage.</small></div>
            <div class="form-field career-file-field"><label for="candidate-cover-file">Cover-letter document</label><input id="candidate-cover-file" name="coverLetter" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><small>Optional if you entered a cover-letter message · maximum 20 MB.</small></div>
          </div>
          <div class="career-honeypot" aria-hidden="true"><label for="candidate-website">Website</label><input id="candidate-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
          <label class="career-consent"><input name="consent" type="checkbox" required> <span>I consent to RC IT Services processing the information and private documents in this application for recruitment purposes. <a href="/privacy" target="_blank" rel="noopener">Privacy notice</a>.</span></label>
          <div class="career-storage-notice"><strong>Private document handling</strong><p>Your resume and optional cover-letter file are uploaded to private storage using a time-limited upload authorization. They are not published as public URLs.</p></div>
          <div class="career-application-status" data-application-status role="status" aria-live="polite" hidden></div>
          <div class="form-actions"><button class="btn btn--primary" type="submit">Submit application</button><a class="btn btn--secondary" href="/careers/jobs/${esc(job.slug)}">Back to job description</a></div>
        </form>
      </div>
    </section>
  </main>`;
}

function unavailableMain() {
  return `<main id="main-content" class="careers-page"><section class="section"><div class="container"><div class="career-no-openings"><span class="eyebrow">Careers</span><h1>Current openings are temporarily unavailable.</h1><p>The recruitment data service could not be reached. No vacancy state has been inferred or replaced with placeholder data.</p><p>Please try again shortly.</p></div></div></section></main>`;
}

function notFoundMain() {
  return `<main id="main-content" class="careers-page"><section class="section"><div class="container"><div class="career-no-openings"><span class="eyebrow">Careers</span><h1>This vacancy is not currently published.</h1><p>The role may be closed, archived, scheduled for a future opening, expired or unavailable.</p><a class="btn btn--primary" href="/careers">View current openings</a></div></div></section></main>`;
}

function replaceMain(html, main) {
  return html.replace(/<main id="main-content"[\s\S]*<\/main>/, main);
}

function replaceOpenings(html, content) {
  const marker = /<div class="career-no-openings">[\s\S]*?<\/div>/;
  if (!marker.test(html)) throw new Error('Careers runtime marker is missing from the production build.');
  return html.replace(marker, content);
}

function setMetaContent(html, selector, content) {
  const pattern = new RegExp(`(<meta ${selector} content=")[^"]*("\\s*\\/?>)`, 'i');
  if (pattern.test(html)) return html.replace(pattern, `$1${esc(content)}$2`);
  return html.replace('</head>', `<meta ${selector} content="${esc(content)}" /></head>`);
}

function siteOriginFromHtml(html, requestUrl) {
  const match = html.match(/<link rel="canonical" href="([^"]+)"\s*\/?>/i);
  try { return new URL(match?.[1] || requestUrl).origin; }
  catch { return new URL(requestUrl).origin; }
}

function runtimeSeo(html, pathName, siteOrigin, { title, description, robots = 'index,follow', notFound = false } = {}) {
  const canonical = `${siteOrigin}${pathName}`;
  let output = html
    .replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${esc(canonical)}" />`)
    .replace(/data-prerendered-path="[^"]*"/, `data-prerendered-path="${esc(pathName)}"`);
  output = setMetaContent(output, 'name="description"', description);
  output = setMetaContent(output, 'name="robots"', robots);
  output = setMetaContent(output, 'property="og:title"', title);
  output = setMetaContent(output, 'property="og:description"', description);
  output = setMetaContent(output, 'property="og:url"', canonical);
  output = setMetaContent(output, 'name="twitter:title"', title);
  output = setMetaContent(output, 'name="twitter:description"', description);
  if (notFound) output = output.replace(/<link rel="canonical"[^>]*>/i, '');
  return output;
}

async function careersAsset(request, env) {
  const assetUrl = new URL('/careers', request.url);
  const assetRequest = new Request(assetUrl.toString(), { method: 'GET', headers: { accept: 'text/html' } });
  const response = await env.ASSETS.fetch(assetRequest);
  if (!response.ok) throw new Error('Careers production asset is unavailable.');
  return { response, html: await response.text() };
}

function publicHeaders(sourceHeaders, status = 200) {
  const headers = new Headers(sourceHeaders);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  if (status >= 500) headers.set('cache-control', 'no-store');
  return headers;
}

export function isPublicCareersRuntimePath(pathname = '') {
  return pathname === '/careers'
    || /^\/careers\/jobs\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathname)
    || /^\/careers\/jobs\/[a-z0-9]+(?:-[a-z0-9]+)*\/apply$/.test(pathname);
}

export async function handlePublicCareersRequest(request, env, { fetchImpl = globalThis.fetch } = {}) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } });
  }

  const url = new URL(request.url);
  const pathName = url.pathname;
  const applicationMatch = pathName.match(/^\/careers\/jobs\/([^/]+)\/apply$/);
  const detailMatch = pathName.match(/^\/careers\/jobs\/([^/]+)$/);
  const slug = applicationMatch?.[1] || detailMatch?.[1] || '';
  const { response: assetResponse, html: baseHtml } = await careersAsset(request, env);
  const siteOrigin = siteOriginFromHtml(baseHtml, request.url);
  const repository = createPublicJobsRepository({ env, fetchImpl });

  let context;
  try { context = await repository.getCareersContext(slug); }
  catch {
    const html = runtimeSeo(replaceMain(baseHtml, unavailableMain()), pathName, siteOrigin, {
      title: 'Careers temporarily unavailable | RC IT Services',
      description: 'RC IT Services recruitment information is temporarily unavailable.',
      robots: 'noindex,nofollow'
    });
    return new Response(request.method === 'HEAD' ? null : html, { status: 503, headers: publicHeaders(assetResponse.headers, 503) });
  }

  const jobs = context.jobs;
  const selected = context.selected;

  if (pathName === '/careers') {
    const html = setMetaContent(replaceOpenings(baseHtml, openingsBrowser(jobs, selected)), 'name="robots"', 'index,follow');
    return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: publicHeaders(assetResponse.headers) });
  }

  if (!selected || selected.slug !== slug) {
    const html = runtimeSeo(replaceMain(baseHtml, notFoundMain()), pathName, siteOrigin, {
      title: 'Career role not found | RC IT Services',
      description: 'The requested RC IT Services vacancy is not currently published.',
      robots: 'noindex,nofollow',
      notFound: true
    });
    return new Response(request.method === 'HEAD' ? null : html, { status: 404, headers: publicHeaders(assetResponse.headers, 404) });
  }

  if (applicationMatch) {
    const description = `Secure application form for the published ${selected.title} vacancy at RC IT Services.`;
    const html = runtimeSeo(replaceMain(baseHtml, applicationMain(selected)), pathName, siteOrigin, {
      title: `Apply for ${selected.title} | RC IT Services`,
      description,
      robots: 'noindex,nofollow'
    });
    return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: publicHeaders(assetResponse.headers) });
  }

  const description = selected.summary || `Review the published ${selected.title} vacancy at RC IT Services.`;
  let html = runtimeSeo(replaceOpenings(baseHtml, openingsBrowser(jobs, selected)), pathName, siteOrigin, {
    title: `${selected.title} | Careers | RC IT Services`,
    description,
    robots: 'index,follow'
  });
  html = appendRuntimeJobPosting(html, createRuntimeJobPosting(selected, siteOrigin, pathName));
  return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: publicHeaders(assetResponse.headers) });
}
