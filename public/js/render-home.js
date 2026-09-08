import { IMAGES } from './site-config.js';
import { HOME_CAPABILITIES, HOME_INDUSTRIES } from './pages.js';
import { sectionHeading, ctaPanel, arrow, esc } from './components.js';
import { pageTitle, imageTag } from './render-helpers.js';

export function renderHome() {
  pageTitle('Home');
  return `
    <main id="main-content">
      <section class="hero">
        <div class="container hero-grid">
          <div>
            <span class="eyebrow">Technology · Consulting · Delivery</span>
            <h1>Technology built around <em>business reality.</em></h1>
            <p class="hero-lead">RC IT Services brings consulting, engineering, cloud, data, cyber security and management capability into one accountable delivery model.</p>
            <div class="hero-actions"><a class="btn btn--primary" href="/consult-expert">Consult our Expert ${arrow()}</a><a class="btn btn--secondary" href="/services/it/consultancy-services">Explore Services</a></div>
          </div>
          <div class="hero-visual">
            ${imageTag(IMAGES.hero, 'Professional software team collaborating around laptops in a real office', 'class="hero-photo" loading="eager"')}
            <div class="hero-badge"><strong>From advisory to delivery</strong><span>Clear scope, working interactions and operational thinking from the first screen.</span></div>
          </div>
        </div>
      </section>

      <section class="section"><div class="container">
        <div class="action-grid">
          ${[
            ['01','Our Products','Explore the product portfolio and request a demonstration.','/products'],
            ['02','White Papers','Read structured thinking across technology, data and delivery.','/white-papers'],
            ['03','Consult our Expert','Start with the business problem, constraints and intended outcome.','/consult-expert']
          ].map(([n,title,text,href]) => `<a class="action-card" href="${href}"><span class="action-card__number">${n}</span><span class="action-card__arrow">${arrow()}</span><h3>${title}</h3><p>${text}</p></a>`).join('')}
        </div>
      </div></section>

      <section class="section section--soft"><div class="container">
        ${sectionHeading('WHAT MAKES US DISTINCTIVELY US?', 'Technology capability with delivery discipline', 'Consulting, engineering and management capabilities organised around clear business outcomes, reliable delivery and maintainable technology.')}
        <div class="capability-grid">${HOME_CAPABILITIES.map((item) => `<article class="capability-card">${imageTag(item.image, `${item.title} professional technology context`, 'class="mini-photo"')}<h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('')}</div>
      </div></section>

      <section class="section"><div class="container">
        ${sectionHeading('WHAT INDUSTRY DO YOU BELONG TO?', 'Industry context changes the engineering decision', 'We keep the same four industry entry points as the reference site, with each one routed to a dedicated, usable page.')}
        <div class="industry-grid">${HOME_INDUSTRIES.map((item) => `<a class="industry-card" href="${item.href}">${imageTag(item.image, `${item.title} industry`)}<div class="industry-card__content"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></a>`).join('')}</div>
      </div></section>

      <section class="section section--blue"><div class="container">
        ${sectionHeading('Our Partners', 'Technology partnerships built around clear delivery boundaries', 'We work best where responsibilities, interfaces, quality expectations and escalation paths are clear across every participating team.')}
        <div class="trust-strip"><div class="trust-item"><strong>Technology partners</strong><span>Integration-ready architecture and clear ownership boundaries.</span></div><div class="trust-item"><strong>Delivery partners</strong><span>Defined responsibilities, interfaces, quality gates and escalation paths.</span></div><div class="trust-item"><strong>Business partners</strong><span>Transparent engagement scope and measurable delivery expectations.</span></div></div>
      </div></section>

      <section class="section"><div class="container">
        ${sectionHeading('Our Clients', 'Built for organisations that need dependable delivery capacity', 'Our service model supports organisations that need specialist technology capability, project delivery support and structured consulting engagement.')}
        <div class="split"><div>${imageTag(IMAGES.consulting, 'Professional client and consulting team meeting')}</div><div><h2>From first enquiry to delivery, every interaction should move the work forward.</h2><p>We combine advisory context with implementation thinking so clients can move from requirements to a practical delivery path without losing ownership, quality or operational visibility.</p><ul class="list-check"><li>Project and consulting enquiries</li><li>Dedicated engineering and technology delivery</li><li>Management and transformation support</li><li>Careers and candidate intake</li></ul></div></div>
      </div></section>
      ${ctaPanel()}
    </main>`;
}
