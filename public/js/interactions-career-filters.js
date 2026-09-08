import { getPublishedJobs } from './career-job-catalog.js';

const CATEGORY_ORDER = [
  'Data, Analytics & AI',
  'Application Engineering',
  'Cloud, DevOps & Platform',
  'Cyber Security & Risk',
  'Quality Engineering',
  'Consulting & Delivery',
  'Technical Support & Operations',
  'Talent & Recruitment',
  'Industry Engineering',
  'Other Technology Roles'
];

function slugFromCard(card) {
  try {
    const url = new URL(card.href, location.origin);
    return url.pathname.match(/^\/careers\/jobs\/([^/]+)/)?.[1] || '';
  } catch {
    return '';
  }
}

function categoryFor(job = {}) {
  const title = String(job.title || '').toLowerCase();
  const department = String(job.department || '').toLowerCase();
  const combined = `${department} ${title}`;

  if (/data|analytics|business intelligence|bi engineer|data scientist|machine learning|mlops|artificial intelligence/.test(combined)) return 'Data, Analytics & AI';
  if (/cyber|security|soc |risk|compliance/.test(combined)) return 'Cyber Security & Risk';
  if (/quality|qa |test engineer|automation engineer/.test(combined)) return 'Quality Engineering';
  if (/cloud|devops|site reliability|sre|platform engineer|infrastructure/.test(combined)) return 'Cloud, DevOps & Platform';
  if (/support|service desk|call centre|call center|customer assistance|customer support|technical assistance|operations support/.test(combined)) return 'Technical Support & Operations';
  if (/recruit|talent acquisition|talent /.test(combined)) return 'Talent & Recruitment';
  if (/automotive|media platform|education platform|industry/.test(combined)) return 'Industry Engineering';
  if (/business analyst|consult|delivery manager|strategy|sustainability|project manager|programme manager|program manager/.test(combined)) return 'Consulting & Delivery';
  if (/application|software|full stack|frontend|front-end|backend|back-end|\.net|java|microservices|developer|engineer/.test(combined)) return 'Application Engineering';
  return 'Other Technology Roles';
}

function searchableText(job, card) {
  return [
    job?.title,
    job?.department,
    job?.summary,
    job?.location,
    job?.workStyle,
    job?.employmentType,
    job?.experience,
    ...(job?.technologies || []),
    ...(job?.industries || []),
    card?.textContent
  ].filter(Boolean).join(' ').toLowerCase();
}

function safeText(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function bindCareerFilters() {
  const list = document.querySelector('.career-role-list');
  const items = list?.querySelector('.career-role-list__items');
  const count = list?.querySelector('.career-role-list__head > strong');
  if (!list || !items || !count || list.querySelector('[data-career-filters]')) return;

  const cards = [...items.querySelectorAll('.career-role-card')];
  if (!cards.length) return;

  const jobs = getPublishedJobs();
  const jobsBySlug = new Map(jobs.map((job) => [job.slug, job]));
  const cardRecords = cards.map((card) => {
    const slug = slugFromCard(card);
    const job = jobsBySlug.get(slug) || {};
    const category = categoryFor(job);
    return { card, job, category, searchText: searchableText(job, card) };
  });

  const categories = CATEGORY_ORDER.filter((category) => cardRecords.some((record) => record.category === category));

  const filters = document.createElement('div');
  filters.className = 'career-role-filters';
  filters.dataset.careerFilters = 'true';
  filters.innerHTML = `
    <label class="career-role-search">
      <span class="career-role-filter-label">Search openings</span>
      <input type="search" placeholder="Search by job title, skill or keyword" autocomplete="off" data-career-search>
    </label>
    <label class="career-role-department-filter">
      <span class="career-role-filter-label">Job category</span>
      <select data-career-department>
        <option value="">All categories</option>
        ${categories.map((category)=>`<option value="${safeText(category)}">${safeText(category)}</option>`).join('')}
      </select>
    </label>
  `;
  list.querySelector('.career-role-list__head')?.insertAdjacentElement('afterend', filters);

  items.innerHTML = '';
  const groups = new Map();
  const activeRecord = cardRecords.find(({ card }) => card.classList.contains('is-active'));

  categories.forEach((category) => {
    const records = cardRecords.filter((record) => record.category === category);
    const group = document.createElement('section');
    group.className = 'career-role-group';
    group.dataset.careerGroup = category;

    const shouldOpen = activeRecord?.category === category || categories.length <= 3;
    group.innerHTML = `
      <button class="career-role-group__toggle" type="button" aria-expanded="${shouldOpen ? 'true' : 'false'}">
        <span>${safeText(category)}</span>
        <span class="career-role-group__count">${records.length}</span>
        <span class="career-role-group__chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="career-role-group__items"${shouldOpen ? '' : ' hidden'}></div>
    `;

    const groupItems = group.querySelector('.career-role-group__items');
    records.forEach(({ card }) => groupItems.appendChild(card));
    items.appendChild(group);
    groups.set(category, group);
  });

  const noResults = document.createElement('div');
  noResults.className = 'career-role-no-results';
  noResults.hidden = true;
  noResults.textContent = 'No current openings match your search. Try a job title, technology, team or industry keyword.';
  items.insertAdjacentElement('afterend', noResults);

  groups.forEach((group) => {
    const toggle = group.querySelector('.career-role-group__toggle');
    const body = group.querySelector('.career-role-group__items');
    toggle?.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      body.hidden = expanded;
    });
  });

  const search = filters.querySelector('[data-career-search]');
  const department = filters.querySelector('[data-career-department]');

  const apply = () => {
    const query = String(search?.value || '').trim().toLowerCase();
    const selectedCategory = String(department?.value || '').trim();
    let visible = 0;

    groups.forEach((group, category) => {
      const records = cardRecords.filter((record) => record.category === category);
      let groupVisible = 0;

      records.forEach((record) => {
        const matchesSearch = !query || record.searchText.includes(query);
        const matchesCategory = !selectedCategory || record.category === selectedCategory;
        const show = matchesSearch && matchesCategory;
        record.card.hidden = !show;
        if (show) {
          visible += 1;
          groupVisible += 1;
        }
      });

      group.hidden = groupVisible === 0;
      const groupCount = group.querySelector('.career-role-group__count');
      if (groupCount) groupCount.textContent = String(groupVisible);

      if (groupVisible && (query || selectedCategory)) {
        const toggle = group.querySelector('.career-role-group__toggle');
        const body = group.querySelector('.career-role-group__items');
        toggle?.setAttribute('aria-expanded', 'true');
        if (body) body.hidden = false;
      }
    });

    count.textContent = `${visible} ${visible === 1 ? 'role' : 'roles'}`;
    noResults.hidden = visible !== 0;
    items.scrollTop = 0;
  };

  search?.addEventListener('input', apply);
  department?.addEventListener('change', apply);
}
