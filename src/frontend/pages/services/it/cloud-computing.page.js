import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/it/cloud-computing';

export function renderCloudComputingPage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
