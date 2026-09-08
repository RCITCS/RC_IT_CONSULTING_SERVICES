import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/it/artificial-intelligence';

export function renderArtificialIntelligencePage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
