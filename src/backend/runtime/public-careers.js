import { createPublicJobsRepository } from '../repositories/public-jobs-repository.js';

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
  return `<article class="career-role-detail" id="role-detail">
    <div class="career-role-detail__head">
      <div><span class="eyebrow">${esc(job.category || 'Current opening')}</span><h2>${esc(job.title)}</h2><p>${esc(job.summary || '')}</p>${job.code ? `<span class="career-role-card__code">${esc(job.code)}</span>` : ''}</div>
      <a class="btn btn--primary career-apply-cta" href="/careers/jobs/${esc(job.slug)}/apply">Apply for this role <span aria-hidden="true">→</span></a>
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
    <div class="career-role-detail__footer"><a class="btn btn--primary" href="/careers/jobs/${esc(job.slug)}/apply">Apply now <span aria-hidden="true">→</span></a><a class="btn btn--secondary" href="/careers">Back to all openings</a></div>
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
        <span class="eyebrow">Application</span><h2>Application submission is not enabled yet</h2><p>This vacancy is published and available for review. Candidate document submission remains deliberately disabled until the Phase 12 private application workflow is completed and verified.</p>
        <div class="career-storage-notice" role="status"><strong>No application has been submitted.</strong><p>RC does not show a success state or collect documents until the approved persistence and notification workflow is active.</p></div>
        <div class="form-actions"><a class="btn btn--secondary" href="/careers/jobs/${esc(job.slug)}">Back to job description</a></div>
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
  try {
    return new URL(match?.[1] || requestUrl).origin;
  } catch {
    return new URL(requestUrl).origin;
  }
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

function employmentSchema(value) {
  return ({ full_time: 'FULL_TIME', part_time: 'PART_TIME', contract: 'CONTRACTOR', temporary: 'TEMPORARY', internship: 'INTERN' })[value] || null;
}

function locationSchema(job) {
  const location = String(job.location || '').trim();
  const isUk = /\bUK\b|United Kingdom|London/i.test(location);
  if (!isUk) return null;
  if (job.workplaceType === 'remote') {
    return {
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: { '@type': 'Country', name: 'United Kingdom' }
    };
  }
  const locality = location.split(',')[0]?.trim();
  if (!locality) return null;
  return {
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: locality, addressCountry: 'GB' }
    }
  };
}

function jobPostingJsonLd(job) {
  if (!job?.code || !job?.title || !job?.publishedAt) return null;
  const location = locationSchema(job);
  if (!location) return null;
  const description = [job.summary, job.description, ...(job.responsibilities || []), ...(job.qualifications || [])].filter(Boolean).join('\n\n');
  if (!description) return null;
  const document = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description,
    identifier: { '@type': 'PropertyValue', name: 'RC IT Services', value: job.code },
    datePosted: new Date(job.publishedAt).toISOString().slice(0, 10),
    hiringOrganization: { '@type': 'Organization', name: 'RC IT Services', sameAs: 'https://rcitcs.com' },
    directApply: false,
    ...location
  };
  const employmentType = employmentSchema(job.employmentType);
  if (employmentType) document.employmentType = employmentType;
  if (job.closesAt) document.validThrough = new Date(job.closesAt).toISOString();
  return document;
}

function injectJobPosting(html, job) {
  const data = jobPostingJsonLd(job);
  if (!data) return html;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return html.replace('</head>', `<script type="application/ld+json" data-rcitcs-job-posting>${json}</script></head>`);
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
  try {
    context = await repository.getCareersContext(slug);
  } catch {
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
    const description = `Application route for the published ${selected.title} vacancy at RC IT Services.`;
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
  html = injectJobPosting(html, selected);
  return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: publicHeaders(assetResponse.headers) });
}
