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
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function paragraphs(value = '') {
  return String(value || '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
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

function roleDetail(job) {
  const description = paragraphs(job.description);
  return `<article class="career-role-detail" id="role-detail">
    <div class="career-role-detail__head">
      <div><span class="eyebrow">${esc(job.category || 'Current opening')}</span><h2>${esc(job.title)}</h2><p>${esc(job.summary || '')}</p></div>
      <a class="btn btn--primary career-apply-cta" href="/careers/jobs/${esc(job.slug)}/apply">Apply for this role <span aria-hidden="true">→</span></a>
    </div>
    <div class="career-role-facts" aria-label="Role facts">
      ${job.location ? `<div><span>Location</span><strong>${esc(job.location)}</strong></div>` : ''}
      ${job.workplaceType ? `<div><span>Working style</span><strong>${esc(enumLabel(job.workplaceType))}</strong></div>` : ''}
      ${job.employmentType ? `<div><span>Employment type</span><strong>${esc(enumLabel(job.employmentType))}</strong></div>` : ''}
      ${job.experience ? `<div><span>Experience</span><strong>${esc(job.experience)}</strong></div>` : ''}
    </div>
    ${tagGroup('Technology environment', job.technologies)}
    ${description.length ? `<section class="career-role-section"><h3>Job description</h3>${description.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}</section>` : ''}
    ${detailList('Key responsibilities', job.responsibilities)}
    ${detailList('Qualifications', job.qualifications)}
    ${detailList('Benefits & employment terms', job.benefits)}
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
        <dl>
          ${job.location ? `<div><dt>Location</dt><dd>${esc(job.location)}</dd></div>` : ''}
          ${job.workplaceType ? `<div><dt>Working style</dt><dd>${esc(enumLabel(job.workplaceType))}</dd></div>` : ''}
          ${job.employmentType ? `<div><dt>Employment type</dt><dd>${esc(enumLabel(job.employmentType))}</dd></div>` : ''}
          ${job.experience ? `<div><dt>Experience</dt><dd>${esc(job.experience)}</dd></div>` : ''}
        </dl>
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

function replaceMetaContent(html, selector, content) {
  const pattern = new RegExp(`(<meta ${selector} content=")[^"]*("\\s*\\/?>)`, 'i');
  return pattern.test(html) ? html.replace(pattern, `$1${esc(content)}$2`) : html;
}

function siteOriginFromHtml(html, requestUrl) {
  const match = html.match(/<link rel="canonical" href="([^"]+)"\s*\/?>/i);
  try {
    return new URL(match?.[1] || requestUrl).origin;
  } catch {
    return new URL(requestUrl).origin;
  }
}

function runtimeSeo(html, pathName, siteOrigin, { title, description, application = false, notFound = false } = {}) {
  const canonical = `${siteOrigin}${pathName}`;
  let output = html
    .replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${esc(canonical)}" />`)
    .replace(/data-prerendered-path="[^"]*"/, `data-prerendered-path="${esc(pathName)}"`);

  output = replaceMetaContent(output, 'name="description"', description);
  output = replaceMetaContent(output, 'name="robots"', 'noindex,nofollow');
  output = replaceMetaContent(output, 'property="og:title"', title);
  output = replaceMetaContent(output, 'property="og:description"', description);
  output = replaceMetaContent(output, 'property="og:url"', canonical);
  output = replaceMetaContent(output, 'name="twitter:title"', title);
  output = replaceMetaContent(output, 'name="twitter:description"', description);

  if (notFound) output = output.replace(/<link rel="canonical"[^>]*>/i, '');
  if (application) output = output.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, '');
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
  try {
    context = await repository.getCareersContext(slug);
  } catch {
    const html = runtimeSeo(replaceMain(baseHtml, unavailableMain()), pathName, siteOrigin, {
      title: 'Careers temporarily unavailable | RC IT Services',
      description: 'RC IT Services recruitment information is temporarily unavailable.'
    });
    return new Response(request.method === 'HEAD' ? null : html, { status: 503, headers: publicHeaders(assetResponse.headers, 503) });
  }

  const jobs = context.jobs;
  const selected = context.selected;

  if (pathName === '/careers') {
    const html = replaceOpenings(baseHtml, openingsBrowser(jobs, selected));
    return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: publicHeaders(assetResponse.headers) });
  }

  if (!selected || selected.slug !== slug) {
    const html = runtimeSeo(replaceMain(baseHtml, notFoundMain()), pathName, siteOrigin, {
      title: 'Career role not found | RC IT Services',
      description: 'The requested RC IT Services vacancy is not currently published.',
      notFound: true
    });
    return new Response(request.method === 'HEAD' ? null : html, { status: 404, headers: publicHeaders(assetResponse.headers, 404) });
  }

  if (applicationMatch) {
    const description = `Application route for the published ${selected.title} vacancy at RC IT Services.`;
    const html = runtimeSeo(replaceMain(baseHtml, applicationMain(selected)), pathName, siteOrigin, {
      title: `Apply for ${selected.title} | RC IT Services`,
      description,
      application: true
    });
    return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: publicHeaders(assetResponse.headers) });
  }

  const description = selected.summary || `Review the published ${selected.title} vacancy at RC IT Services.`;
  const html = runtimeSeo(replaceOpenings(baseHtml, openingsBrowser(jobs, selected)), pathName, siteOrigin, {
    title: `${selected.title} | Careers | RC IT Services`,
    description
  });
  return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: publicHeaders(assetResponse.headers) });
}
