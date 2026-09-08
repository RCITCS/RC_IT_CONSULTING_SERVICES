import { COMPANY, FOOTER_GROUPS, PRIMARY_NAV, UTILITY_NAV } from './site-config.js';
import { responsiveImageMarkup } from './image-utils.js';

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export const chevron = () => '<svg class="chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const arrow = () => '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function isActive(href, pathName) {
  if (href === '/') return pathName === '/';
  return pathName === href || pathName.startsWith(href + '/');
}

function menuVariant(item) {
  if (item.label === 'SERVICES') return 'mega-menu--services';
  if (item.label === 'Industry') return 'mega-menu--industry';
  if (item.label === 'Careers') return 'mega-menu--careers';
  return '';
}

function navItem(item, pathName, index) {
  if (!item.groups) {
    return `<a class="nav-link ${isActive(item.href, pathName) ? 'is-active' : ''}" href="${esc(item.href)}">${esc(item.label)}</a>`;
  }
  const active = item.groups.some((group) => group.items.some((link) => isActive(link.href, pathName)));
  const groups = item.groups.map((group) => `
    <div class="mega-column">
      <span class="mega-title">${esc(group.label)}</span>
      ${group.items.map((link) => `<a class="mega-link ${isActive(link.href, pathName) ? 'is-active' : ''}" href="${esc(link.href)}"><span>${esc(link.label)}</span>${arrow()}</a>`).join('')}
    </div>`).join('');
  return `<div class="nav-item" data-nav-item>
    <button class="nav-trigger ${active ? 'is-active' : ''}" type="button" aria-expanded="false" aria-controls="mega-${index}">${esc(item.label)}${chevron()}</button>
    <div class="mega-menu ${menuVariant(item)}" id="mega-${index}" role="region" aria-label="${esc(item.label)} menu"><div class="mega-grid">${groups}</div></div>
  </div>`;
}

function mobileItem(item, pathName, index) {
  if (!item.groups) return `<a class="${isActive(item.href, pathName) ? 'is-active' : ''}" href="${esc(item.href)}">${esc(item.label)}</a>`;
  return `<div class="mobile-accordion" data-mobile-accordion>
    <button class="mobile-accordion__trigger" type="button" aria-expanded="false" aria-controls="mobile-panel-${index}">${esc(item.label)}${chevron()}</button>
    <div class="mobile-accordion__panel" id="mobile-panel-${index}">
      ${item.groups.map((group) => `<div class="mobile-subgroup"><strong>${esc(group.label)}</strong>${group.items.map((link) => `<a class="${isActive(link.href, pathName) ? 'is-active' : ''}" href="${esc(link.href)}">${esc(link.label)}</a>`).join('')}</div>`).join('')}
    </div>
  </div>`;
}

export function headerTemplate(pathName) {
  return `
    <div class="utility-bar"><div class="container utility-inner">${UTILITY_NAV.map((item) => `<a href="${item.href}">${esc(item.label)}</a>`).join('')}</div></div>
    <header class="site-header" id="site-header">
      <div class="container header-inner">
        <a class="brand" href="/" aria-label="RC IT Services home">
          <span class="brand-mark" aria-hidden="true">RC</span>
          <span class="brand-copy"><strong>RC IT Services</strong><span>Technology & Consulting</span></span>
        </a>
        <nav class="desktop-nav" aria-label="Primary navigation">${PRIMARY_NAV.map((item, index) => navItem(item, pathName, index)).join('')}</nav>
        <a class="btn btn--primary btn--small header-cta" href="/contact?intent=consultation#contact-form">Consult our Expert</a>
        <button class="mobile-menu-button" type="button" aria-expanded="false" aria-controls="mobile-panel" aria-label="Open navigation menu">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
    </header>
    <div class="mobile-panel" id="mobile-panel" aria-hidden="true">
      <div class="mobile-panel__sheet" role="dialog" aria-modal="true" aria-label="Mobile navigation">
        <div class="mobile-panel__head">
          <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">RC</span><span class="brand-copy"><strong>RC IT Services</strong><span>Technology & Consulting</span></span></a>
          <button class="mobile-close" type="button" aria-label="Close navigation menu">×</button>
        </div>
        <nav class="mobile-nav" aria-label="Mobile navigation">
          ${PRIMARY_NAV.map((item, index) => mobileItem(item, pathName, index)).join('')}
          <a href="/blog">Blog</a><a href="/faqs">FAQs</a><a href="/login">Login</a>
          <a href="/contact?intent=consultation#contact-form">Consult our Expert</a>
        </nav>
      </div>
    </div>`;
}

export function footerTemplate() {
  return `<footer class="site-footer">
    <div class="container footer-main">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">RC</span><span class="brand-copy"><strong style="color:white">RC IT Services</strong><span>Technology & Consulting</span></span></a>
          <p>Technology consulting, engineering and management services presented through a clean, accountable delivery model.</p>
        </div>
        ${FOOTER_GROUPS.map((group) => `<div class="footer-column"><h2>${esc(group.label)}</h2>${group.items.map((item) => `<a href="${esc(item.href)}">${esc(item.label)}</a>`).join('')}</div>`).join('')}
      </div>
    </div>
    <div class="footer-bottom"><div class="container footer-bottom-inner">
      <div>${esc(COMPANY.legalName)} · Registered in England and Wales · Company No. ${esc(COMPANY.companyNumber)}<br>${esc(COMPANY.registeredOffice)}</div>
      <div class="footer-legal"><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/terms">Terms</a></div>
    </div></div>
  </footer>`;
}

export function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${items.map((item, i) => item.href ? `<a href="${esc(item.href)}">${esc(item.label)}</a><span aria-hidden="true">${i < items.length - 1 ? '/' : ''}</span>` : `<span aria-current="page">${esc(item.label)}</span>`).join('')}</nav>`;
}

export function pageHero({ category, title, lead, image, imageAlt, crumbs = [] }) {
  const heroImage = responsiveImageMarkup(image, imageAlt, {
    loading: 'eager',
    fetchPriority: 'high',
    sizes: '(max-width: 900px) calc(100vw - 2rem), 42vw',
    width: 1600,
    height: 1000
  });
  return `<section class="page-hero"><div class="container page-hero-grid"><div>${breadcrumbs(crumbs)}<span class="eyebrow">${esc(category)}</span><h1>${esc(title)}</h1><p>${esc(lead)}</p></div>${heroImage}</div></section>`;
}

export function sectionHeading(eyebrowText, title, text = '') {
  return `<div class="section-heading"><span class="eyebrow">${esc(eyebrowText)}</span><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}</div>`;
}

export function ctaPanel(title = 'Discuss your technology requirement', text = 'Tell us what you are trying to deliver. We will use the first conversation to clarify scope, constraints and the right engagement path.') {
  return `<section class="section"><div class="container"><div class="cta-panel"><div><h2>${esc(title)}</h2><p>${esc(text)}</p></div><a class="btn btn--primary" href="/contact">Contact Us ${arrow()}</a></div></div></section>`;
}

export function dialogTemplate({ id, title, body, label = 'Close' }) {
  return `<div class="dialog-backdrop" data-dialog-backdrop data-dialog-id="${esc(id)}"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="${esc(id)}-title"><div class="dialog-head"><h2 id="${esc(id)}-title">${esc(title)}</h2><button class="dialog-close" type="button" data-dialog-close aria-label="${esc(label)}">×</button></div><div class="dialog-body">${body}</div></section></div>`;
}

export { esc };
