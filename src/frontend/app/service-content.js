export const SERVICE_ENHANCEMENTS = {
  '/services/it/consultancy-services': {
    proposition: 'RC IT Services supports technology leaders from early assessment through implementation governance. The work combines business analysis, solution architecture, delivery planning and engineering oversight so recommendations remain executable rather than becoming presentation-only strategy.',
    challenges: [
      ['Fragmented technology estates', 'Legacy applications, duplicated platforms and point-to-point integrations can make even small changes expensive and risky. We help establish current-state visibility and a sequenced modernisation path.'],
      ['Delivery without clear ownership', 'Programmes often slow down when product, engineering, operations and suppliers work to different priorities. We define decision rights, delivery responsibilities and measurable outcomes.'],
      ['Investment without evidence', 'Technology investment should be connected to a business case, operating constraint or customer need. We help teams test assumptions and prioritise initiatives against value, risk and feasibility.']
    ],
    deliverables: [
      ['Technology assessment', 'Current-state application, integration, data, infrastructure and delivery assessment with prioritised findings.'],
      ['Target architecture', 'A pragmatic target-state architecture and transition roadmap aligned with business and operational constraints.'],
      ['Delivery roadmap', 'Sequenced initiatives, dependencies, milestones, governance points and measurable acceptance criteria.'],
      ['Engineering governance', 'Architecture reviews, delivery assurance, quality gates, risk management and operational-readiness support.']
    ],
    capabilities: ['Enterprise & solution architecture', 'Agile and product operating models', 'Application modernisation', 'API and integration strategy', 'Cloud and platform strategy', 'Data and analytics strategy', 'Quality engineering', 'AI and automation assessment']
  },
  '/services/it/cyber-security': {
    proposition: 'Security is integrated into architecture, engineering and operations rather than added at the end of delivery. RC IT Services focuses on reducing practical exposure across identity, endpoints, applications, cloud platforms and sensitive information while preserving business usability.',
    challenges: [
      ['Expanding attack surface', 'Cloud services, APIs, remote access, SaaS platforms and connected endpoints create more paths that require consistent identity, configuration and monitoring controls.'],
      ['Security controls that are difficult to operate', 'Controls only provide value when teams can maintain them. We favour enforceable baselines, automated checks, clear ownership and evidence that can be reviewed.'],
      ['Limited incident visibility', 'Organisations need useful telemetry, escalation paths and recovery procedures before an incident occurs. We connect preventative controls with detection and response readiness.']
    ],
    deliverables: [
      ['Security posture assessment', 'Risk-based assessment of identities, endpoints, applications, cloud services, data flows and operational controls.'],
      ['Secure architecture & threat modelling', 'Trust boundaries, abuse cases, security requirements, control mapping and design recommendations for systems and integrations.'],
      ['DevSecOps enablement', 'Security checks integrated into build and release workflows, including dependency, code, configuration and infrastructure controls.'],
      ['Incident readiness', 'Logging requirements, alert ownership, response playbooks, escalation paths, evidence preservation and recovery considerations.']
    ],
    capabilities: ['Identity & access management', 'Endpoint protection and hardening', 'Application security', 'Cloud security posture', 'Data protection and DLP', 'Vulnerability management', 'SIEM / security monitoring', 'Incident response readiness']
  },
  '/services/it/artificial-intelligence': {
    proposition: 'RC IT Services approaches AI as an enterprise engineering capability: the use case, data, evaluation method, human oversight, security and operating model are defined before technology is scaled. This supports useful adoption without losing control of quality or accountability.',
    challenges: [
      ['AI initiatives without a clear business case', 'We start with the decision, task or workflow that needs to improve and test whether AI is the right mechanism before committing to a platform or model.'],
      ['Unreliable or poorly governed data', 'Model quality depends on the information supplied to it. Data ownership, lineage, access, quality and evaluation sets are treated as core design concerns.'],
      ['Models that work in demos but not operations', 'Production AI requires integration, monitoring, fallback behaviour, access control, cost management and clear accountability for exceptions.']
    ],
    deliverables: [
      ['AI opportunity assessment', 'Prioritised use cases scored against value, feasibility, data readiness, risk and operating impact.'],
      ['Solution architecture', 'Model/service selection, data flows, retrieval or feature architecture, integrations, security boundaries and human-review points.'],
      ['Evaluation framework', 'Task-specific quality measures, test datasets, safety checks, acceptance thresholds and regression evaluation.'],
      ['Operational AI / MLOps', 'Deployment, versioning, observability, cost monitoring, model/prompt change control and production support patterns.']
    ],
    capabilities: ['Machine learning', 'Generative AI', 'Retrieval-augmented generation', 'Intelligent document processing', 'Workflow automation', 'Model evaluation', 'MLOps / LLMOps', 'AI governance and security']
  },
  '/services/it/cloud-computing': {
    proposition: 'Cloud adoption is designed around workload requirements, not fashion. RC IT Services helps organisations establish secure foundations, migrate or modernise applications, automate platform delivery and operate cloud environments with resilience, observability and financial discipline.',
    challenges: [
      ['Migration without dependency visibility', 'Applications rarely move independently. We map identity, network, data, integration and operational dependencies before planning migration waves.'],
      ['Inconsistent cloud foundations', 'Landing zones, identity, networking, logging, policy and deployment standards need to be repeatable before teams scale cloud usage.'],
      ['Rising cost and operational complexity', 'Cloud elasticity does not remove the need for ownership. We establish tagging, cost visibility, service standards, observability and lifecycle controls.']
    ],
    deliverables: [
      ['Cloud readiness assessment', 'Workload inventory, dependency mapping, migration suitability, target operating model and prioritised roadmap.'],
      ['Landing zone & platform foundation', 'Identity, networking, security, logging, policy, account/subscription structure and deployment standards.'],
      ['Migration & modernisation', 'Rehost, replatform or refactor plans with cutover, rollback, data migration and production-verification criteria.'],
      ['Platform engineering', 'Infrastructure as code, CI/CD, container platforms, observability, resilience and self-service engineering patterns.']
    ],
    capabilities: ['AWS / Azure / GCP architecture', 'Landing zones', 'Cloud migration', 'Kubernetes & containers', 'Infrastructure as code', 'DevSecOps', 'Observability & SRE', 'FinOps and cost governance']
  },
  '/services/it/big-data': {
    proposition: 'RC IT Services designs data platforms that make information trustworthy, accessible and usable at the speed required by the business. The focus spans data ingestion, transformation, storage, governance, analytics and operational use rather than treating reporting as an isolated front-end activity.',
    challenges: [
      ['Multiple versions of the truth', 'Different teams often calculate the same business measure differently. We establish ownership, definitions, lineage and governed semantic models.'],
      ['Fragile data pipelines', 'Unobservable jobs, manual corrections and unclear dependencies create reporting risk. We design orchestration, validation, retry and monitoring into pipelines.'],
      ['Analytics disconnected from operations', 'Data products should support decisions and workflows. We design interfaces, refresh expectations, access models and consumption patterns around how information is actually used.']
    ],
    deliverables: [
      ['Data strategy & architecture', 'Domain priorities, source-system assessment, target platform, governance model and staged implementation roadmap.'],
      ['Data engineering', 'Batch and streaming ingestion, transformation, orchestration, testing, metadata, lineage and operational monitoring.'],
      ['Warehouse / lakehouse platforms', 'Analytical modelling, storage, workload management, security, history and performance patterns.'],
      ['Analytics & BI enablement', 'Governed metrics, semantic models, dashboards, self-service boundaries and data-product ownership.']
    ],
    capabilities: ['ETL / ELT engineering', 'Batch & streaming data', 'Data lakes / lakehouse', 'Data warehousing', 'Data quality & observability', 'Metadata & lineage', 'Business intelligence', 'Data science enablement']
  },
  '/services/it/it-support-services': {
    proposition: 'RC IT Services structures support around ownership, priority, evidence and continuous improvement. Users receive a clear route for assistance while application and platform teams gain the incident history, observability and problem-management data needed to reduce repeat disruption.',
    challenges: [
      ['Unclear issue ownership', 'Incidents can bounce between teams when service boundaries and escalation paths are not explicit. We establish service ownership and routing rules.'],
      ['Reactive support', 'Repeated incidents consume capacity when root causes are not addressed. We connect incident management to problem management and improvement backlogs.'],
      ['Limited service visibility', 'Service quality needs measurable response, restoration, availability and recurring-problem data rather than anecdotal reporting.']
    ],
    deliverables: [
      ['Service desk operating model', 'Request categories, priorities, ownership, escalation, communication standards and knowledge-management processes.'],
      ['Application & platform support', 'Runbooks, monitoring, alert handling, incident response, release awareness and known-error management.'],
      ['Service reporting', 'SLA/SLO measures, incident trends, problem themes, backlog visibility and improvement actions.'],
      ['Continuous improvement', 'Root-cause analysis, automation opportunities, knowledge improvements and operational-hardening recommendations.']
    ],
    capabilities: ['Service desk', 'Incident management', 'Problem management', 'Application support', 'Monitoring & alerting', 'Knowledge management', 'Service reporting', 'Operational automation']
  },
  '/services/management/risk': {
    proposition: 'RC IT Services helps organisations convert risk from a periodic reporting exercise into an operating discipline supported by consistent data, defined controls and accountable ownership across business and technology functions.',
    challenges: [
      ['Disconnected risk information', 'Different teams may use inconsistent taxonomies, scoring and evidence. We help establish common definitions and reporting structures.'],
      ['Controls that exist only on paper', 'Effective controls need an owner, a trigger, evidence and a response when the control fails. We connect requirements to operating processes.'],
      ['Slow visibility of emerging exposure', 'Risk analytics can combine operational, technology and compliance signals so management sees changes earlier and can prioritise response.']
    ],
    deliverables: [
      ['Risk framework & taxonomy', 'Risk categories, ownership, scoring, thresholds, governance forums and escalation rules.'],
      ['Control mapping', 'Control objectives, owners, evidence, testing approach, exceptions and remediation tracking.'],
      ['Risk analytics', 'Data sources, indicators, dashboards and reporting designed around management decisions.'],
      ['Technology risk governance', 'Architecture, cyber, cloud, data, supplier and operational-risk integration into governance processes.']
    ],
    capabilities: ['Enterprise risk management', 'Operational risk', 'Technology & cyber risk', 'Controls and compliance', 'Risk analytics', 'Third-party risk', 'Issue & remediation tracking', 'Governance reporting']
  },
  '/services/management/strategy-and-implementation': {
    proposition: 'Strategy is valuable only when it can be executed. RC IT Services converts business priorities into a portfolio of sequenced initiatives with ownership, dependencies, investment decisions, measurable outcomes and governance that continues through implementation.',
    challenges: [
      ['Strategy disconnected from delivery', 'We translate strategic themes into capabilities, initiatives, milestones and operating changes that delivery teams can execute.'],
      ['Too many competing priorities', 'Portfolio decisions require explicit value, risk, dependency and capacity criteria rather than treating every initiative as equally urgent.'],
      ['Progress measured by activity', 'We define outcome measures and leading indicators so management can distinguish delivery motion from business impact.']
    ],
    deliverables: [
      ['Digital / enterprise strategy', 'Strategic themes, capability priorities, investment principles and target operating direction.'],
      ['Transformation roadmap', 'Sequenced initiatives, dependencies, milestones, governance points and transition states.'],
      ['Portfolio prioritisation', 'Decision framework for value, risk, feasibility, dependency and capacity trade-offs.'],
      ['Implementation governance', 'Decision rights, workstream accountability, progress measures, risk management and executive reporting.']
    ],
    capabilities: ['Digital strategy', 'Operating-model design', 'Transformation roadmaps', 'Portfolio management', 'Programme governance', 'Change management', 'Performance management', 'Innovation management']
  },
  '/services/management/sustainability': {
    proposition: 'RC IT Services connects sustainability objectives to operating processes, technology choices and reliable information. The result is a roadmap that can be governed and measured rather than a set of disconnected commitments.',
    challenges: [
      ['Limited sustainability data quality', 'Reporting depends on consistent source data, ownership, calculation rules and traceability. We help define the information architecture behind sustainability measures.'],
      ['Targets without operating change', 'Objectives need accountable initiatives across facilities, technology, procurement, supply chain and workforce processes.'],
      ['Technology footprint and efficiency', 'Cloud, data centres, devices and software architectures have cost and resource implications that can be considered alongside service requirements.']
    ],
    deliverables: [
      ['Sustainability roadmap', 'Priorities, initiatives, measures, dependencies, ownership and phased delivery plan.'],
      ['Data & reporting design', 'Source data, metric definitions, controls, lineage and reporting processes.'],
      ['Sustainable technology review', 'Cloud, infrastructure, application and operational opportunities considered against performance and business constraints.'],
      ['Change & adoption plan', 'Stakeholders, responsibilities, communication, training and reinforcement mechanisms.']
    ],
    capabilities: ['Sustainability strategy', 'ESG data foundations', 'Technology efficiency', 'Cloud cost/resource optimisation', 'Reporting controls', 'Operating-model change', 'Change management', 'Performance measurement']
  },
  '/services/education/consultancy': {
    proposition: 'RC combines education-sector understanding with digital-service and technology capability. Engagements can support learner, staff and administrative journeys while improving the systems, information flows and controls that sit behind them.',
    challenges: [
      ['Fragmented learner and staff journeys', 'Admissions, communication, teaching support and administration may span disconnected tools. We help map the end-to-end journey and remove avoidable hand-offs.'],
      ['Manual administrative processes', 'Structured digital workflows can reduce repeated data entry, improve traceability and give stakeholders clearer status visibility.'],
      ['Sensitive information and access', 'Education platforms need role-aware access, secure information flows, appropriate retention and dependable audit trails.']
    ],
    deliverables: [
      ['Education process assessment', 'Current journeys, stakeholder needs, systems, data flows and improvement priorities.'],
      ['Digital-service roadmap', 'Sequenced portal, workflow, integration, data and support improvements.'],
      ['Information architecture', 'Student/staff data ownership, integration boundaries, access requirements, reporting and governance.'],
      ['Implementation support', 'Requirements, vendor/solution evaluation, delivery governance, testing, rollout and adoption support.']
    ],
    capabilities: ['Student & staff portals', 'Admissions and CRM workflows', 'Education MIS integration', 'Document and approval workflows', 'Reporting & analytics', 'Cloud & security advisory', 'Accessibility & UX', 'Operational support']
  }
};
