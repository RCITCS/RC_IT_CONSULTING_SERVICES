import { footerTemplate } from '../components/footer.js';
import { headerTemplate } from '../components/navigation.js';

export function siteShell(pathName, pageContent) {
  return `<a class="skip-link" href="#main-content">Skip to main content</a>${headerTemplate(pathName)}${pageContent}${footerTemplate()}`;
}
