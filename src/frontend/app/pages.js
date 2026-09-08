import { IT_SERVICE_PAGES } from './pages-it.js';
import { MANAGEMENT_EDUCATION_SERVICE_PAGES } from './pages-management.js';
export { INDUSTRY_PAGES, HOME_CAPABILITIES, HOME_INDUSTRIES } from './pages-industry.js';
export { FAQS } from '../pages/support/faq-content.js';

export const SERVICE_PAGES = { ...IT_SERVICE_PAGES, ...MANAGEMENT_EDUCATION_SERVICE_PAGES };

export function findServiceDetail(pathName) {
  for (const [servicePath, page] of Object.entries(SERVICE_PAGES)) {
    if (!pathName.startsWith(`${servicePath}/`)) continue;
    const slug = pathName.slice(servicePath.length + 1);
    const item = page.howWeHelp?.find((candidate) => candidate.slug === slug);
    if (item) return { servicePath, page, item };
  }
  return null;
}
