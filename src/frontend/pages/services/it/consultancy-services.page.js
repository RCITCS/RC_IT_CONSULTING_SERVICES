import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/it/consultancy-services';

export function renderConsultancyServicesPage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
