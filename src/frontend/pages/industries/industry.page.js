import { pageHero, sectionHeading, ctaPanel, arrow, esc } from '../../app/components.js';
import { pageTitle, imageTag } from '../../app/render-helpers.js';

function editorialImage(page) {
  return {
    image: page.secondaryImage || page.image,
    alt: page.secondaryImageAlt || page.imageAlt
  };
}

function compactTags(items = []) {
  return items.map((item) => `<span class="service-capability-tag">${esc(item)}</span>`).join('');
}

function numberedCards(items = []) {
  return items.map(([title, text], index) => `<article class="topic-card editorial-card"><span class="editorial-card__index">${String(index + 1).padStart(2, '0')}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('');
}

export function renderIndustryPage(page) {
  pageTitle(page.title);
  const secondary = editorialImage(page);
  return `<main id="main-content">
    ${pageHero({ ...page, crumbs:[{label:'Home',href:'/'},{label:'Industry',href:'/industry/automotive-industry-it-services'},{label:page.title}] })}
    <section class="section"><div class="container split"><div>${imageTag(secondary.image,secondary.alt)}</div><div><span class="eyebrow">Industry context</span><h2>${esc(page.introTitle)}</h2><p>${esc(page.intro)}</p><ul class="list-check">${page.bullets.map((b)=>`<li>${esc(b)}</li>`).join('')}</ul></div></div></section>
    ${page.priorities?.length ? `<section class="section section--soft"><div class="container">${sectionHeading('Industry priorities','Technology decisions shaped by sector realities','The same technology can create very different risk, integration, data and operating requirements depending on where it is used. These are some of the conditions we design around in this sector.')}<div class="topic-grid">${numberedCards(page.priorities)}</div></div></section>` : ''}
    ${page.solutions?.length ? `<section class="section"><div class="container industry-capability-layout"><div><span class="eyebrow">Relevant capabilities</span><h2>Services that can be combined around the requirement</h2><p>Engagement scope is assembled around the problem rather than forcing every client into the same delivery package.</p></div><div class="service-capability-tags">${compactTags(page.solutions)}</div></div></section>` : ''}
    <section class="section section--soft"><div class="container">${sectionHeading('How we work', 'Industry context informs architecture and delivery', 'Security, data, integration, availability, compliance and operating requirements change by context. Our delivery approach is shaped around those realities.')}
      <div class="trust-strip"><div class="trust-item"><strong>Discover</strong><span>Clarify users, systems, constraints, risks and required outcomes.</span></div><div class="trust-item"><strong>Design</strong><span>Define solution boundaries, interfaces, quality attributes, controls and operating ownership.</span></div><div class="trust-item"><strong>Deliver</strong><span>Implement, verify, release and transition against explicit acceptance criteria.</span></div></div>
    </div></section>
    ${page.outcomes?.length ? `<section class="section"><div class="container">${sectionHeading('Business outcomes','What good delivery should improve','The objective is not technology for its own sake. Delivery should improve measurable aspects of service, control, speed, quality or operational visibility.')}<div class="outcome-grid">${page.outcomes.map((item) => `<div class="outcome-item">${arrow()}<span>${esc(item)}</span></div>`).join('')}</div></div></section>` : ''}
    ${ctaPanel(`Discuss ${page.title} requirements`, 'Share the systems, user groups, operational constraints and business outcome involved. We will map the requirement to the appropriate combination of consulting and engineering capability.')}</main>`;
}
