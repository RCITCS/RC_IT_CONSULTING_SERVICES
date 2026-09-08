import { IMAGES } from '../../app/site-config.js';
import { pageHero, sectionHeading } from '../../app/components.js';
import { pageTitle } from '../../app/render-helpers.js';

export function renderBlogPage() {
  pageTitle('Blog');
  return `<main id="main-content">${pageHero({category:'Blog',title:'Insights and delivery perspectives',lead:'Perspectives on engineering, architecture, cloud, data, AI, management and industry technology, organised around the decisions and operating realities behind delivery.',image:IMAGES.whitePapers,imageAlt:'Professional research desk with laptop, documents and handwritten notes',crumbs:[{label:'Home',href:'/'},{label:'Blog'}]})}
    <section class="section"><div class="container">${sectionHeading('Editorial areas','Topics aligned to the service portfolio','The insights area is organised around the same disciplines RC supports through consulting and delivery. Published material should add decision context rather than repeat marketing copy.')}<div class="topic-grid"><article class="topic-card"><h3>Engineering & Architecture</h3><p>Maintainability, integration, quality, modernisation, platform decisions and delivery trade-offs.</p></article><article class="topic-card"><h3>Cloud, Data & AI</h3><p>Cloud transformation, data engineering, analytics, controlled AI adoption and operating governance.</p></article><article class="topic-card"><h3>Management & Industry</h3><p>Strategy, risk, sustainability and industry-specific technology context.</p></article></div></div></section></main>`;
}
