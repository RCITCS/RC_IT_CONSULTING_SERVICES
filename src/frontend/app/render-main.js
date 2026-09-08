import { COMPANY, IMAGES } from './site-config.js';
import { pageHero, sectionHeading, ctaPanel, arrow, esc } from './components.js';
import { field } from './forms.js';
import { pageTitle, imageTag } from './render-helpers.js';

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

export function renderServicePage(page, servicePath) {
  pageTitle(page.title);
  const secondary = editorialImage(page);
  const dimensions = page.dimensions ? `<section class="section section--blue"><div class="container">${sectionHeading('Big Data dimensions', 'The operating characteristics that shape the data architecture', 'Scale alone does not define a data platform. Variability, trust, security, change rate, usability and business value all influence architecture and operating decisions.')}<div class="topic-grid">${page.dimensions.map((d) => `<article class="topic-card"><h3>${esc(d)}</h3><p>Considered explicitly in data design, quality, governance and operating decisions.</p></article>`).join('')}</div></div></section>` : '';
  return `<main id="main-content">
    ${pageHero({ ...page, crumbs: [{label:'Home',href:'/'},{label:'Services',href:'/services/it/consultancy-services'},{label:page.title}] })}
    <section class="section"><div class="container split"><div>${imageTag(secondary.image, secondary.alt)}</div><div><span class="eyebrow">Service overview</span><h2>${esc(page.introTitle)}</h2><p>${esc(page.intro)}</p><ul class="list-check">${page.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div></div></section>
    ${dimensions}
    <section class="section section--soft"><div class="container">${sectionHeading('HOW WE HELP', `How RC approaches ${page.title}`, 'Explore the specialist capabilities within this service area. Each capability has its own page covering context, scope, delivery approach, controls, expected outcomes and the wider service environment around the work.')}
      <div class="help-grid">${page.howWeHelp.map((item) => `<article class="help-card"><h3>${esc(item.title)}</h3><p class="help-card__summary">${esc(item.summary)}</p><p class="help-card__detail">${esc(item.detail)}</p><a class="btn btn--text" href="${esc(servicePath)}/${esc(item.slug)}">Read More ${arrow()}</a></article>`).join('')}</div>
    </div></section>
    ${ctaPanel(`Talk to us about ${page.title}`, `Share the business objective, current environment, known constraints and target timeline. We will use that context to identify the most relevant capability and delivery path.`)}
  </main>`;
}

function capabilityOutcome(item, page) {
  return `${item.title} is treated as part of the wider ${page.title} service, with decisions tied to business outcomes, ownership, security, data quality, operational readiness and measurable acceptance criteria.`;
}

