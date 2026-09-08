import { findServiceDetail } from '../app/pages.js';
import { renderHomePage } from '../pages/home.page.js';
import { renderAboutPage } from '../pages/about.page.js';
import { renderContactPage } from '../pages/contact.page.js';
import { renderProductsPage } from '../pages/products.page.js';
import { renderWhitePapersPage } from '../pages/white-papers.page.js';
import { renderCareersPage } from '../pages/careers.page.js';
import { renderCareerJobDetailPage } from '../pages/careers/job-detail.page.js';
import { renderJobApplicationPage } from '../pages/careers/application.page.js';
import { renderServiceDetailPage } from '../pages/services/service.page.js';
import { renderConsultancyServicesPage } from '../pages/services/it/consultancy-services.page.js';
import { renderCyberSecurityPage } from '../pages/services/it/cyber-security.page.js';
import { renderArtificialIntelligencePage } from '../pages/services/it/artificial-intelligence.page.js';
import { renderCloudComputingPage } from '../pages/services/it/cloud-computing.page.js';
import { renderBigDataPage } from '../pages/services/it/big-data.page.js';
import { renderItSupportServicesPage } from '../pages/services/it/it-support-services.page.js';
import { renderRiskPage } from '../pages/services/management/risk.page.js';
import { renderStrategyAndImplementationPage } from '../pages/services/management/strategy-and-implementation.page.js';
import { renderSustainabilityPage } from '../pages/services/management/sustainability.page.js';
import { renderEducationConsultancyPage } from '../pages/services/education/consultancy.page.js';
import { renderAutomotiveIndustryPage } from '../pages/industries/automotive.page.js';
import { renderBankingAndFinancePage } from '../pages/industries/banking-and-finance.page.js';
import { renderMediaAndCommunicationPage } from '../pages/industries/media-and-communication.page.js';
import { renderEducationIndustryPage } from '../pages/industries/education.page.js';
import { renderFaqsPage } from '../pages/support/faqs.page.js';
import { renderBlogPage } from '../pages/support/blog.page.js';
import { renderLoginPage } from '../pages/support/login.page.js';
import { renderPrivacyPage } from '../pages/support/privacy.page.js';
import { renderCookiesPage } from '../pages/support/cookies.page.js';
import { renderTermsPage } from '../pages/support/terms.page.js';
import { renderNotFoundPage } from '../pages/support/not-found.page.js';

const STATIC_ROUTES = new Map([
  ['/', renderHomePage],
  ['/about-us', renderAboutPage],
  ['/contact', renderContactPage],
  ['/products', renderProductsPage],
  ['/white-papers', renderWhitePapersPage],
  ['/careers', () => renderCareersPage('/careers')],
  ['/blog', renderBlogPage],
  ['/faqs', renderFaqsPage],
  ['/login', renderLoginPage],
  ['/privacy', renderPrivacyPage],
  ['/cookies', renderCookiesPage],
  ['/terms', renderTermsPage],
  ['/services/it/consultancy-services', renderConsultancyServicesPage],
  ['/services/it/cyber-security', renderCyberSecurityPage],
  ['/services/it/artificial-intelligence', renderArtificialIntelligencePage],
  ['/services/it/cloud-computing', renderCloudComputingPage],
  ['/services/it/big-data', renderBigDataPage],
  ['/services/it/it-support-services', renderItSupportServicesPage],
  ['/services/management/risk', renderRiskPage],
  ['/services/management/strategy-and-implementation', renderStrategyAndImplementationPage],
  ['/services/management/sustainability', renderSustainabilityPage],
  ['/services/education/consultancy', renderEducationConsultancyPage],
  ['/industry/automotive-industry-it-services', renderAutomotiveIndustryPage],
  ['/industry/banking-and-finance', renderBankingAndFinancePage],
  ['/industry/media-and-communication', renderMediaAndCommunicationPage],
  ['/industry/education', renderEducationIndustryPage]
]);

const LEGACY_ROUTES = new Map([
  ['/careers/job-opportunities', () => renderCareersPage('/careers')],
  ['/careers/upload-your-resume', () => renderCareersPage('/careers')],
  ['/consult-expert', renderContactPage]
]);

export function routeContent(pathName) {
  const staticRenderer = STATIC_ROUTES.get(pathName);
  if (staticRenderer) return staticRenderer();

  const legacyRenderer = LEGACY_ROUTES.get(pathName);
  if (legacyRenderer) return legacyRenderer();

  const serviceDetail = findServiceDetail(pathName);
  if (serviceDetail) return renderServiceDetailPage(serviceDetail);

  const applicationMatch = pathName.match(/^\/careers\/jobs\/([^/]+)\/apply$/);
  if (applicationMatch) return renderJobApplicationPage(applicationMatch[1]);

  if (/^\/careers\/jobs\/[^/]+$/.test(pathName)) return renderCareerJobDetailPage(pathName);

  return renderNotFoundPage();
}
