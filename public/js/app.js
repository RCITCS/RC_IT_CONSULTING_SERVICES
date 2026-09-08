import { headerTemplate, footerTemplate } from './components.js';
import { routeContent } from './router.js';
import { bindDesktopNav, bindMobileNav } from './interactions-nav.js';
import { bindContactOptions, bindLogin } from './interactions-page.js';
import { bindForms } from './forms.js';
import { bindDialogTriggers, bindAccordions } from './ui.js';
import { applyServicePageEnhancements } from './service-page-enhancements.js';
import { PRIMARY_NAV, FOOTER_GROUPS } from './site-config.js';
import { FAQS } from './pages.js';

function normaliseCareerConfiguration() {
  const careers = PRIMARY_NAV.find((item) => item.label === 'Careers');
  if (careers) {
    careers.href = '/careers';
    delete careers.groups;
  }

  const others = FOOTER_GROUPS.find((group) => group.label === 'Others');
  const footerCareers = others?.items.find((item) => item.label === 'Careers');
  if (footerCareers) footerCareers.href = '/careers';

  const careerFaq = FAQS.find((item) => item[0] === 'How do I apply for a role?');
  if (careerFaq) careerFaq[1] = 'Open Careers and select a published vacancy. Review the complete role description, qualifications, experience expectations, working style and location, then use the Apply button for that specific role. RC does not use a separate speculative resume-upload page.';
}

function normalisePath(path = '/') {
  const clean = path.replace(/\/+$/, '') || '/';
  return clean === '/index.php' ? '/' : clean;
}

normaliseCareerConfiguration();

const root = document.getElementById('site-root');
const pathName = normalisePath(location.pathname);
root.innerHTML = `${headerTemplate(pathName)}${routeContent(pathName)}${footerTemplate()}`;

applyServicePageEnhancements(pathName);
bindDesktopNav();
bindMobileNav();
bindDialogTriggers();
bindAccordions();
bindForms();
bindContactOptions();
bindLogin();
