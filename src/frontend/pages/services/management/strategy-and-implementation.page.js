import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/management/strategy-and-implementation';

export function renderStrategyAndImplementationPage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
