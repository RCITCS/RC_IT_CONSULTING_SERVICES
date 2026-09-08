import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/it/it-support-services';

export function renderItSupportServicesPage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
