export const COMPANY = {
  brand: 'RC IT Services',
  legalName: 'R C OVERSEAS LTD',
  companyNumber: '14124566',
  registeredOffice: '93 Metcalfe Court John Harrison Way, London, England, SE10 0BZ'
};

export const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1800&q=84',
  consulting: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=82',
  cyber: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=82',
  ai: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=82',
  cloud: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=82',
  bigData: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=82',
  support: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=82',
  risk: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=82',
  strategy: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=82',
  sustainability: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1600&q=82',
  educationConsulting: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=82',
  automotive: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=82',
  finance: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1600&q=82',
  media: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1600&q=82',
  education: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=82',
  about: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=82',
  careers: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=82',
  contact: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=82',
  products: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1600&q=82',
  whitePapers: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1600&q=82'
};

export const UTILITY_NAV = [
  { label: 'Blog', href: '/blog' },
  { label: 'FAQs', href: '/faqs' },
  { label: 'Login', href: '/login' }
];

export const PRIMARY_NAV = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about-us' },
  {
    label: 'SERVICES',
    groups: [
      {
        label: 'IT',
        items: [
          { label: 'Consultancy Services', href: '/services/it/consultancy-services' },
          { label: 'Cyber Security', href: '/services/it/cyber-security' },
          { label: 'Artificial Intelligence', href: '/services/it/artificial-intelligence' },
          { label: 'Cloud Computing', href: '/services/it/cloud-computing' },
          { label: 'Big Data', href: '/services/it/big-data' },
          { label: 'IT Support Services', href: '/services/it/it-support-services' }
        ]
      },
      {
        label: 'Management',
        items: [
          { label: 'Risk', href: '/services/management/risk' },
          { label: 'Strategy and Implementation', href: '/services/management/strategy-and-implementation' },
          { label: 'Sustainability', href: '/services/management/sustainability' }
        ]
      },
      {
        label: 'Education',
        items: [
          { label: 'Consultancy', href: '/services/education/consultancy' }
        ]
      }
    ]
  },
  {
    label: 'Industry',
    groups: [
      {
        label: 'Industry',
        items: [
          { label: 'Automotive Industry IT Services', href: '/industry/automotive-industry-it-services' },
          { label: 'Banking and Finance', href: '/industry/banking-and-finance' },
          { label: 'Media and Communication', href: '/industry/media-and-communication' },
          { label: 'Education', href: '/industry/education' }
        ]
      }
    ]
  },
  {
    label: 'Careers',
    groups: [
      {
        label: 'Careers',
        items: [
          { label: 'Job Opportunities', href: '/careers/job-opportunities' },
          { label: 'Upload your Resume', href: '/careers/upload-your-resume' }
        ]
      }
    ]
  },
  { label: 'Contact', href: '/contact' }
];

export const FOOTER_GROUPS = [
  {
    label: 'IT',
    items: PRIMARY_NAV[2].groups[0].items
  },
  {
    label: 'Management',
    items: PRIMARY_NAV[2].groups[1].items
  },
  {
    label: 'Education',
    items: [
      { label: 'Consultancy', href: '/services/education/consultancy' },
      { label: 'Education Industry', href: '/industry/education' }
    ]
  },
  {
    label: 'Industry',
    items: PRIMARY_NAV[3].groups[0].items
  },
  {
    label: 'Others',
    items: [
      { label: 'Our Products', href: '/products' },
      { label: 'Careers', href: '/careers/job-opportunities' },
      { label: 'Contact Us', href: '/contact' }
    ]
  }
];

export const ALL_ROUTES = [
  '/', '/blog', '/faqs', '/login', '/about-us',
  '/services/it/consultancy-services', '/services/it/cyber-security', '/services/it/artificial-intelligence',
  '/services/it/cloud-computing', '/services/it/big-data', '/services/it/it-support-services',
  '/services/management/risk', '/services/management/strategy-and-implementation', '/services/management/sustainability',
  '/services/education/consultancy',
  '/industry/automotive-industry-it-services', '/industry/banking-and-finance', '/industry/media-and-communication', '/industry/education',
  '/careers/job-opportunities', '/careers/upload-your-resume', '/contact',
  '/products', '/white-papers', '/consult-expert', '/privacy', '/cookies', '/terms'
];
