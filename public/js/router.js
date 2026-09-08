import { SERVICE_PAGES, INDUSTRY_PAGES, findServiceDetail } from './pages.js';
import { renderHome } from './render-home.js';
import { renderServicePage, renderServiceDetail, renderIndustryPage, renderAbout, renderProducts, renderWhitePapers } from './render-main.js';
import { renderContact } from './render-contact.js';
import { renderResume, renderJobs, renderFaqs, renderBlog, renderLogin, renderLegal, renderNotFound } from './render-support.js';

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
  if (pathName === '/careers/upload-your-resume') return renderResume();
  if (pathName === '/careers/job-opportunities') return renderJobs();
  if (pathName === '/faqs') return renderFaqs();
  if (pathName === '/blog') return renderBlog();
  if (pathName === '/login') return renderLogin();
  if (['/privacy','/cookies','/terms'].includes(pathName)) return renderLegal(pathName);
  return renderNotFound();
}
