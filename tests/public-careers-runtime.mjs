import assert from 'node:assert/strict';
import { handlePublicCareersRequest } from '../src/backend/runtime/public-careers.js';

const baseHtml = `<!doctype html><html><head>
<title>Technology Careers in the UK | RC IT Services</title>
<meta name="description" content="Careers base description" />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="https://production.example/careers" />
<meta property="og:title" content="Careers" />
<meta property="og:description" content="Careers" />
<meta property="og:url" content="https://production.example/careers" />
<meta name="twitter:title" content="Careers" />
<meta name="twitter:description" content="Careers" />
<script type="application/ld+json">{"@context":"https://schema.org"}</script>
</head><body><div id="site-root" data-prerendered-path="/careers"><main id="main-content" class="careers-page"><section><div class="career-no-openings"><h2>No roles are currently published.</h2><p>Base empty state.</p></div></section></main></div></body></html>`;

const listJob = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'RC-ENG-26-HYB-A1B2C3',
  slug: 'platform-engineer',
  title: 'Platform Engineer',
  category: 'Engineering',
  location: 'London, UK',
  workplace_type: 'hybrid',
  employment_type: 'full_time',
  experience: '5+ years'
};
const selectedJob = {
  ...listJob,
  summary: 'Build dependable platform capabilities.',
  description: 'Own platform delivery.\n\nImprove reliability.',
  technologies: ['Azure', 'Terraform'],
  required_skills: ['Production incident diagnosis'],
  preferred_skills: ['FinOps awareness'],
  industries: ['Banking & Finance'],
  responsibilities: ['Build reliable platforms'],
  qualifications: ['Production platform experience'],
  preferred_qualifications: ['Kubernetes experience'],
  benefits: ['Offer terms confirmed in writing'],
  working_style_details: ['Hybrid attendance is engagement-aligned.'],
  location_details: 'Primary employment location is London.',
  application_response_window: 'Expected review timeline: 5-7 business days',
  opens_at: '2026-09-10T00:00:00Z',
  published_at: '2026-09-10T00:00:00Z',
  closes_at: null,
  updated_at: '2026-09-10T00:00:00Z'
};

function env() {
  return {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test_only_not_a_real_secret',
    ASSETS: {
      async fetch() {
        return new Response(baseHtml, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' }
        });
      }
    }
  };
}

function successfulFetch(calls, selected = selectedJob, jobs = [listJob]) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), init, body: init.body ? JSON.parse(init.body) : null });
    assert.equal(String(url), 'https://example.supabase.co/rest/v1/rpc/get_public_careers_context');
    return new Response(JSON.stringify({ jobs, selected }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

{
  const calls = [];
  const response = await handlePublicCareersRequest(new Request('https://preview.example/careers'), env(), {
    fetchImpl: successfulFetch(calls)
  });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1, 'Careers root must use one database round trip.');
  assert.deepEqual(calls[0].body, { p_slug: null });
  for (const expected of [
    'Platform Engineer', 'Build dependable platform capabilities.', 'Azure', 'Industry context',
    'Banking &amp; Finance', 'Required skills', 'Production incident diagnosis', 'Preferred skills',
    'FinOps awareness', 'Application response window', '5-7 business days', 'Preferred qualifications',
    'Kubernetes experience', 'Nature of working style', 'Hybrid attendance is engagement-aligned',
    'Primary employment location is London'
  ]) assert.ok(html.includes(expected), `Careers root omitted canonical candidate content: ${expected}`);
  assert.match(html, /href="\/careers\/jobs\/platform-engineer#role-detail"/);
  assert.ok(html.includes('name="robots" content="index,follow"'));
  assert.ok(html.includes('rel="canonical" href="https://production.example/careers"'), 'Runtime must preserve the build-approved canonical origin.');
  assert.equal(html.includes('Base empty state.'), false);
}

{
  const calls = [];
  const response = await handlePublicCareersRequest(new Request('https://preview.example/careers/jobs/platform-engineer'), env(), {
    fetchImpl: successfulFetch(calls)
  });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1, 'Job detail must not perform duplicate list/detail database requests.');
  assert.deepEqual(calls[0].body, { p_slug: 'platform-engineer' });
  assert.ok(html.includes('<title>Platform Engineer | Careers | RC IT Services</title>'));
  assert.ok(html.includes('rel="canonical" href="https://production.example/careers/jobs/platform-engineer"'));
  assert.ok(html.includes('name="robots" content="index,follow"'), 'Published canonical job pages must remain crawlable.');
  assert.match(html, /Key responsibilities/);
  assert.match(html, /Required skills/);
  assert.match(html, /Preferred skills/);
  assert.match(html, /Application response window/);
  assert.ok(html.includes('Applications opening soon'), 'Phase 11 must show a truthful disabled application state.');
  assert.equal(html.includes('href="/careers/jobs/platform-engineer/apply"'), false, 'Phase 11 must not advertise a working apply CTA before intake is live.');
  assert.equal(html.includes('data-rcitcs-job-posting'), false, 'Phase 11 must not claim Google JobPosting eligibility before a working application method exists.');
}

{
  const calls = [];
  const response = await handlePublicCareersRequest(new Request('https://preview.example/careers/jobs/platform-engineer/apply'), env(), {
    fetchImpl: successfulFetch(calls)
  });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.ok(html.includes('Applications are not open yet'));
  assert.ok(html.includes('No application has been submitted.'));
  assert.ok(html.includes('name="robots" content="noindex,nofollow"'));
  assert.equal(html.includes('type="file"'), false, 'Phase 11 must not expose an enabled Phase 12 document form.');
  assert.equal(html.includes('data-rcitcs-job-posting'), false, 'Application routes must not claim to be canonical JobPosting pages.');
}

{
  const calls = [];
  const response = await handlePublicCareersRequest(new Request('https://preview.example/careers/jobs/missing-role'), env(), {
    fetchImpl: successfulFetch(calls, null, [listJob])
  });
  const html = await response.text();
  assert.equal(response.status, 404);
  assert.match(html, /not currently published/);
  assert.ok(html.includes('name="robots" content="noindex,nofollow"'));
  assert.equal(/rel="canonical"/.test(html), false, 'Unavailable job routes must not claim a canonical vacancy URL.');
}

{
  const response = await handlePublicCareersRequest(new Request('https://preview.example/careers'), env(), {
    fetchImpl: async () => new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 })
  });
  const html = await response.text();
  assert.equal(response.status, 503);
  assert.match(html, /temporarily unavailable/);
  assert.ok(html.includes('name="robots" content="noindex,nofollow"'));
  assert.equal(html.includes('Platform Engineer'), false, 'Provider failure must not fabricate or fall back to stale job data.');
  assert.match(response.headers.get('cache-control') || '', /no-store/);
}

{
  const response = await handlePublicCareersRequest(new Request('https://preview.example/careers', { method: 'POST' }), env(), {
    fetchImpl: async () => { throw new Error('must not be called'); }
  });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
}

{
  const response = await handlePublicCareersRequest(new Request('https://preview.example/careers', { method: 'HEAD' }), env(), {
    fetchImpl: successfulFetch([])
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
}

console.log('PASS: Phase 11 public Careers uses one canonical DB content contract, renders locked candidate fields, keeps published jobs crawlable, truthfully defers application/JobPosting eligibility to Phase 12, fails closed, and handles 404/405/HEAD correctly.');
