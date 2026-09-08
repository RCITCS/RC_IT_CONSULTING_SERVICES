import { INDUSTRY_PAGES } from '../../app/pages.js';
import { renderIndustryPage } from './industry.page.js';

const ROUTE = '/industry/education';

export function renderEducationIndustryPage() {
  return renderIndustryPage(INDUSTRY_PAGES[ROUTE]);
}
