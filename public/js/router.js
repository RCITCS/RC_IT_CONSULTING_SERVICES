import { SERVICE_PAGES, INDUSTRY_PAGES } from './pages.js';
import { renderHome } from './render-home.js';
import { renderServicePage, renderIndustryPage, renderAbout, renderProducts, renderWhitePapers, renderConsultExpert, renderContact } from './render-main.js';
import { renderResume, renderJobs, renderFaqs, renderBlog, renderLogin, renderLegal, renderNotFound } from './render-support.js';

export function routeContent(pathName) {
  if (pathName === '/') return renderHome();
  if (SERVICE_PAGES[pathName]) return renderServicePage(SERVICE_PAGES[pathName]);
  if (INDUSTRY_PAGES[pathName]) return renderIndustryPage(INDUSTRY_PAGES[pathName]);
  if (pathName === '/about-us') return renderAbout();
  if (pathName === '/products') return renderProducts();
  if (pathName === '/white-papers') return renderWhitePapers();
  if (pathName === '/consult-expert') return renderConsultExpert();
  if (pathName === '/contact') return renderContact();
  if (pathName === '/careers/upload-your-resume') return renderResume();
  if (pathName === '/careers/job-opportunities') return renderJobs();
  if (pathName === '/faqs') return renderFaqs();
  if (pathName === '/blog') return renderBlog();
  if (pathName === '/login') return renderLogin();
  if (['/privacy','/cookies','/terms'].includes(pathName)) return renderLegal(pathName);
  return renderNotFound();
}
