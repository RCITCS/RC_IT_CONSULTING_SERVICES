import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/management/sustainability';

export function renderSustainabilityPage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
