import { INDUSTRY_PAGES } from '../../app/pages.js';
import { renderIndustryPage } from './industry.page.js';

const ROUTE = '/industry/automotive-industry-it-services';

export function renderAutomotiveIndustryPage() {
  return renderIndustryPage(INDUSTRY_PAGES[ROUTE]);
}