export function renderServiceDetail({ page, item, servicePath }) {
  pageTitle(`${item.title} | ${page.title}`);
  const siblings = page.howWeHelp.filter((candidate) => candidate.slug !== item.slug);
  const secondary = editorialImage(page);
  return `<main id="main-content" class="service-detail-page">
    ${pageHero({
      category:`${page.title} · How We Help`,
      title:item.title,
      lead:item.summary,
      image:page.image,
      imageAlt:page.imageAlt,
      crumbs:[{label:'Home',href:'/'},{label:'Services',href:'/services/it/consultancy-services'},{label:page.title,href:servicePath},{label:item.title}]
    })}

    <section class="section"><div class="container detail-intro">
      <div class="detail-intro__media">${imageTag(secondary.image, secondary.alt)}</div>
      <div class="detail-intro__copy"><span class="eyebrow">Capability overview</span><h2>${esc(item.title)} in practice</h2><p class="detail-lead">${esc(item.detail)}</p><p>${esc(capabilityOutcome(item, page))}</p><a class="detail-back-link" href="${esc(servicePath)}">← Back to ${esc(page.title)}</a></div>
    </div></section>

    <section class="section section--soft"><div class="container detail-two-column">
      <div><span class="eyebrow">What the work covers</span><h2>Connected to the complete service context.</h2><p>${esc(page.intro)}</p></div>
      <ol class="detail-scope-list">${page.bullets.map((bullet, index) => `<li><span>${String(index + 1).padStart(2,'0')}</span><div><strong>${esc(bullet)}</strong><p>Considered as part of the scope, architecture, implementation and operating model for ${esc(item.title)}.</p></div></li>`).join('')}</ol>
    </div></section>

    <section class="section"><div class="container">${sectionHeading('Delivery approach', `How we structure ${item.title}`, 'The exact engagement changes by client context, but the work moves through explicit discovery, design, implementation and verification rather than ending with an isolated recommendation.')}
      <div class="delivery-steps">
        <article><span>01</span><h3>Discover</h3><p>Clarify the business problem, users, current systems, constraints, risks, data and desired outcome.</p></article>
        <article><span>02</span><h3>Design</h3><p>Define responsibilities, architecture boundaries, controls, interfaces, measures and acceptance criteria.</p></article>
        <article><span>03</span><h3>Implement</h3><p>Deliver the agreed capability in controlled increments with engineering, quality and stakeholder feedback built in.</p></article>
        <article><span>04</span><h3>Validate & operate</h3><p>Verify the outcome, document ownership, monitor behaviour and establish the next improvement cycle.</p></article>
      </div>
    </div></section>

    <section class="section section--soft"><div class="container detail-outcome">
      <div><span class="eyebrow">Expected result</span><h2>A capability that can be used, governed and improved.</h2></div>
      <p>${esc(item.summary)} The objective is a practical outcome that fits the organisation's wider technology and operating environment rather than a standalone deliverable with no ownership after launch.</p>
    </div></section>

    ${siblings.length ? `<section class="section"><div class="container">${sectionHeading('Related capabilities', `More within ${page.title}`, 'Continue into another capability without returning to the main navigation.')}
      <div class="related-capabilities">${siblings.map((candidate) => `<a href="${esc(servicePath)}/${esc(candidate.slug)}"><span>${esc(candidate.title)}</span>${arrow()}</a>`).join('')}</div>
    </div></section>` : ''}

    ${ctaPanel(`Discuss ${item.title}`, `Tell us what you need to achieve with ${item.title}, what systems or processes are involved and what constraints are already known.`)}
  </main>`;
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

export function renderAbout() {
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

export function renderProducts() {
  pageTitle('Our Products');
  return `<main id="main-content">${pageHero({category:'Our Products',title:'Products designed around operational workflows',lead:'Explore product capabilities that support structured education and recruitment processes. Product discussions focus on users, workflow fit, integration requirements, security boundaries and the outcomes the organisation needs to improve.',image:IMAGES.products,imageAlt:'Professional team reviewing a digital product on a laptop in a real office',crumbs:[{label:'Home',href:'/'},{label:'Our Products'}]})}
    <section class="section"><div class="container split"><div>${imageTag(IMAGES.productsDetail,'Professional team reviewing a digital workflow on a laptop in a real office')}</div><div><span class="eyebrow">Product approach</span><h2>Evaluate fit before committing to implementation.</h2><p>Product selection should start with the process, users, information and integration landscape rather than with a feature checklist alone. We use demonstrations to understand the organisation's current workflow, show the relevant capability and identify where configuration, integration or process change may be required.</p><ul class="list-check"><li>Role-aware workflows and permissions</li><li>Structured process and status visibility</li><li>Integration and data considerations</li><li>Reporting, governance and operational support</li></ul></div></div></section>
    <section class="section section--soft"><div class="container">${sectionHeading('Product portfolio','Two focused cloud product areas','The product portfolio reflects the existing RC service structure. Capability is presented around business workflows rather than generic software claims.')}
      <div class="product-grid">
        <article class="product-card product-card--expanded"><span class="product-card__tag">Education platform</span><h3>Ed+ Cloud</h3><p>Designed to support connected education-service workflows across learner information, enquiries or admissions, staff activity, communications, approvals and operational reporting.</p><ul class="list-check"><li>Student and service workflow coordination</li><li>Role-based access and task ownership</li><li>Communication and document touchpoints</li><li>Operational reporting and status visibility</li></ul><button class="btn btn--primary" type="button" data-request-demo="Ed+ Cloud">Request a Demo</button></article>
        <article class="product-card product-card--expanded"><span class="product-card__tag">Recruitment platform</span><h3>Recruit+ Cloud</h3><p>Designed to support structured recruitment workflows across vacancies, candidate information, review stages, collaboration, documents, interview activity and hiring status.</p><ul class="list-check"><li>Vacancy and candidate workflow management</li><li>Recruiter and reviewer collaboration</li><li>Documents, notes and stage visibility</li><li>Reporting and role-based access</li></ul><button class="btn btn--primary" type="button" data-request-demo="Recruit+ Cloud">Request a Demo</button></article>
      </div>
    </div></section>
    <section class="section"><div class="container">${sectionHeading('Evaluation process','A product conversation built around your operating context','A useful demonstration should answer whether the product fits the process, where integrations are needed and what implementation work is required.')}
      <div class="delivery-steps"><article><span>01</span><h3>Understand</h3><p>Review users, workflow, systems, data, pain points and desired improvements.</p></article><article><span>02</span><h3>Demonstrate</h3><p>Show the capabilities most relevant to the operating scenario rather than a generic feature tour.</p></article><article><span>03</span><h3>Assess fit</h3><p>Identify configuration, integration, security, reporting and process-change requirements.</p></article><article><span>04</span><h3>Plan</h3><p>Define the next technical and commercial steps only after the implementation context is understood.</p></article></div>
    </div></section>${ctaPanel('Need a product walkthrough?','Request a demonstration and tell us which workflow, user group or operational problem you want to evaluate.')}</main>`;
}

export function renderWhitePapers() {
  pageTitle('White Papers');
  return `<main id="main-content">${pageHero({category:'Resources',title:'White Papers and technology perspectives',lead:'Structured thinking for leaders evaluating modernisation, data platforms, AI adoption, security and technology delivery. The purpose is to clarify decisions, trade-offs and implementation considerations before investment is committed.',image:IMAGES.whitePapers,imageAlt:'Professional research workspace with documents, laptop and handwritten notes',crumbs:[{label:'Home',href:'/'},{label:'White Papers'}]})}
    <section class="section"><div class="container split"><div>${imageTag(IMAGES.whitePapersDetail,'Professional reviewing research documents beside a laptop in a real office')}</div><div><span class="eyebrow">Research perspective</span><h2>Decision support, not trend commentary.</h2><p>Our resource themes are organised around questions technology leaders commonly need to answer: what should change, what should remain stable, what risks need to be controlled and what operating capability is required after implementation.</p><p>Material is structured to connect architecture, engineering, governance and business outcomes so the reader can move from a strategic topic to practical evaluation criteria.</p></div></div></section>
    <section class="section section--soft"><div class="container">${sectionHeading('Research themes','Technology and management topics with implementation depth','Each theme is framed around architecture choices, operating implications, delivery risk and the evidence required to make a defensible decision.')}
      <div class="topic-grid">
        <article class="topic-card resource-card"><span class="eyebrow">Cloud</span><h3>Cloud modernisation</h3><p>How to distinguish migration from genuine modernisation and evaluate workload fit, landing-zone controls, resilience, observability, operating ownership and cost governance.</p><ul><li>Migration strategy and dependency mapping</li><li>Platform foundations and DevSecOps</li><li>Resilience, SRE and operational readiness</li><li>FinOps and lifecycle governance</li></ul></article>
        <article class="topic-card resource-card"><span class="eyebrow">Data</span><h3>Data engineering</h3><p>How to build data platforms that users can trust, with reliable pipelines, clear ownership, observable quality and analytical models connected to real decisions.</p><ul><li>ETL/ELT and orchestration</li><li>Warehouse and lakehouse architecture</li><li>Data quality, lineage and governance</li><li>Analytics and semantic models</li></ul></article>
        <article class="topic-card resource-card"><span class="eyebrow">AI</span><h3>Responsible AI delivery</h3><p>How to move from experimentation to a governed production capability with explicit use cases, evaluation, human oversight, security, integration and operational monitoring.</p><ul><li>Use-case qualification and data readiness</li><li>Evaluation and acceptance thresholds</li><li>Security and human-review controls</li><li>MLOps/LLMOps and change management</li></ul></article>
      </div>
    </div></section>
    <section class="section"><div class="container">${sectionHeading('How to use these resources','Move from reading to a structured decision','If a theme maps to an active programme, use the consultation route to bring the specific environment, constraints and decision into the conversation.')}
      <div class="trust-strip"><div class="trust-item"><strong>Frame the question</strong><span>Identify the decision or risk the organisation is trying to resolve.</span></div><div class="trust-item"><strong>Assess the environment</strong><span>Bring current systems, dependencies, governance and operating constraints into scope.</span></div><div class="trust-item"><strong>Define the next action</strong><span>Translate the perspective into an assessment, architecture decision or delivery plan.</span></div></div>
    </div></section>${ctaPanel('Looking for a specific point of view?','Tell us the technology, management or industry decision you are evaluating and the context around it.')}</main>`;
}

export function renderConsultExpert() {
  pageTitle('Consult our Expert');
  return `<main id="main-content">${pageHero({category:'Consult our Expert',title:'Start with the business problem, not a sales script',lead:'Describe the outcome you need, the systems involved, the decisions already made and the constraints still unresolved. The purpose of the first conversation is to understand the requirement and route it to the right capability.',image:IMAGES.consultExpert,imageAlt:'Two business and technology consultants discussing strategy around a laptop in a real office',crumbs:[{label:'Home',href:'/'},{label:'Consult our Expert'}]})}
    <section class="section"><div class="container split"><div>${imageTag(IMAGES.consultExpertDetail,'Professional client and consulting team reviewing a digital requirement on a laptop')}</div><div><span class="eyebrow">When to use this route</span><h2>Bring us a decision, delivery problem or capability gap.</h2><p>You do not need to arrive with a complete specification. A useful starting point is the business outcome, what is not working today, the systems or teams involved and any constraints already known.</p><ul class="list-check"><li>Technology strategy or architecture decision</li><li>Application, cloud or data modernisation</li><li>Cyber-security or operational-risk concern</li><li>Delivery capacity or specialist engineering requirement</li><li>Management, sustainability or education consulting need</li></ul></div></div></section>
    <section class="section section--soft"><div class="container">${sectionHeading('What happens next','A professional intake process with clear intent','The consultation route is designed to collect enough context for a productive first discussion rather than forcing a long sales qualification process.')}
      <div class="delivery-steps"><article><span>01</span><h3>Context</h3><p>We review the objective, environment, affected users or systems, timeline and known constraints.</p></article><article><span>02</span><h3>Capability match</h3><p>The requirement is aligned to the most relevant consulting, engineering, management or education capability.</p></article><article><span>03</span><h3>Next step</h3><p>Where there is a fit, the next action may be a focused discovery session, assessment, proposal or technical discussion.</p></article><article><span>04</span><h3>Scope</h3><p>Any delivery engagement should proceed with clear boundaries, responsibilities, outcomes and acceptance expectations.</p></article></div>
    </div></section>
    <section class="section"><div class="container form-shell">${sectionHeading('Consultation request','Tell us what you need to solve','The more useful context you provide, the easier it is to route the request to the appropriate capability.')}
      <form data-api-form="/api/consultation" novalidate><div class="form-grid">${field('name','Name','text',true)}${field('company','Company','text',true)}${field('businessEmail','Business Email','email',true)}${field('phone','Phone Number','tel',false,'phone')}<div class="form-field form-field--full"><label for="topic">Consultation topic *</label><select id="topic" name="topic" required><option value="">Choose a topic</option><option>IT Consultancy</option><option>Cyber Security</option><option>Artificial Intelligence</option><option>Cloud Computing</option><option>Big Data / Data Engineering</option><option>IT Support Services</option><option>Management Consulting</option><option>Education Consultancy</option></select><span class="field-error"></span></div><div class="form-field form-field--full"><label for="brief">Brief</label><textarea id="brief" name="brief" placeholder="Business outcome, current systems, known constraints and target timeline"></textarea><span class="field-error"></span></div></div><div class="form-actions"><button class="btn btn--primary" type="submit">Submit</button><p class="form-status" data-form-status></p></div></form>
    </div></section></main>`;
}

export function renderContact() {
  pageTitle('Contact');
  return `<main id="main-content" class="contact-page">${pageHero({category:'Contact',title:'Contact RC IT Services',lead:'Use the contact route for project delivery, specialist capability, managed support, product enquiries, partnership discussions or general business questions. Provide enough context for the enquiry to reach the appropriate service area.',image:IMAGES.contact,imageAlt:'Professional customer service representative using a headset in a real modern office',crumbs:[{label:'Home',href:'/'},{label:'Contact'}]})}
    <section class="section"><div class="container split contact-intro"><div>${imageTag(IMAGES.contactDetail,'Professional customer support agents using headsets and computers in a real office')}</div><div><span class="eyebrow">Business enquiries</span><h2>Make the first interaction useful.</h2><p>A strong enquiry explains the outcome you are trying to achieve, the service or system involved, the timeline if one exists and any constraints already known. That context helps route the request without unnecessary back-and-forth.</p><ul class="list-check"><li>Project and consulting requirements</li><li>Technology, cloud, data and cyber-security enquiries</li><li>Management or education consulting</li><li>Product demonstrations and partnerships</li><li>Existing client or service enquiries</li></ul></div></div></section>
    <section class="section section--soft"><div class="container">${sectionHeading('Contact options','Choose the route that matches your intent','Each option uses the same enquiry workflow but pre-selects the reason for contact so the message can be understood in context.')}
      <div class="contact-options contact-options--grid"><div class="contact-option"><span>01</span><h3>Write to Us</h3><p>Send a structured business enquiry through the form with the relevant project or service context.</p><button class="btn btn--text" type="button" data-contact-intent="Write to Us">Start enquiry ${arrow()}</button></div><div class="contact-option"><span>02</span><h3>Talk to Us</h3><p>Request a phone conversation and include your number, organisation and the subject you want to discuss.</p><button class="btn btn--text" type="button" data-contact-intent="Talk to Us">Request contact ${arrow()}</button></div><div class="contact-option"><span>03</span><h3>Email Us</h3><p>Use the business-email route when the enquiry needs a written response or supporting context.</p><button class="btn btn--text" type="button" data-contact-intent="Email Us">Start enquiry ${arrow()}</button></div><div class="contact-option"><span>04</span><h3>Chat With Us</h3><p>Send a focused message to the technology team without leaving the current page.</p><button class="btn btn--text" type="button" data-chat-now>Chat Now &gt;&gt;&gt;</button></div></div>
    </div></section>
    <section class="section"><div class="container contact-form-layout"><div><span class="eyebrow">What to include</span><h2>Help us understand the requirement.</h2><p>For a faster and more useful response, include the service area, affected users or systems, desired outcome, target timeline and any known technical or commercial constraints.</p><div class="contact-guidance"><div><strong>Project context</strong><span>What is changing and why?</span></div><div><strong>Technology context</strong><span>Which applications, platforms, data or integrations are involved?</span></div><div><strong>Timing</strong><span>Is there a target date, dependency or urgent issue?</span></div><div><strong>Outcome</strong><span>What would a successful engagement improve?</span></div></div></div>
      <div id="contact-form" class="contact-form-panel">${sectionHeading('Enquiry form','Tell us how to route your request','Provide enough context for the team to understand the requirement, affected systems or service area, and the outcome you are trying to achieve.')}<form data-api-form="/api/contact" novalidate><input type="hidden" name="intent" id="contact-intent" value="General enquiry"><div class="form-grid">${field('firstName','First Name','text',true)}${field('lastName','Last Name','text',true)}${field('company','Company','text',true)}${field('phone','Phone Number','tel',true,'phone')}${field('businessEmail','Business Email','email',true)}${field('jobTitle','Job Title','text',true)}<div class="form-field form-field--full"><label for="message">Message</label><textarea id="message" name="message" placeholder="Describe your requirement, target outcome, known constraints and preferred timeline."></textarea><span class="field-error"></span></div></div><div class="form-actions"><button class="btn btn--primary" type="submit">Submit</button><p class="form-status" data-form-status></p></div></form></div></div></section>
    <section class="section section--soft"><div class="container contact-office-grid"><div>${sectionHeading('Registered office','Corporate details','The registered-office details below identify the legal entity operating RC IT Services.') }<div class="empty-state"><h2>${esc(COMPANY.legalName)}</h2><p>${esc(COMPANY.registeredOffice)}<br>Company No. ${esc(COMPANY.companyNumber)}</p></div></div><div><span class="eyebrow">After you submit</span><h2>Clear routing and next-step ownership.</h2><p>Your enquiry should be reviewed against the relevant service area and business context. Where a follow-up is appropriate, the next step may be a clarification, consultation, product demonstration or scoped delivery discussion.</p><p>Do not include passwords, secret keys, payment-card data or other unnecessary sensitive information in a public website enquiry.</p></div></div></section>
    <section class="section"><div class="container">${sectionHeading('Map','Find the registered office')}<div style="overflow:hidden;border:1px solid var(--color-line);border-radius:.55rem;background:var(--color-surface-soft)"><iframe title="Map showing the registered office of R C OVERSEAS LTD" src="https://www.google.com/maps?q=93%20Metcalfe%20Court%20John%20Harrison%20Way%20London%20SE10%200BZ&output=embed" width="100%" height="420" style="display:block;border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div></div></section></main>`;
}
