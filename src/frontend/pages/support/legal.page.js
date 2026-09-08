import { IMAGES } from '../../app/site-config.js';
import { LEGAL_PAGES } from '../../app/legal-content.js';
import { pageHero, arrow, esc } from '../../app/components.js';
import { pageTitle } from '../../app/render-helpers.js';
import { renderNotFoundPage } from './not-found.page.js';

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

export function renderLegalPage(kind) {
  const policy = LEGAL_PAGES[kind];
  if (!policy) return renderNotFoundPage();
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
      image:IMAGES.legal,
      imageAlt:'Real professional desk with a contract, laptop and business documents',
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
        </article>
      </div>
    </section>
  </main>`;
}
