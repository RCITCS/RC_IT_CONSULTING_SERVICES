import { IMAGES } from './site-config.js';

export const INDUSTRY_PAGES = {
  '/industry/automotive-industry-it-services': {
    category: 'Industry', title: 'Automotive Industry IT Services', image: IMAGES.automotive,
    imageAlt: 'Modern vehicle representing automotive technology and digital mobility services',
    lead: 'Technology services for automotive and mobility organisations managing connected products, operations and data.',
    introTitle: 'Technology across the automotive value chain',
    intro: 'Automotive technology programmes must coordinate product systems, enterprise platforms, operational data and partner ecosystems. We approach delivery through clear integration boundaries, quality requirements and operational ownership.',
    bullets: ['Digital product and application engineering', 'Data and analytics', 'Cloud and platform modernisation', 'Enterprise integration and quality engineering']
  },
  '/industry/banking-and-finance': {
    category: 'Industry', title: 'Banking and Finance', image: IMAGES.finance,
    imageAlt: 'Financial technology workspace representing banking and finance services',
    lead: 'Engineering and consulting for financial services environments where security, integrity and operational resilience matter.',
    introTitle: 'Modernise financial technology without losing control',
    intro: 'Financial services delivery requires disciplined security, data governance, change control and recoverability. We help teams modernise applications, data and cloud platforms while keeping those constraints explicit.',
    bullets: ['Application and API modernisation', 'Data engineering and analytics', 'Cloud and DevOps enablement', 'Security, quality and operational resilience']
  },
  '/industry/media-and-communication': {
    category: 'Industry', title: 'Media and Communication', image: IMAGES.media,
    imageAlt: 'Professional media production and communication technology studio',
    lead: 'Digital platforms and technology services for media, communication and content-driven organisations.',
    introTitle: 'Support fast-moving digital content and customer experiences',
    intro: 'Media and communication platforms often combine high-volume content, customer-facing experiences, integrations and analytics. We design for performance, availability, release speed and observable operations.',
    bullets: ['Digital experience engineering', 'Cloud-native platforms', 'Content and data integrations', 'Analytics and operational observability']
  },
  '/industry/education': {
    category: 'Industry', title: 'Education', image: IMAGES.education,
    imageAlt: 'University campus and students representing education technology services',
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
  ['What services does RC IT Services provide?', 'The website covers IT consultancy, cyber security, artificial intelligence, cloud computing, big data, IT support, management services and education consultancy, with dedicated industry pages.'],
  ['How can an organisation engage RC IT Services?', 'The site supports project and consultation enquiries through the Contact and Consult our Expert flows. Engagement scope, delivery model and commercial terms should be agreed during discovery.'],
  ['Can I request a product demonstration?', 'Yes. Use Our Products and select Request a Demo for the relevant product. The form validates required business information before submission.'],
  ['How do I apply for a role?', 'Open Careers and choose Upload your Resume. The form accepts PDF, DOC and DOCX files up to 5 MB and requires explicit consent before upload.'],
  ['Is the Login page active?', 'The user interface is present, but authentication is deliberately not enabled until an approved identity provider and portal backend are selected. The build never pretends that an unauthenticated login succeeded.']
];
