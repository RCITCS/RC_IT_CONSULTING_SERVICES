import { getPublishedJob } from './career-job-catalog.js';
import { arrow, esc } from './components.js';

function detailList(title, items = []) {
  if (!items.length) return '';
  return `<section class="career-role-section"><h3>${esc(title)}</h3><ul>${items.map((item)=>`<li>${esc(item)}</li>`).join('')}</ul></section>`;
}

function tagGroup(title, items = []) {
  if (!items.length) return '';
  return `<section class="career-role-section career-role-section--tags"><h3>${esc(title)}</h3><div class="career-role-tags">${items.map((item)=>`<span>${esc(item)}</span>`).join('')}</div></section>`;
}

function roleDetail(job) {
  return `<article class="career-role-detail" id="role-detail" data-career-active-detail tabindex="-1">
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

function slugFromPath(pathname = location.pathname) {
  return pathname.match(/^\/careers\/jobs\/([^/]+)$/)?.[1] || '';
}

function revealSelectedGroup(link) {
  const group = link?.closest('.career-role-group');
  if (!group) return;
  const toggle = group.querySelector('.career-role-group__toggle');
  const body = group.querySelector('.career-role-group__items');
  toggle?.setAttribute('aria-expanded', 'true');
  if (body) body.hidden = false;
}

function keepActiveRoleVisible(link) {
  const list = link?.closest('.career-role-list__items');
  if (!list || list.scrollHeight <= list.clientHeight) return;
  const listRect = list.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  if (linkRect.top < listRect.top) list.scrollTop -= listRect.top - linkRect.top + 8;
  else if (linkRect.bottom > listRect.bottom) list.scrollTop += linkRect.bottom - listRect.bottom + 8;
}

export function bindCareerRoleBrowser() {
  const browser = document.querySelector('.career-browser');
  if (!browser) return;

  const links = [...browser.querySelectorAll('.career-role-card')];
  if (!links.length) return;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const selectRole = (slug, { updateHistory = true } = {}) => {
    const job = getPublishedJob(slug);
    const selectedLink = links.find((link) => new URL(link.href, location.origin).pathname.endsWith(`/jobs/${slug}`));
    const currentDetail = browser.querySelector('.career-role-detail');
    if (!job || !selectedLink || !currentDetail) return false;

    const pageScrollY = window.scrollY;

    links.forEach((link) => {
      const isSelected = link === selectedLink;
      link.classList.toggle('is-active', isSelected);
      if (isSelected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    revealSelectedGroup(selectedLink);
    currentDetail.outerHTML = roleDetail(job);
    document.title = `${job.title} | Careers | RC IT Services`;

    if (updateHistory) history.pushState({ careerRole: slug }, '', `/careers/jobs/${slug}`);

    keepActiveRoleVisible(selectedLink);
    requestAnimationFrame(() => window.scrollTo({ top: pageScrollY, left: 0, behavior: 'auto' }));
    return true;
  };

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href, location.origin);
      const slug = slugFromPath(url.pathname);
      if (!slug) return;
      event.preventDefault();
      selectRole(slug);
    });
  });

  window.addEventListener('popstate', () => {
    const slug = slugFromPath();
    if (slug) selectRole(slug, { updateHistory: false });
  });
}
