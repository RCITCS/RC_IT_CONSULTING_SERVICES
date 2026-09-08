import { IMAGES } from './site-config.js';

export const INDUSTRY_PAGES = {
  '/industry/automotive-industry-it-services': {
    category: 'Industry', title: 'Automotive Industry IT Services', image: IMAGES.automotive,
    imageAlt: 'Automotive engineers collaborating on a vehicle technology project in a real workshop',
    secondaryImage: IMAGES.automotiveDetail,
    secondaryImageAlt: 'Automotive technician using a laptop inside a vehicle for digital diagnostics in a real workshop',
    lead: 'Technology services for automotive and mobility organisations managing connected products, enterprise platforms, operational systems and data-intensive engineering environments.',
    introTitle: 'Technology across the automotive value chain',
    intro: 'Automotive technology programmes must coordinate product engineering, enterprise platforms, manufacturing and service operations, partner ecosystems and high-volume operational data. We approach delivery through explicit integration boundaries, quality requirements, security controls and operational ownership.',
    bullets: ['Digital product and application engineering', 'Vehicle and operational data integration', 'Cloud and platform modernisation', 'Enterprise integration and quality engineering'],
    priorities: [
      ['Connected product ecosystems', 'Vehicle, mobile, partner and enterprise systems need reliable APIs, event flows, identity boundaries and observability across multiple owners.'],
      ['Engineering quality at scale', 'Automotive systems combine long product lifecycles with frequent software change. Release governance, test automation and traceability need to work together.'],
      ['Operational data value', 'Telemetry, service, manufacturing and customer data become more useful when ownership, quality, retention and analytical use are designed deliberately.']
    ],
    solutions: ['Application and API modernisation', 'Cloud and platform engineering', 'Data engineering and analytics', 'DevSecOps and quality engineering', 'Integration architecture', 'Operational observability'],
    outcomes: ['Faster, safer software change', 'Improved integration reliability', 'Better use of engineering and operational data', 'Clearer ownership across product and enterprise technology']
  },
  '/industry/banking-and-finance': {
    category: 'Industry', title: 'Banking and Finance', image: IMAGES.finance,
    imageAlt: 'Financial services professionals reviewing charts and business data together in a real office',
    secondaryImage: IMAGES.financeDetail,
    secondaryImageAlt: 'Finance and technology professionals analysing financial data on a laptop during a real office meeting',
    lead: 'Engineering and consulting for financial-services environments where security, data integrity, change control and operational resilience are fundamental design requirements.',
    introTitle: 'Modernise financial technology without losing control',
    intro: 'Financial-services delivery requires disciplined security, traceable data, controlled change and recoverability. We help teams modernise applications, integration, data and cloud platforms while keeping governance, auditability and operational resilience explicit throughout delivery.',
    bullets: ['Application and API modernisation', 'Data engineering and analytics', 'Cloud and DevOps enablement', 'Security, quality and operational resilience'],
    priorities: [
      ['Resilient digital services', 'Customer and internal services need availability, recoverability, monitoring and controlled release patterns that match their business criticality.'],
      ['Trusted financial data', 'Data lineage, quality, reconciliation, access control and clear metric definitions are essential when decisions and reporting depend on consistent information.'],
      ['Secure modernisation', 'Legacy change, cloud adoption and API integration must preserve security controls, segregation of duties, evidence and operational ownership.']
    ],
    solutions: ['Secure application engineering', 'API and integration architecture', 'Cloud modernisation', 'Data platforms and BI', 'Identity and access controls', 'Quality engineering and release assurance'],
    outcomes: ['More reliable customer and operational services', 'Stronger data integrity and traceability', 'Reduced change risk', 'Improved visibility into service health and operational controls']
  },
  '/industry/media-and-communication': {
    category: 'Industry', title: 'Media and Communication', image: IMAGES.media,
    imageAlt: 'Video editing professional working with advanced production monitors in a real studio',
    secondaryImage: IMAGES.mediaDetail,
    secondaryImageAlt: 'Media professionals collaborating in a real post-production and communication studio',
    lead: 'Digital platforms and technology services for media, communications and content-driven organisations operating across fast-moving customer, production and distribution channels.',
    introTitle: 'Support fast-moving digital content and customer experiences',
    intro: 'Media and communication platforms often combine high-volume content, customer-facing applications, real-time integrations, rights or workflow data and demanding analytics. We design for performance, availability, release speed, scalable delivery and observable operations.',
    bullets: ['Digital experience engineering', 'Cloud-native platforms', 'Content and data integrations', 'Analytics and operational observability'],
    priorities: [
      ['Content at scale', 'Publishing, production and distribution workflows need reliable asset movement, metadata, permissions and integration across multiple platforms.'],
      ['Audience experience', 'Web and application experiences must balance speed, accessibility, personalisation, analytics and release cadence across changing campaigns and content.'],
      ['Operational visibility', 'Teams need useful telemetry across applications, integrations and distribution workflows to find failures quickly and understand service performance.']
    ],
    solutions: ['Digital experience platforms', 'Content workflow integration', 'Cloud-native engineering', 'API and event-driven integration', 'Audience and operational analytics', 'Performance and observability engineering'],
    outcomes: ['Faster content and feature delivery', 'More dependable digital experiences', 'Better visibility across content and platform operations', 'Scalable integration and analytics foundations']
  },
  '/industry/education': {
    category: 'Industry', title: 'Education', image: IMAGES.education,
    imageAlt: 'Students learning in a real computer lab with a teacher instructing digital technology',
    secondaryImage: IMAGES.educationDetail,
    secondaryImageAlt: 'Students and a teacher collaborating with laptops in a real classroom learning environment',
    lead: 'Technology and digital services for education organisations, learners, staff and administrative operations, designed around accessible journeys, secure information and maintainable platforms.',
    introTitle: 'Build education technology around real user journeys',
    intro: 'Education systems serve learners, parents, teachers, administrators and external stakeholders while often connecting fragmented processes and legacy systems. We focus on accessible user experiences, secure information flows, reliable integrations, clear roles and operational supportability.',
    bullets: ['Student and staff digital experiences', 'Application and portal development', 'Data, reporting and workflow integration', 'Cloud, security and support services'],
    priorities: [
      ['Joined-up user journeys', 'Admissions, learning, communication, administration and support can span multiple tools. We design workflows around the end user rather than around system boundaries.'],
      ['Sensitive information', 'Student and staff information requires clear access controls, retention rules, auditability and secure integration between systems.'],
      ['Accessible, supportable platforms', 'Digital services need inclusive interfaces, predictable performance, maintainable architecture and operational support appropriate to education environments.']
    ],
    solutions: ['Student and staff portals', 'Admissions and workflow platforms', 'Education data integration', 'Reporting and analytics', 'Cloud and security architecture', 'Accessibility and support engineering'],
    outcomes: ['Simpler learner and staff journeys', 'Reduced manual administration', 'Improved information quality and reporting', 'More secure and maintainable education platforms']
  }
};

