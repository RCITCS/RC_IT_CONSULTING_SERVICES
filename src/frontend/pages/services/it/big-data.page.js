import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/it/big-data';

export function renderBigDataPage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
