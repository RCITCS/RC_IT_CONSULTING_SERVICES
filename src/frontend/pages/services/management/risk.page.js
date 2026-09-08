import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/management/risk';

export function renderRiskPage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
