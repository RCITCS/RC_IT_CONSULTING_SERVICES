import { COMPANY, IMAGES } from '../app/site-config.js';
import { pageHero, sectionHeading, ctaPanel, esc } from '../app/components.js';
import { pageTitle, imageTag } from '../app/render-helpers.js';

export function renderAboutPage() {
  pageTitle('About Us');
  return `<main id="main-content">
    ${pageHero({
      category:'About Us',
      title:'Technology and consulting focused on lasting improvement',
      lead:'RC IT Services brings together technology consulting, digital transformation, engineering capability, management advisory and education consulting under R C OVERSEAS LTD.',
      image:IMAGES.about,
      imageAlt:'Diverse professional technology team collaborating around a laptop in a real office',
      crumbs:[{label:'Home',href:'/'},{label:'About Us'}]
    })}

    <section class="section"><div class="container split">
      <div>${imageTag(IMAGES.aboutDetail,'Multicultural professional team collaborating in a real modern office')}</div>
      <div><span class="eyebrow">Who we are</span><h2>Business understanding first. Technology applied with purpose.</h2>
        <p>We work with organisations that need to improve performance, modernise digital capabilities and turn strategy into practical delivery. Our approach is based on clear communication, transparent working relationships and teams that listen carefully to client priorities before recommending a solution.</p>
        <p>Technology programmes are most valuable when they improve the way a business operates. We therefore connect consulting, architecture, engineering, quality and implementation so that digital change is tied to measurable business needs rather than isolated technology activity.</p>
        <p>RC IT Services is designed to support clients across the lifecycle of change: understanding the current environment, defining a practical direction, assembling the right capability, delivering controlled increments and establishing an operating model that can sustain the result.</p>
        <ul class="list-check"><li>Technology consulting and digital transformation</li><li>Cloud, automation, artificial intelligence and data</li><li>Application, integration and platform engineering</li><li>Management consulting and implementation support</li><li>Education consulting and digital service capability</li></ul>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container">
      ${sectionHeading('Our working principle','Practical technology. Accountable delivery.','The RC approach is built around a simple idea: technology decisions should be understandable, delivery should be governable, and the resulting capability should have a clear owner after implementation.')}
      <div class="topic-grid">
        <article class="topic-card"><span class="eyebrow">Business context</span><h3>Start with the problem and operating reality.</h3><p>We clarify objectives, users, constraints, dependencies and risk before selecting architecture or tooling.</p></article>
        <article class="topic-card"><span class="eyebrow">Engineering discipline</span><h3>Design for quality beyond the first release.</h3><p>Maintainability, security, observability, performance, testability and operational ownership are considered alongside feature delivery.</p></article>
        <article class="topic-card"><span class="eyebrow">Transparent delivery</span><h3>Make progress, decisions and risk visible.</h3><p>Clear responsibilities, acceptance criteria, quality gates and stakeholder feedback reduce ambiguity throughout delivery.</p></article>
      </div>
    </div></section>

    <section class="section"><div class="container">
      ${sectionHeading('Engagement lifecycle','From first conversation to sustainable operation','Our role can vary from targeted advisory work to engineering delivery or ongoing support, but the underlying lifecycle remains explicit.')}
      <div class="delivery-steps">
        <article><span>01</span><h3>Understand</h3><p>Establish the business objective, current state, constraints, stakeholders, risks and evidence available.</p></article>
        <article><span>02</span><h3>Shape</h3><p>Define target outcomes, architecture boundaries, delivery options, responsibilities and a realistic roadmap.</p></article>
        <article><span>03</span><h3>Deliver</h3><p>Implement in controlled increments with engineering standards, testing, review and stakeholder feedback built into the work.</p></article>
        <article><span>04</span><h3>Operate & improve</h3><p>Transition knowledge, ownership, monitoring and support so the capability can continue to evolve after release.</p></article>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container">
      ${sectionHeading('What clients can expect','A delivery relationship designed around clarity and ownership','We avoid presenting consulting as a black box. The client should understand what is being decided, why it matters, who owns the next action and how progress is being measured.')}
      <div class="topic-grid">
        <article class="topic-card"><h3>Clear scope and decision rights</h3><p>Objectives, boundaries, assumptions and responsibilities are made visible early and revisited when circumstances change.</p></article>
        <article class="topic-card"><h3>Architecture tied to operations</h3><p>Design choices are considered against deployment, support, security, data, resilience and the teams who will operate the result.</p></article>
        <article class="topic-card"><h3>Quality built into delivery</h3><p>Testing, review, observability and acceptance criteria are part of the delivery method rather than final-stage activities.</p></article>
        <article class="topic-card"><h3>Responsible handover</h3><p>Documentation, ownership, runbooks, known risks and next improvements are treated as part of completion.</p></article>
      </div>
    </div></section>

    <section class="section"><div class="container split">
      <div><span class="eyebrow">Our direction</span><h2>Building capability for the next stage of business.</h2>
        <p>Our aim is to help clients remain relevant as technology, customer expectations and operating models change. That can include cloud modernisation, intelligent automation, secure digital platforms, data-driven decision support, connected systems and the management change required to make those capabilities useful.</p>
        <p>We also recognise that technology is only one part of transformation. Management and education consulting remain part of the broader RC service model where organisations need process, people and technology considerations to work together.</p>
      </div>
      <div class="topic-grid" style="grid-template-columns:1fr;">
        <article class="topic-card"><span class="eyebrow">Vision</span><h3>Help organisations use technology to create stronger, more adaptable businesses.</h3><p>We focus on practical improvement, responsible innovation and digital capability that can continue to evolve.</p></article>
        <article class="topic-card"><span class="eyebrow">Mission</span><h3>Connect strategy, technology and implementation through transparent delivery.</h3><p>We aim to make complex change easier to understand, govern and execute with clear responsibilities and measurable outcomes.</p></article>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container">
      ${sectionHeading('Corporate identity','R C OVERSEAS LTD','RC IT Services operates as the technology and consulting presentation of the registered company shown below. This corporate information is presented consistently across the website and legal pages.')}
      <div class="trust-strip"><div class="trust-item"><strong>${esc(COMPANY.legalName)}</strong><span>Registered legal entity operating RC IT Services.</span></div><div class="trust-item"><strong>Company No. ${esc(COMPANY.companyNumber)}</strong><span>Registered in England and Wales.</span></div><div class="trust-item"><strong>London</strong><span>${esc(COMPANY.registeredOffice)}</span></div></div>
    </div></section>
    ${ctaPanel('Talk to RC IT Services','Tell us where your organisation is today, what needs to change and the outcome you need to achieve.')}
  </main>`;
}
