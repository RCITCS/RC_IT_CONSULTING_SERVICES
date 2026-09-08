globalThis.document = { title: '' };

const { routeContent } = await import('../src/frontend/router/router.js');
const { ALL_ROUTES, LEGACY_ROUTE_ALIASES } = await import('../src/frontend/app/site-config.js');
const { SERVICE_PAGES } = await import('../src/frontend/app/pages.js');
const { getPublishedJobs } = await import('../src/frontend/app/career-job-catalog.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPage(route, html) {
  assert(typeof html === 'string', `${route} did not return HTML`);
  assert(html.includes('id="main-content"'), `${route} is missing the main content landmark`);
  assert(!html.includes('undefined'), `${route} rendered an undefined value`);
  assert(!html.includes('[object Object]'), `${route} rendered an object accidentally`);
}

for (const route of ALL_ROUTES) {
  assertPage(route, routeContent(route));
}

for (const route of LEGACY_ROUTE_ALIASES) {
  assertPage(route, routeContent(route));
}

let serviceDetailCount = 0;
for (const [serviceRoute, page] of Object.entries(SERVICE_PAGES)) {
  const serviceHtml = routeContent(serviceRoute);
  assertPage(serviceRoute, serviceHtml);
  assert(serviceHtml.includes(page.title), `${serviceRoute} does not render its configured service title`);

  for (const capability of page.howWeHelp || []) {
    const route = `${serviceRoute}/${capability.slug}`;
    const html = routeContent(route);
    assertPage(route, html);
    assert(html.includes(capability.title), `${route} does not render its configured capability title`);
    serviceDetailCount += 1;
  }
}

const jobs = getPublishedJobs();
for (const job of jobs) {
  const detailRoute = `/careers/jobs/${job.slug}`;
  const applicationRoute = `/careers/jobs/${job.slug}/apply`;
  const detailHtml = routeContent(detailRoute);
  const applicationHtml = routeContent(applicationRoute);

  assertPage(detailRoute, detailHtml);
  assertPage(applicationRoute, applicationHtml);
  assert(detailHtml.includes(job.title), `${detailRoute} does not render the selected job title`);
  assert(applicationHtml.includes(`Apply for ${job.title}`), `${applicationRoute} lost job-specific application context`);
}

const careersHtml = routeContent('/careers');
assert(careersHtml.includes('Current openings'), 'Careers page lost the current openings experience');
assert(!careersHtml.includes('Upload your Resume</a>'), 'Careers page regressed to the old standalone resume-upload journey');

const faqHtml = routeContent('/faqs');
assert(faqHtml.includes('RC does not use a separate speculative resume-upload page.'), 'FAQ still describes the retired resume-upload workflow');

const contactHtml = routeContent('/contact');
assert(contactHtml.includes('Consultation topic *'), 'Contact page lost the unified consultation topic field');
assert(contactHtml.includes('name="email"'), 'Contact page must use the Email field');
assert(!contactHtml.includes('Business Email'), 'Contact page regressed to Business Email wording');
assert(!contactHtml.includes('Company / Organisation *'), 'Company / Organisation must remain optional');
assert(!contactHtml.includes('Job Title *'), 'Job Title must remain optional');

const legacyCareerHtml = routeContent('/careers/upload-your-resume');
assert(legacyCareerHtml.includes('Current openings'), 'Legacy resume URL no longer resolves to the consolidated Careers experience');

const legacyConsultHtml = routeContent('/consult-expert');
assert(legacyConsultHtml.includes('Consultation topic *'), 'Legacy Consult our Expert URL no longer resolves to unified Contact');

const notFound = routeContent('/route-that-does-not-exist');
assert(notFound.includes('Page not found'), 'Unknown route did not render the not-found page');

console.log(`PASS: ${ALL_ROUTES.length} canonical routes, ${LEGACY_ROUTE_ALIASES.length} compatibility aliases, ${serviceDetailCount} service detail routes and ${jobs.length * 2} career detail/application routes rendered successfully with Phase 3 content invariants.`);
