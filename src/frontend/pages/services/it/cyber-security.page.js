import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/it/cyber-security';

export function renderCyberSecurityPage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
