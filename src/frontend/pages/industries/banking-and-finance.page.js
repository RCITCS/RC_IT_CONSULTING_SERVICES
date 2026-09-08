import { INDUSTRY_PAGES } from '../../app/pages.js';
import { renderIndustryPage } from './industry.page.js';

const ROUTE = '/industry/banking-and-finance';

export function renderBankingAndFinancePage() {
  return renderIndustryPage(INDUSTRY_PAGES[ROUTE]);
}
