import { IMAGES } from './site-config.js';
import { help } from './pages-util.js';

export const MANAGEMENT_EDUCATION_SERVICE_PAGES = {
  '/services/management/risk': {
    category: 'Management Services', title: 'Risk', image: IMAGES.risk,
    imageAlt: 'Business professionals reviewing financial and operational risk information in a real office meeting',
    secondaryImage: IMAGES.riskDetail,
    secondaryImageAlt: 'Professional team discussing charts and risk indicators during a real business meeting',
    lead: 'Technology-enabled risk management that connects controls, evidence, data, operations and accountable decision-making.',
    introTitle: 'Make risk visible before it becomes disruption',
    intro: 'We help organisations frame operational and technology risk in practical terms, identify control gaps and improve the information available to people responsible for decisions and oversight. The focus is on risk processes that can operate continuously rather than periodic reporting that becomes disconnected from day-to-day work.',
    bullets: ['Risk assessment and control mapping', 'Operational risk analytics', 'Data and reporting improvement', 'Technology risk governance'],
    howWeHelp: [
      help('Risk Advanced Analytics', 'Use analytical evidence to identify patterns, concentration, exposure and emerging risk before issues become larger operational events.', 'We define the measures, source data, quality expectations, analytical methods and reporting needed to make risk signals interpretable and actionable. Indicators are connected to thresholds, owners and escalation paths so analysis leads to a decision rather than remaining a dashboard. Where multiple business units contribute data, we also address consistent definitions, lineage and exception handling.'),
      help('Operational Risk, Compliance and Controls', 'Connect control requirements to real operating processes, accountable owners and reviewable evidence.', 'We map obligations and control objectives to the workflows where they are actually performed, identifying triggers, evidence, exceptions, escalation and remediation. The objective is to reduce the gap between documented policy and day-to-day execution. Technology controls, manual controls and management review are considered together so gaps and duplicated effort are visible.'),
      help('Digitisation, Machine Learning and Data Management', 'Modernise risk workflows with better data and automation while retaining traceability, human judgement and governance.', 'We assess where workflow digitisation, structured data management, rules or machine learning can improve consistency and speed without creating opaque decision-making. The design includes data ownership, validation, human-review points, audit trails and change control. Automation is introduced only where the operating process can support and govern it.'),
      help('Enterprise Risk Management', 'Create a coherent view of risk across business, technology, supplier and operational domains.', 'We help establish risk taxonomy, ownership, scoring, thresholds, reporting cadence and decision forums so information can be compared and escalated consistently. Enterprise risk is connected to strategic objectives and operational evidence rather than maintained as a separate reporting exercise. The result should help leadership understand concentration, change and priority across the organisation.')
    ]
  },
  '/services/management/strategy-and-implementation': {
    category: 'Management Services', title: 'Strategy and Implementation', image: IMAGES.strategy,
    imageAlt: 'Business leaders discussing strategy around a whiteboard in a real office meeting',
    secondaryImage: IMAGES.strategyDetail,
    secondaryImageAlt: 'Executive presenter working through a business plan with colleagues in a real office',
    lead: 'Strategy designed with implementation constraints, ownership, investment choices and measurable outcomes from the beginning.',
    introTitle: 'Close the gap between strategy and execution',
    intro: 'We translate strategic priorities into sequenced initiatives, decision points, operating changes and technology capabilities. Plans include ownership, dependencies, governance and evidence of progress so strategy does not stop at presentation material or become disconnected from the teams responsible for implementation.',
    bullets: ['Digital strategy and operating model', 'Transformation roadmap design', 'Portfolio prioritisation', 'Implementation governance'],
    howWeHelp: [
      help('Digital Enterprise Strategy and Implementation', 'Create a practical digital roadmap connected to enterprise priorities, operating realities and delivery capacity.', 'We link customer, operational, data and technology opportunities to the capabilities required to deliver them, then sequence initiatives against dependency, value, risk and organisational readiness. Target architecture and operating-model implications are made visible alongside investment choices. Governance continues into implementation so strategic intent can be preserved as delivery decisions change.'),
      help('Growth and Innovation', 'Evaluate growth and innovation ideas against customer evidence, business value, technology feasibility and scaling risk.', 'We structure discovery, assumptions, experiments, prototype or pilot criteria and investment gates so organisations can learn before scaling cost. Innovation work is connected to existing platforms, operating processes and commercial objectives rather than treated as a separate lab activity. Successful ideas are transitioned into an implementation roadmap with ownership and measurable outcomes.'),
      help('Performance Management', 'Make strategic progress measurable through consistent outcomes, leading indicators, ownership and management review.', 'We distinguish activity metrics from evidence of business impact, define metric ownership and establish review cadence around decisions management needs to make. Measures can combine financial, customer, operational, delivery and technology perspectives where appropriate. The objective is a management system that highlights deviation and supports action, not a reporting pack that simply records what already happened.')
    ]
  },
  '/services/management/sustainability': {
    category: 'Management Services', title: 'Sustainability', image: IMAGES.sustainability,
    imageAlt: 'Real renewable energy infrastructure representing sustainable operations and resource use',
    secondaryImage: IMAGES.sustainabilityDetail,
    secondaryImageAlt: 'Professional team discussing operational plans and sustainability initiatives in a real office',
    lead: 'Sustainability planning supported by reliable information, technology choices and operational change rather than isolated reporting.',
    introTitle: 'Connect sustainability goals to operating decisions',
    intro: 'We help organisations structure sustainability initiatives around measurable objectives, reliable information and the business processes that must change to deliver them. Technology, data and operating-model considerations are treated as enablers of the programme rather than separate workstreams.',
    bullets: ['Sustainability strategy and roadmap', 'Data and reporting requirements', 'Technology-enabled operational improvement', 'Change and adoption planning'],
    howWeHelp: [
      help('Develop a Sustainability Strategy', 'Define priorities, measures, ownership and a staged roadmap that can move sustainability objectives into execution.', 'We connect objectives to operational areas, data requirements, accountable owners, dependencies and investment sequencing so the strategy can be implemented and measured. Existing initiatives are assessed for overlap, evidence quality and feasibility. The result is a roadmap with explicit decisions and transition steps rather than a collection of disconnected targets.'),
      help('Change Management', 'Support the people, process and governance changes required to make sustainability initiatives durable.', 'We identify affected groups, new responsibilities, process changes, communication needs, training, adoption risks and feedback mechanisms. Change activity is aligned to the implementation roadmap so stakeholders understand not only the objective but what will change in their day-to-day work. Measures are used to identify where adoption is weak and where reinforcement is required.')
    ]
  },
  '/services/education/consultancy': {
    category: 'Education Services', title: 'Consultancy', image: IMAGES.educationConsulting,
    imageAlt: 'Education adviser discussing academic work and digital services with a student using a laptop',
    secondaryImage: IMAGES.educationConsultingDetail,
    secondaryImageAlt: 'Teacher supporting students who are using laptops in a real learning environment',
    lead: 'Education consultancy supported by structured processes, digital services, accessible experiences and clear stakeholder communication.',
    introTitle: 'Connect education services with dependable digital operations',
    intro: 'RC combines education-domain understanding with digital process and technology capability to help education organisations improve learner and staff journeys, service delivery, information flows and operational visibility. The objective is to simplify processes without losing security, accessibility, accountability or the human support required by education services.',
    bullets: ['Education service process design', 'Digital workflow and portal support', 'Information and stakeholder coordination', 'Technology advisory for education operations'],
    howWeHelp: [
      help('Education Consultancy', 'Support education organisations and service operations with structured advisory, workflow improvement and digital capability.', 'We begin with the education process and the people involved: learners, parents, staff, administrators or partners. Engagements can cover current-state journey mapping, service design, portal and workflow requirements, information architecture, integration, accessibility, reporting, security and implementation governance. Recommendations are shaped around the institution’s operating environment so digital change improves the service rather than adding another disconnected system.')
    ]
  }
};