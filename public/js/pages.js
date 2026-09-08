import { IT_SERVICE_PAGES } from './pages-it.js';
import { MANAGEMENT_EDUCATION_SERVICE_PAGES } from './pages-management.js';
export { INDUSTRY_PAGES, HOME_CAPABILITIES, HOME_INDUSTRIES, FAQS } from './pages-industry.js';

export const SERVICE_PAGES = { ...IT_SERVICE_PAGES, ...MANAGEMENT_EDUCATION_SERVICE_PAGES };
