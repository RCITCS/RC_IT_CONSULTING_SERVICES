import { pageTitle } from '../../app/render-helpers.js';

export function renderNotFoundPage() {
  pageTitle('Page not found');
  return `<main id="main-content"><section class="section"><div class="container"><div class="empty-state"><span class="eyebrow">404</span><h1>Page not found</h1><p>The page you requested could not be found. It may have moved, or the address may be incorrect.</p><div class="hero-actions"><a class="btn btn--primary" href="/">Home</a><a class="btn btn--secondary" href="/contact">Contact Us</a></div></div></div></section></main>`;
}
