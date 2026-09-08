globalThis.document = { title: '' };

const { routeContent } = await import('../src/frontend/router/router.js');
const { ALL_ROUTES } = await import('../src/frontend/app/site-config.js');
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

const staticRoutes = new Set([...ALL_ROUTES, '/careers']);
for (const route of staticRoutes) {
  assertPage(route, routeContent(route));
}

let serviceDetailCount = 0;
for (const [serviceRoute, page] of Object.entries(SERVICE_PAGES)) {
  assertPage(serviceRoute, routeContent(serviceRoute));
  for (const capability of page.howWeHelp || []) {
    const route = `${serviceRoute}/${capability.slug}`;
    assertPage(route, routeContent(route));
    serviceDetailCount += 1;
  }
}

const jobs = getPublishedJobs();
for (const job of jobs) {
  assertPage(`/careers/jobs/${job.slug}`, routeContent(`/careers/jobs/${job.slug}`));
  assertPage(`/careers/jobs/${job.slug}/apply`, routeContent(`/careers/jobs/${job.slug}/apply`));
}

const notFound = routeContent('/route-that-does-not-exist');
assert(notFound.includes('Page not found'), 'Unknown route did not render the not-found page');

console.log(`PASS: ${staticRoutes.size} static/alias routes, ${serviceDetailCount} service detail routes and ${jobs.length * 2} career detail/application routes rendered successfully.`);
