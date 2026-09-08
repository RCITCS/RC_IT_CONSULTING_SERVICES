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
            <span class="eyebrow">Technology Consulting · Engineering · Managed Delivery</span>
            <h1>Technology that moves <em>business forward.</em></h1>
            <p class="hero-lead">RC IT Services helps organisations design, modernise and operate digital capabilities across software, cloud, data, cyber security and management transformation.</p>
            <div class="hero-actions"><a class="btn btn--primary" href="/contact?intent=consultation#contact-form">Consult our Expert ${arrow()}</a><a class="btn btn--secondary" href="/services/it/consultancy-services">Explore Services</a></div>
          </div>
          <div class="hero-visual">
            ${imageTag(IMAGES.hero, 'Professional software and technology team collaborating around laptops in a real office', 'class="hero-photo" loading="eager"')}
            <div class="hero-badge"><strong>Accountable from discovery to operation</strong><span>Architecture, engineering, quality, release and support connected through one delivery model.</span></div>
          </div>
        </div>
      </section>

      <section class="section home-entry-section"><div class="container">
        ${sectionHeading('Explore RC IT Services','Three ways to move from interest to a useful next step','Evaluate our product areas, read decision-oriented technology perspectives or bring an active business and technology problem directly into the unified contact and consultation route.')}
        <div class="action-grid">
          ${[
            ['01','Our Products','Explore workflow-focused cloud product areas for education and recruitment, then evaluate fit through a targeted demonstration.','/products'],
            ['02','White Papers','Read practical perspectives on cloud modernisation, data engineering and responsible AI with architecture and operating context.','/white-papers'],
            ['03','Consult our Expert','Bring an active technology decision, modernisation challenge, delivery constraint or specialist capability requirement into a focused discussion.','/contact?intent=consultation#contact-form']
          ].map(([n,title,text,href]) => `<a class="action-card" href="${href}"><span class="action-card__number">${n}</span><span class="action-card__arrow">${arrow()}</span><h3>${title}</h3><p>${text}</p></a>`).join('')}
        </div>
      </div></section>

      <section class="section section--soft"><div class="container">
        ${sectionHeading('WHAT MAKES US DISTINCTIVELY US?', 'Technology capability with delivery discipline', 'Clarity in strategy, discipline in engineering and accountability in delivery shape how we approach every service area.')}
        <div class="capability-grid">${HOME_CAPABILITIES.map((item) => `<article class="capability-card">${imageTag(item.image, `${item.title} professional technology context`, 'class="mini-photo"')}<h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('')}</div>
      </div></section>

      <section class="section"><div class="container">
        ${sectionHeading('WHAT INDUSTRY DO YOU BELONG TO?', 'Industry context changes the engineering decision', 'Automotive, financial services, media and education bring different security, data, integration, availability and operating requirements. Our delivery model adapts to that context.')}
        <div class="industry-grid">${HOME_INDUSTRIES.map((item) => `<a class="industry-card" href="${item.href}">${imageTag(item.image, `${item.title} industry`)}<div class="industry-card__content"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></a>`).join('')}</div>
      </div></section>

      <section class="section section--blue"><div class="container">
        ${sectionHeading('Our Partners', 'Designed to work across client and partner ecosystems', 'Technology delivery often spans client teams, specialist providers and delivery partners. We establish clear responsibilities, interfaces, quality expectations and escalation paths across those boundaries.')}
        <div class="trust-strip"><div class="trust-item"><strong>Technology partners</strong><span>Integration-ready architecture and clear ownership boundaries.</span></div><div class="trust-item"><strong>Delivery partners</strong><span>Defined responsibilities, interfaces, quality gates and escalation paths.</span></div><div class="trust-item"><strong>Business partners</strong><span>Transparent engagement scope and measurable delivery expectations.</span></div></div>
      </div></section>

      <section class="section"><div class="container">
        ${sectionHeading('Our Clients', 'Built for organisations that need dependable delivery capacity', 'Our service model supports organisations that need specialist technology capability, project delivery support and structured consulting engagement.')}
        <div class="split"><div>${imageTag(IMAGES.homeClients || IMAGES.consultingDetail, 'Professional client and technology team reviewing delivery work together in a real office')}</div><div><h2>From first conversation to operation, every stage should move the outcome forward.</h2><p>We combine advisory context with implementation thinking so clients can move from requirements to a practical delivery path without losing ownership, quality or operational visibility.</p><ul class="list-check"><li>Project and consulting engagements</li><li>Dedicated engineering and technology delivery</li><li>Management and transformation support</li><li>Structured operational handover and support</li></ul></div></div>
      </div></section>
      ${ctaPanel()}
    </main>`;
}
