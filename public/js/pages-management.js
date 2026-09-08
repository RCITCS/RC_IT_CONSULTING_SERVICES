import { IMAGES } from './site-config.js';
import { help } from './pages-util.js';

export const MANAGEMENT_EDUCATION_SERVICE_PAGES = {
  '/services/management/risk': {
    category: 'Management Services', title: 'Risk', image: IMAGES.risk,
    imageAlt: 'Business team reviewing charts and risk information during a real professional meeting',
    secondaryImage: IMAGES.riskDetail,
    secondaryImageAlt: 'Professionals reviewing financial and operational risk charts during a real business meeting',
    lead: 'Technology-enabled risk management that connects controls, data, operations and decision-making.',
    introTitle: 'Make risk visible before it becomes disruption',
    intro: 'We help organisations frame operational and technology risk in practical terms, identify control gaps and improve the information available to people responsible for decisions and oversight.',
    bullets: ['Risk assessment and control mapping', 'Operational risk analytics', 'Data and reporting improvement', 'Technology risk governance'],
    howWeHelp: [
      help('Risk Advanced Analytics', 'Use analytical evidence to identify patterns, exposure and emerging risk.', 'We define relevant measures, source data, analytical methods and reporting so risk signals are interpretable and actionable.'),
      help('Operational Risk, Compliance and Controls', 'Connect control requirements to real operating processes.', 'We map obligations, control owners, evidence, exceptions and escalation so governance is embedded in workflows rather than maintained only in documents.'),
      help('Digitisation, Machine Learning and Data Management', 'Modernise risk workflows without weakening traceability.', 'We assess where workflow digitisation, data management and machine learning can improve risk processes while retaining human judgement and auditability.'),
      help('Enterprise Risk Management', 'Create a coherent view of risk across business and technology domains.', 'We help establish taxonomy, ownership, reporting, thresholds and decision forums so risk information is comparable and governed.')
    ]
  },
  '/services/management/strategy-and-implementation': {
    category: 'Management Services', title: 'Strategy and Implementation', image: IMAGES.strategy,
    imageAlt: 'Business professional presenting strategy and performance information to colleagues in a real office',
    secondaryImage: IMAGES.strategyDetail,
    secondaryImageAlt: 'Professional team discussing business strategy with a presenter and whiteboard in a real office',
    lead: 'Strategy that is designed with implementation constraints, ownership and measurable outcomes from the beginning.',
    introTitle: 'Close the gap between strategy and execution',
    intro: 'We translate strategic priorities into sequenced initiatives, decision points, operating changes and technology capabilities. Plans include ownership, dependencies and evidence of progress so strategy does not stop at presentation material.',
    bullets: ['Digital strategy and operating model', 'Transformation roadmap design', 'Portfolio prioritisation', 'Implementation governance'],
    howWeHelp: [
      help('Digital Enterprise Strategy and Implementation', 'Create a practical digital roadmap connected to enterprise priorities.', 'We link customer, operational, data and technology opportunities to delivery capabilities, sequencing, governance and measurable outcomes.'),
      help('Growth and Innovation', 'Evaluate growth ideas against customer value and delivery feasibility.', 'We structure discovery, evidence, experimentation and investment gates to avoid scaling unvalidated ideas.'),
      help('Performance Management', 'Make strategic progress measurable through consistent performance information.', 'We define outcomes, leading indicators, ownership and review cadence so management can distinguish activity from actual progress.')
    ]
  },
  '/services/management/sustainability': {
    category: 'Management Services', title: 'Sustainability', image: IMAGES.sustainability,
    imageAlt: 'Real renewable energy and infrastructure environment representing sustainable operations',
    secondaryImage: IMAGES.sustainabilityDetail,
    secondaryImageAlt: 'Professional team planning operational change and sustainability initiatives in a real office',
    lead: 'Sustainability planning supported by technology, data and operational change rather than isolated reporting.',
    introTitle: 'Connect sustainability goals to operating decisions',
    intro: 'We help organisations structure sustainability initiatives around measurable objectives, reliable information and the business processes that must change to deliver them.',
    bullets: ['Sustainability strategy and roadmap', 'Data and reporting requirements', 'Technology-enabled operational improvement', 'Change and adoption planning'],
    howWeHelp: [
      help('Develop a Sustainability Strategy', 'Define priorities, measures and a staged sustainability roadmap.', 'We connect objectives to operational areas, data requirements, accountability and investment sequencing so the strategy can be implemented and measured.'),
      help('Change Management', 'Support the people and process changes required to make sustainability initiatives stick.', 'We identify affected groups, new behaviours, process ownership, communication, training and feedback mechanisms needed for sustained adoption.')
    ]
  },
  '/services/education/consultancy': {
    category: 'Education Services', title: 'Consultancy', image: IMAGES.educationConsulting,
    imageAlt: 'Education mentor advising a university student while reviewing work together on a laptop',
    secondaryImage: IMAGES.educationConsultingDetail,
    secondaryImageAlt: 'Teacher helping a student work on a laptop in a real library and classroom learning environment',
    lead: 'Education consultancy supported by structured processes, digital services and clear stakeholder communication.',
    introTitle: 'Connect education services with dependable digital operations',
    intro: 'RC combines education-domain understanding with digital process and technology capability to help education organisations improve service delivery, information flows and stakeholder experience.',
    bullets: ['Education service process design', 'Digital workflow support', 'Information and stakeholder coordination', 'Technology advisory for education operations'],
    howWeHelp: [
      help('Education Consultancy', 'Support education organisations and service operations with structured advisory and digital capability.', 'Engagement scope is defined around the specific education process, stakeholder needs, information requirements and technology support required.')
    ]
  }
};
