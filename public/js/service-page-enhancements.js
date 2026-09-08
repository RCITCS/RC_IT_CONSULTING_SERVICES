import { SERVICE_ENHANCEMENTS } from './service-content.js';

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function challengeCards(items) {
  return items.map(([title, text]) => `<article class="topic-card service-depth-card"><span class="service-depth-card__rule"></span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('');
}

function deliverableRows(items) {
  return items.map(([title, text], index) => `<article class="service-deliverable"><span class="service-deliverable__index">${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></article>`).join('');
}

function capabilityTags(items) {
  return items.map((item) => `<span class="service-capability-tag">${esc(item)}</span>`).join('');
}

function serviceOverviewMarkup(content) {
  return `
    <section class="section service-enterprise-overview">
      <div class="container">
        <div class="service-proposition">
          <span class="eyebrow">Enterprise service perspective</span>
          <h2>From business requirement to an operable capability.</h2>
          <p>${esc(content.proposition)}</p>
        </div>
      </div>
    </section>
    <section class="section section--soft service-challenges-section">
      <div class="container">
        <div class="section-heading"><span class="eyebrow">Business challenges</span><h2>Where this service creates practical value</h2><p>Common conditions that benefit from structured consulting, engineering or operational support.</p></div>
        <div class="topic-grid service-depth-grid">${challengeCards(content.challenges)}</div>
      </div>
    </section>
    <section class="section service-deliverables-section">
      <div class="container service-deliverables-layout">
        <div class="service-deliverables-intro"><span class="eyebrow">What we deliver</span><h2>Outputs designed to support real decisions and delivery.</h2><p>Scope is agreed for each engagement. The examples below represent the types of outputs associated with this service area.</p></div>
        <div class="service-deliverables-list">${deliverableRows(content.deliverables)}</div>
      </div>
    </section>
    <section class="section section--soft service-capabilities-section">
      <div class="container">
        <div class="section-heading"><span class="eyebrow">Capability coverage</span><h2>Technology and operating areas we can address</h2><p>Coverage is tailored to the client environment, architecture standards, governance requirements and agreed engagement scope.</p></div>
        <div class="service-capability-tags">${capabilityTags(content.capabilities)}</div>
      </div>
    </section>`;
}

function detailContextMarkup(content) {
  return `
    <section class="section service-detail-context">
      <div class="container service-detail-context__grid">
        <div><span class="eyebrow">Wider service context</span><h2>Designed as part of an end-to-end operating environment.</h2><p>${esc(content.proposition)}</p></div>
        <div><h3>Associated capability areas</h3><div class="service-capability-tags service-capability-tags--compact">${capabilityTags(content.capabilities)}</div></div>
      </div>
    </section>`;
}

export function applyServicePageEnhancements(pathName) {
  const exact = SERVICE_ENHANCEMENTS[pathName];
  if (exact) {
    const helpGrid = document.querySelector('.help-grid');
    const helpSection = helpGrid?.closest('section');
    if (helpSection && !document.querySelector('.service-enterprise-overview')) {
      helpSection.insertAdjacentHTML('beforebegin', serviceOverviewMarkup(exact));
    }
    return;
  }

  const servicePath = Object.keys(SERVICE_ENHANCEMENTS)
    .sort((a, b) => b.length - a.length)
    .find((base) => pathName.startsWith(`${base}/`));
  if (!servicePath || !document.querySelector('.service-detail-page')) return;
  const content = SERVICE_ENHANCEMENTS[servicePath];
  const deliverySteps = document.querySelector('.delivery-steps');
  const deliverySection = deliverySteps?.closest('section');
  if (deliverySection && !document.querySelector('.service-detail-context')) {
    deliverySection.insertAdjacentHTML('beforebegin', detailContextMarkup(content));
  }
}
