import assert from 'node:assert/strict';
import { handlePublicSitemapRequest } from '../src/backend/runtime/public-sitemap.js';

const productionXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://production.example/</loc></url>
  <url><loc>https://production.example/careers</loc></url>
</urlset>
`;
const previewXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`;

function env(xml = productionXml) {
  return {
    PUBLIC_CAREERS_API_URL: 'https://example.supabase.co/functions/v1/public-careers',
    ASSETS: {
      async fetch() {
        return new Response(xml, {
          status: 200,
          headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' }
        });
      }
    }
  };
}

function publicJobsFetch(calls) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify({
      jobs: [
        { id: '1', code: 'RC-A', slug: 'senior-data-engineer', title: 'Senior Data Engineer' },
        { id: '2', code: 'RC-B', slug: 'platform-engineer', title: 'Platform Engineer' }
      ],
      selected: null
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

{
  const calls = [];
  const response = await handlePublicSitemapRequest(new Request('https://preview-host.example/sitemap.xml'), env(), { fetchImpl: publicJobsFetch(calls) });
  const xml = await response.text();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].body, { slug: null });
  assert.ok(xml.includes('<loc>https://production.example/careers/jobs/senior-data-engineer</loc>'));
  assert.ok(xml.includes('<loc>https://production.example/careers/jobs/platform-engineer</loc>'));
  assert.equal(xml.includes('/apply</loc>'), false);
  assert.equal((xml.match(/senior-data-engineer/g) || []).length, 1);
  assert.match(response.headers.get('content-type') || '', /application\/xml/);
  assert.match(response.headers.get('cache-control') || '', /must-revalidate/);
}

{
  let dependencyCalls = 0;
  const response = await handlePublicSitemapRequest(new Request('https://branch-preview.example/sitemap.xml'), env(previewXml), {
    fetchImpl: async () => { dependencyCalls += 1; throw new Error('must not call vacancy API for zero-entry preview sitemap'); }
  });
  assert.equal(response.status, 200);
  assert.equal(dependencyCalls, 0);
  assert.equal(await response.text(), previewXml);
}

{
  const response = await handlePublicSitemapRequest(new Request('https://production.example/sitemap.xml'), env(), {
    fetchImpl: async () => new Response('unavailable', { status: 503 })
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), productionXml, 'Static sitemap must remain available during vacancy projection failure.');
}

{
  const response = await handlePublicSitemapRequest(new Request('https://production.example/sitemap.xml', { method: 'HEAD' }), env(), { fetchImpl: publicJobsFetch([]) });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
}

{
  const response = await handlePublicSitemapRequest(new Request('https://production.example/sitemap.xml', { method: 'POST' }), env(), { fetchImpl: publicJobsFetch([]) });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
}

console.log('PASS: runtime sitemap adds DB-backed published vacancy URLs only to indexable production sitemaps, preserves preview isolation, excludes application routes and fails soft to the static sitemap.');
