import { IMAGES } from './site-config.js';
import { help } from './pages-util.js';

export const IT_SERVICE_PAGES = {
  '/services/it/consultancy-services': {
    category: 'IT Services', title: 'Consultancy Services', image: IMAGES.consulting,
    imageAlt: 'Technology consultants collaborating around laptops in a professional office',
    lead: 'Practical technology consulting that connects business priorities, architecture decisions and measurable delivery.',
    introTitle: 'Turn technology decisions into delivery plans',
    intro: 'We help organisations assess current capabilities, define a realistic target state and move from strategy into implementation without losing operational context. Engagements are structured around business outcomes, delivery constraints, risk and maintainability.',
    bullets: ['Technology strategy and architecture assessment', 'Delivery operating-model design', 'Modernisation and transformation planning', 'Engineering capability and delivery support'],
    howWeHelp: [
      help('Agile', 'Create delivery practices that improve visibility, prioritisation and engineering flow.', 'We align product goals, delivery cadence, team responsibilities and feedback loops. The focus is on predictable delivery and useful governance rather than ceremony for its own sake.'),
      help('Advanced Analytics', 'Use data and analytics to support operational and strategic decisions.', 'We assess data availability, analytical use cases, governance needs and implementation options so reporting and advanced analytics are tied to real business questions.'),
      help('Digital Marketing', 'Connect digital customer journeys with measurable technology foundations.', 'We support the technology architecture behind digital experiences, including integrations, measurement, content workflows and performance considerations.'),
      help('Digital Delivery', 'Plan and execute digital initiatives with clear architecture and quality gates.', 'We define delivery slices, integration boundaries, non-functional requirements, release controls and operational readiness for digital programmes.'),
      help('AI and Automation', 'Identify where AI and automation can improve work without creating uncontrolled risk.', 'We prioritise appropriate use cases, data readiness, human oversight, security, evaluation and staged deployment before selecting tools or models.')
    ]
  },
  '/services/it/cyber-security': {
    category: 'IT Services', title: 'Cyber Security', image: IMAGES.cyber,
    imageAlt: 'Cybersecurity specialist reviewing code and security information across multiple monitors in a real office',
    lead: 'Security services that reduce exposure across users, endpoints, applications and business data.',
    introTitle: 'Build security into technology delivery',
    intro: 'Cyber security is treated as a system quality, not a final checklist. We help teams identify practical control gaps, reduce attack surface and make security requirements visible through design, engineering and operations.',
    bullets: ['Security posture and control assessment', 'Secure architecture and engineering practices', 'Endpoint and data protection planning', 'Security operations and response readiness'],
    howWeHelp: [
      help('AI and Automation', 'Apply automation to repetitive security analysis and response workflows.', 'Automation can improve triage and consistency, but high-impact decisions retain appropriate human review. We design around evidence, access boundaries and auditable workflows.'),
      help('End Point Security', 'Strengthen endpoint configuration, visibility and protection.', 'We assess endpoint risks, identity relationships, patching, configuration baselines, malware protection and operational monitoring as part of a wider defence-in-depth model.'),
      help('Data Breach Prevention', 'Reduce the likelihood and impact of unauthorised data exposure.', 'We map sensitive data flows, access paths, storage controls, logging, retention and incident responsibilities, then prioritise controls by plausible threat scenarios.')
    ]
  },
  '/services/it/artificial-intelligence': {
    category: 'IT Services', title: 'Artificial Intelligence', image: IMAGES.ai,
    imageAlt: 'Data scientist working with a laptop in a real professional office environment',
    lead: 'AI and machine-learning initiatives designed around useful outcomes, reliable data and controlled operational risk.',
    introTitle: 'Move from AI experimentation to governed capability',
    intro: 'We help organisations frame AI problems correctly, validate whether AI is warranted, establish data and evaluation requirements, and integrate solutions into existing systems with appropriate human oversight.',
    bullets: ['AI use-case discovery and feasibility', 'Machine-learning solution architecture', 'Evaluation and quality controls', 'Workflow automation and system integration'],
    howWeHelp: [
      help('AI / Machine Learning Augmented Future', 'Design human-and-machine workflows that improve speed and decision support.', 'We define the role of models, the role of people, evidence thresholds, fallbacks and monitoring so AI augments operations without obscuring accountability.'),
      help('Cyber Security', 'Consider model, data and integration security as part of AI architecture.', 'AI systems introduce new data flows and attack surfaces. We review access, prompt/input handling, model dependencies, logging, secrets and misuse scenarios.'),
      help('Data Analytics', 'Connect AI initiatives to governed analytical data and measurable outcomes.', 'We structure data pipelines, features, evaluation sets and reporting so model performance can be interpreted in business context rather than as an isolated technical metric.')
    ]
  },
  '/services/it/cloud-computing': {
    category: 'IT Services', title: 'Cloud Computing', image: IMAGES.cloud,
    imageAlt: 'Infrastructure engineer working directly with enterprise server and network equipment in a real data centre',
    lead: 'Cloud architecture and modernisation that balance delivery speed with resilience, security, operability and cost.',
    introTitle: 'Use cloud where it creates an operational advantage',
    intro: 'We design cloud adoption around workload characteristics and business constraints. The goal is not migration for its own sake, but an environment that is secure, observable, recoverable and maintainable.',
    bullets: ['Cloud readiness and target architecture', 'Migration and modernisation planning', 'Platform engineering and automation', 'Resilience, observability and cost controls'],
    howWeHelp: [
      help('Data Security', 'Protect cloud-hosted data through clear ownership, encryption and access controls.', 'We map data classifications, identities, service boundaries, encryption, backup, logging and retention requirements before implementation.'),
      help('Cloud Migration and Modernisation', 'Move workloads with a migration path matched to business risk.', 'We distinguish rehost, replatform and refactor decisions, define dependency sequencing, rollback options and production verification.'),
      help('AI and Enterprise Resource Planning', 'Integrate intelligent workflows with enterprise platforms carefully.', 'We design interfaces, data contracts and controls between AI services and ERP processes without bypassing existing business rules or authorisation.'),
      help('Application Development', 'Build cloud-ready applications with operational requirements designed in.', 'We cover service boundaries, deployment, observability, configuration, secrets, resilience and performance as first-class application concerns.'),
      help('Hybrid Clouds', 'Coordinate workloads across cloud and existing infrastructure.', 'Hybrid designs include connectivity, identity, latency, data movement, failure domains and operational ownership rather than treating hybrid as a network-only problem.'),
      help('Public Clouds', 'Use managed public-cloud capability with deliberate governance.', 'We select services against workload needs, portability, security, cost and operational maturity rather than adopting services because they are fashionable.'),
      help('Private Clouds', 'Support controlled cloud operating models for constrained workloads.', 'We assess whether isolation, regulatory, latency or legacy constraints justify private-cloud complexity and define the operating model required.'),
      help('Migration', 'Sequence migrations to reduce business disruption.', 'We inventory dependencies, group workloads, define cutover and rollback procedures and establish acceptance criteria before each migration wave.'),
      help('Database Refactoring', 'Modernise data stores without weakening integrity or recoverability.', 'We define schema/data migration, compatibility, backfill, replication, cutover, rollback and validation around the application’s consistency requirements.')
    ]
  },
  '/services/it/big-data': {
    category: 'IT Services', title: 'Big Data', image: IMAGES.bigData,
    imageAlt: 'Technology and business professionals collaborating around data analysis on a laptop in a real office',
    lead: 'Data engineering and analytics foundations that make high-volume, high-variety information useful and governable.',
    introTitle: 'Engineer data for reliable decisions',
    intro: 'We help teams build ingestion, transformation, storage and analytics capabilities around clear ownership and quality expectations. Architecture is driven by latency, scale, governance and the decisions the data needs to support.',
    bullets: ['Data engineering and integration pipelines', 'Warehouse and lakehouse architecture', 'Data quality and governance', 'Analytics and business intelligence enablement'],
    dimensions: ['Variability', 'Veracity', 'Vulnerability', 'Volatility', 'Visualisation', 'Value'],
    howWeHelp: [
      help('Build Data and Analytics Strategy', 'Align data investments with measurable business questions and ownership.', 'We establish priority use cases, source systems, data domains, governance, platform direction and a staged roadmap that can be delivered incrementally.'),
      help('Advanced Analytics', 'Build analytical capabilities on trustworthy, well-defined data.', 'We define datasets, measures, quality thresholds, processing needs and delivery patterns for advanced analytical workloads.'),
      help('Innovation with Machine Learning', 'Prepare data and operational workflows for machine-learning use cases.', 'We address feature/data pipelines, evaluation, reproducibility, model interfaces and monitoring alongside the intended business workflow.'),
      help('Performance Management', 'Create consistent metrics and reporting for operational performance.', 'We define KPI ownership, calculation rules, source lineage, refresh expectations and dashboard consumption patterns.'),
      help('Business Intelligence', 'Deliver governed reporting that users can trust.', 'We structure semantic models, dashboards, access controls and self-service boundaries so teams can answer questions without creating conflicting versions of truth.'),
      help('Data Warehousing', 'Design analytical storage for clarity, performance and maintainability.', 'We define modelling, ingestion, transformation, history, orchestration and workload management according to reporting and analytical requirements.'),
      help('Data Science Application', 'Operationalise data-science outputs inside real products and workflows.', 'We design APIs, batch/stream integration, versioning, monitoring and fallback behaviour so data-science work becomes supportable software.')
    ]
  },
  '/services/it/it-support-services': {
    category: 'IT Services', title: 'IT Support Services', image: IMAGES.support,
    imageAlt: 'Professional IT support team using laptops and headsets in a real office environment',
    lead: 'Structured technology support focused on continuity, issue ownership and transparent service operation.',
    introTitle: 'Support that connects users, systems and operations',
    intro: 'We structure support around clear service ownership, incident priority, escalation and repeatable resolution. The aim is to reduce disruption while creating the operational evidence needed to prevent recurring problems.',
    bullets: ['Service desk and issue triage', 'Application and platform support', 'Incident and problem management', 'Operational reporting and service improvement'],
    howWeHelp: [
      help('Service Desk', 'Provide a controlled first point of contact for technology issues.', 'Requests are categorised, prioritised and routed using defined ownership and escalation paths so users know what happens after they report an issue.'),
      help('Application Support', 'Support business applications through monitored, repeatable operations.', 'We combine runbooks, observability, incident response, release awareness and known-error management to improve application supportability.'),
      help('Service Improvement', 'Use incident evidence to reduce repeated failure and support demand.', 'We identify recurring patterns, root causes, automation opportunities and knowledge gaps, then track improvement actions to closure.')
    ]
  },
};
