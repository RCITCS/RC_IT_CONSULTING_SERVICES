import { SERVICE_PAGES } from '../../../app/pages.js';
import { renderServicePage } from '../service.page.js';

const ROUTE = '/services/education/consultancy';

export function renderEducationConsultancyPage() {
  return renderServicePage(SERVICE_PAGES[ROUTE], ROUTE);
}
