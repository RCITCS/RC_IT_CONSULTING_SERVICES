export function bindCareerFilters() {
  const list = document.querySelector('.career-role-list');
  const items = list?.querySelector('.career-role-list__items');
  const count = list?.querySelector('.career-role-list__head > strong');
  if (!list || !items || !count || list.querySelector('[data-career-filters]')) return;

  const cards = [...items.querySelectorAll('.career-role-card')];
  if (cards.length < 8) return;

  const departments = [...new Set(cards.map((card) => card.querySelector('.career-role-card__department')?.textContent?.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));

  const filters = document.createElement('div');
  filters.className = 'career-role-filters';
  filters.dataset.careerFilters = 'true';
  filters.innerHTML = `
    <label class="career-role-search">
      <span class="sr-only">Search current openings</span>
      <input type="search" placeholder="Search role, skill or team" autocomplete="off" data-career-search>
    </label>
    <label class="career-role-department-filter">
      <span class="sr-only">Filter current openings by department</span>
      <select data-career-department>
        <option value="">All teams</option>
        ${departments.map((department)=>`<option value="${department.replaceAll('&','&amp;').replaceAll('"','&quot;')}">${department.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</option>`).join('')}
      </select>
    </label>
  `;
  list.querySelector('.career-role-list__head')?.insertAdjacentElement('afterend', filters);

  const noResults = document.createElement('div');
  noResults.className = 'career-role-no-results';
  noResults.hidden = true;
  noResults.textContent = 'No current openings match this search.';
  items.insertAdjacentElement('afterend', noResults);

  const search = filters.querySelector('[data-career-search]');
  const department = filters.querySelector('[data-career-department]');

  const apply = () => {
    const query = String(search?.value || '').trim().toLowerCase();
    const team = String(department?.value || '').trim().toLowerCase();
    let visible = 0;

    cards.forEach((card) => {
      const cardTeam = String(card.querySelector('.career-role-card__department')?.textContent || '').trim().toLowerCase();
      const haystack = String(card.textContent || '').toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesTeam = !team || cardTeam === team;
      const show = matchesSearch && matchesTeam;
      card.hidden = !show;
      if (show) visible += 1;
    });

    count.textContent = `${visible} ${visible === 1 ? 'role' : 'roles'}`;
    noResults.hidden = visible !== 0;
    items.scrollTop = 0;
  };

  search?.addEventListener('input', apply);
  department?.addEventListener('change', apply);
}
