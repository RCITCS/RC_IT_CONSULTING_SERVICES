import { IMAGES } from './site-config.js';

export const INDUSTRY_PAGES = {
  '/industry/automotive-industry-it-services': {
    category: 'Industry', title: 'Automotive Industry IT Services', image: IMAGES.automotive,
    imageAlt: 'Automotive engineers collaborating on a vehicle technology project in a real workshop',
    lead: 'Technology services for automotive and mobility organisations managing connected products, operations and data.',
    introTitle: 'Technology across the automotive value chain',
    intro: 'Automotive technology programmes must coordinate product systems, enterprise platforms, operational data and partner ecosystems. We approach delivery through clear integration boundaries, quality requirements and operational ownership.',
    bullets: ['Digital product and application engineering', 'Data and analytics', 'Cloud and platform modernisation', 'Enterprise integration and quality engineering']
  },
  '/industry/banking-and-finance': {
    category: 'Industry', title: 'Banking and Finance', image: IMAGES.finance,
    imageAlt: 'Business professionals collaborating on financial data analysis in a real office',
    lead: 'Engineering and consulting for financial services environments where security, integrity and operational resilience matter.',
    introTitle: 'Modernise financial technology without losing control',
    intro: 'Financial services delivery requires disciplined security, data governance, change control and recoverability. We help teams modernise applications, data and cloud platforms while keeping those constraints explicit.',
    bullets: ['Application and API modernisation', 'Data engineering and analytics', 'Cloud and DevOps enablement', 'Security, quality and operational resilience']
  },
  '/industry/media-and-communication': {
    category: 'Industry', title: 'Media and Communication', image: IMAGES.media,
    imageAlt: 'Media professionals collaborating on video post-production in a real studio environment',
    lead: 'Digital platforms and technology services for media, communication and content-driven organisations.',
    introTitle: 'Support fast-moving digital content and customer experiences',
    intro: 'Media and communication platforms often combine high-volume content, customer-facing experiences, integrations and analytics. We design for performance, availability, release speed and observable operations.',
    bullets: ['Digital experience engineering', 'Cloud-native platforms', 'Content and data integrations', 'Analytics and operational observability']
  },
  '/industry/education': {
    category: 'Industry', title: 'Education', image: IMAGES.education,
    imageAlt: 'Students working at desktop computers in a real school computer lab in Chennai',
    lead: 'Technology and digital services for education organisations, learners, staff and administrative operations.',
    introTitle: 'Build education technology around real user journeys',
    intro: 'Education systems serve multiple user groups and often connect fragmented processes. We focus on accessible user experiences, secure information flows, reliable integrations and maintainable platforms.',
    bullets: ['Student and staff digital experiences', 'Application and portal development', 'Data, reporting and workflow integration', 'Cloud, security and support services']
  }
};

export const HOME_CAPABILITIES = [
  { title: 'Next-generation technology and consulting', text: 'Architecture and delivery decisions grounded in business context.', image: IMAGES.consulting },
  { title: 'Digital transformation', text: 'Modernise processes and platforms through staged, measurable change.', image: IMAGES.strategy },
  { title: 'Artificial Intelligence', text: 'Apply AI where evidence, data and operating controls support it.', image: IMAGES.ai },
  { title: 'Innovation', text: 'Test valuable ideas before scaling technology and delivery cost.', image: IMAGES.hero },
  { title: 'Sensor/Data Integrity / Machine Learning', text: 'Connect data quality, engineering and machine learning responsibly.', image: IMAGES.bigData },
  { title: 'Education solutions', text: 'Digital services and consulting for education operations and users.', image: IMAGES.education }
];

export const HOME_INDUSTRIES = [
  { title: 'Automotive', text: 'Connected products, enterprise platforms and mobility data.', href: '/industry/automotive-industry-it-services', image: IMAGES.automotive },
  { title: 'Banking & Finance', text: 'Secure, resilient digital and data modernisation.', href: '/industry/banking-and-finance', image: IMAGES.finance },
  { title: 'Communication', text: 'Digital experiences, content platforms and analytics.', href: '/industry/media-and-communication', image: IMAGES.media },
  { title: 'Education', text: 'Accessible platforms and connected education workflows.', href: '/industry/education', image: IMAGES.education }
];

export const FAQS = [
  ['What services does RC IT Services provide?', 'RC IT Services covers technology consultancy, cyber security, artificial intelligence, cloud computing, data engineering and analytics, IT support, management services and education consultancy, supported by dedicated industry capability.'],
  ['How can an organisation engage RC IT Services?', 'Start through Contact or Consult our Expert and describe the business outcome, systems involved, timeline and known constraints. The appropriate engagement model and scope can then be defined around the requirement.'],
  ['Can I request a product demonstration?', 'Yes. Open Our Products, choose the relevant product and select Request a Demo to provide your organisation and evaluation requirements.'],
  ['How do I apply for a role?', 'Open Careers and choose Upload your Resume. You can provide your experience, primary skills, work-authorisation information and CV for consideration against relevant opportunities.'],
  ['Who can use the Login area?', 'Client and staff access is reserved for authorised users. Workspace access is provisioned directly for the relevant engagement, project or internal role rather than through public self-registration.']
];
