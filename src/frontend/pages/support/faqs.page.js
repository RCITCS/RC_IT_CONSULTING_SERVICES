import { IMAGES } from '../../app/site-config.js';
import { pageHero, esc } from '../../app/components.js';
import { pageTitle } from '../../app/render-helpers.js';
import { FAQS } from './faq-content.js';

export function renderFaqsPage() {
  pageTitle('FAQs');
  return `<main id="main-content">${pageHero({category:'FAQs',title:'Frequently Asked Questions',lead:'Answers to common questions about RC IT Services, engagement models, careers, products and access.',image:IMAGES.consulting,imageAlt:'Business and technology consultants in a real professional meeting',crumbs:[{label:'Home',href:'/'},{label:'FAQs'}]})}
    <section class="section"><div class="container"><div class="accordion">${FAQS.map(([q,a],i)=>`<div class="accordion-item" data-accordion-item><button class="accordion-trigger" type="button" data-accordion-trigger aria-expanded="false" aria-controls="faq-${i}"><span>${esc(q)}</span><span aria-hidden="true">+</span></button><div class="accordion-panel" id="faq-${i}"><p>${esc(a)}</p></div></div>`).join('')}</div></div></section></main>`;
}
