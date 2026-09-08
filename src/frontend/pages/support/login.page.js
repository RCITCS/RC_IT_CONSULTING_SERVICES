import { IMAGES } from '../../app/site-config.js';
import { pageHero, arrow } from '../../app/components.js';
import { pageTitle } from '../../app/render-helpers.js';

export function renderLoginPage() {
  pageTitle('Login');
  return `<main id="main-content">${pageHero({category:'Login',title:'Client / Staff Login',lead:'Secure access is reserved for authorised RC client and staff users.',image:IMAGES.support,imageAlt:'Professional support team working with computers and headsets in a real office',crumbs:[{label:'Home',href:'/'},{label:'Login'}]})}
    <section class="section"><div class="container split"><div><span class="eyebrow">Secure access</span><h2>Access to RC workspaces is provisioned directly.</h2><p>Client and staff environments may contain project, delivery or operational information and are therefore not open for public self-registration. Access is provided to authorised users for the specific workspace or service they are entitled to use.</p><ul class="list-check"><li>Access is role-based and linked to an authorised business relationship.</li><li>Credentials and workspace permissions are managed through the relevant RC engagement.</li><li>Users who cannot access an expected workspace should contact their RC point of contact.</li></ul></div><div class="empty-state"><span class="eyebrow">Need access?</span><h2>Contact the RC team</h2><p>If you are an existing client, partner or staff member and require access assistance, use the contact page and identify the relevant project or service.</p><a class="btn btn--primary" href="/contact">Contact Us ${arrow()}</a></div></div></section></main>`;
}
