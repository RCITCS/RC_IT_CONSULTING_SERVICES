import { headerTemplate, footerTemplate } from './components.js';
import { routeContent } from './router.js';
import { bindDesktopNav, bindMobileNav } from './interactions-nav.js';
import { bindContactOptions, bindLogin } from './interactions-page.js';
import { bindForms } from './forms.js';
import { bindDialogTriggers, bindAccordions } from './ui.js';

function normalisePath(path = '/') {
  const clean = path.replace(/\/+$/, '') || '/';
  return clean === '/index.php' ? '/' : clean;
}

const root = document.getElementById('site-root');
const pathName = normalisePath(location.pathname);
root.innerHTML = `${headerTemplate(pathName)}${routeContent(pathName)}${footerTemplate()}`;

bindDesktopNav();
bindMobileNav();
bindDialogTriggers();
bindAccordions();
bindForms();
bindContactOptions();
bindLogin();