export const HOME_CAPABILITIES = [
  { title: 'Next-generation technology and consulting', text: 'Architecture and delivery decisions grounded in business context.', image: IMAGES.homeConsulting },
  { title: 'Digital transformation', text: 'Modernise processes and platforms through staged, measurable change.', image: IMAGES.homeTransformation },
  { title: 'Artificial Intelligence', text: 'Apply AI where evidence, data and operating controls support it.', image: IMAGES.homeAI },
  { title: 'Innovation', text: 'Test valuable ideas before scaling technology and delivery cost.', image: IMAGES.homeInnovation },
  { title: 'Sensor/Data Integrity / Machine Learning', text: 'Connect data quality, engineering and machine learning responsibly.', image: IMAGES.homeData },
  { title: 'Education solutions', text: 'Digital services and consulting for education operations and users.', image: IMAGES.homeEducation }
];

export const HOME_INDUSTRIES = [
  { title: 'Automotive', text: 'Connected products, enterprise platforms and mobility data.', href: '/industry/automotive-industry-it-services', image: IMAGES.homeAutomotive },
  { title: 'Banking & Finance', text: 'Secure, resilient digital and data modernisation.', href: '/industry/banking-and-finance', image: IMAGES.homeFinance },
  { title: 'Communication', text: 'Digital experiences, content platforms and analytics.', href: '/industry/media-and-communication', image: IMAGES.homeMedia },
  { title: 'Education', text: 'Accessible platforms and connected education workflows.', href: '/industry/education', image: IMAGES.homeEducationIndustry }
];

export const FAQS = [
  ['What services does RC IT Services provide?', 'RC IT Services covers technology consultancy, cyber security, artificial intelligence, cloud computing, data engineering and analytics, IT support, management services and education consultancy, supported by dedicated industry capability.'],
  ['How can an organisation engage RC IT Services?', 'Use Contact and describe the business outcome, systems involved, timeline and known constraints. The consultation topic routes the enquiry to the appropriate service area without creating a separate competing contact journey.'],
  ['Can I request a product demonstration?', 'Yes. Open Our Products, choose the relevant product and select Request a Demo to provide your organisation and evaluation requirements.'],
  ['How do I apply for a role?', 'Open Careers and select a published vacancy. Review the complete job description, qualifications, experience expectations, working style and location, then use the Apply button for that specific role. RC does not use a separate speculative resume-upload page.'],
  ['Who can use the Login area?', 'Client and staff access is reserved for authorised users. Workspace access is provisioned directly for the relevant engagement, project or internal role rather than through public self-registration.']
];
