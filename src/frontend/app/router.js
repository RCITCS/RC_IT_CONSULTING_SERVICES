import { SERVICE_PAGES, INDUSTRY_PAGES, findServiceDetail } from './pages.js';
import { renderHome } from './render-home.js';
import { renderServicePage, renderServiceDetail, renderIndustryPage, renderAbout, renderProducts, renderWhitePapers } from './render-main.js';
import { renderContact } from './render-contact.js';
import { renderCareers, renderCareerApplication } from './render-careers.js';
import { renderFaqs, renderBlog, renderLogin, renderLegal, renderNotFound } from './render-support.js';

export function routeContent(pathName) {
  if (pathName === '/') return renderHome();
  if (SERVICE_PAGES[pathName]) return renderServicePage(SERVICE_PAGES[pathName], pathName);

  const serviceDetail = findServiceDetail(pathName);
  if (serviceDetail) return renderServiceDetail(serviceDetail);

  if (INDUSTRY_PAGES[pathName]) return renderIndustryPage(INDUSTRY_PAGES[pathName]);
  if (pathName === '/about-us') return renderAbout();
  if (pathName === '/products') return renderProducts();
  if (pathName === '/white-papers') return renderWhitePapers();
  if (pathName === '/contact') return renderContact();

  if (pathName === '/careers') return renderCareers(pathName);
  const applicationMatch = pathName.match(/^\/careers\/jobs\/([^/]+)\/apply$/);
  if (applicationMatch) return renderCareerApplication(applicationMatch[1]);
  if (/^\/careers\/jobs\/[^/]+$/.test(pathName)) return renderCareers(pathName);

  if (pathName === '/faqs') return renderFaqs();
  if (pathName === '/blog') return renderBlog();
  if (pathName === '/login') return renderLogin();
  if (['/privacy','/cookies','/terms'].includes(pathName)) return renderLegal(pathName);
  return renderNotFound();
}
