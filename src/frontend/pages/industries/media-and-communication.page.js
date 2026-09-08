import { INDUSTRY_PAGES } from '../../app/pages.js';
import { renderIndustryPage } from './industry.page.js';

const ROUTE = '/industry/media-and-communication';

export function renderMediaAndCommunicationPage() {
  return renderIndustryPage(INDUSTRY_PAGES[ROUTE]);
}
