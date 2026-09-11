import { createPublicJobsRepository } from '../repositories/public-jobs-repository.js';

function sitemapHeaders(sourceHeaders) {
  const headers = new Headers(sourceHeaders);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('content-type', 'application/xml; charset=utf-8');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('x-content-type-options', 'nosniff');
  return headers;
}

function staticSitemapOrigin(xml) {
  const match = String(xml || '').match(/<loc>(https:\/\/[^/<]+)(?:\/|<)/i);
  return match?.[1] || '';
}

function hasIndexableStaticEntries(xml) {
  return /<url>\s*<loc>/i.test(String(xml || ''));
}

function appendJobUrls(xml, origin, jobs = []) {
  if (!origin || !hasIndexableStaticEntries(xml)) return xml;
  const urls = jobs
    .map((job) => String(job?.slug || '').trim())
    .filter((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    .map((slug) => `${origin}/careers/jobs/${slug}`)
    .filter((url) => !xml.includes(`<loc>${url}</loc>`));
  if (!urls.length) return xml;
  const entries = urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n');
  return xml.replace(/\s*<\/urlset>\s*$/i, `\n${entries}\n</urlset>\n`);
}

export async function handlePublicSitemapRequest(request, env, { fetchImpl = globalThis.fetch } = {}) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' }
    });
  }

  const assetUrl = new URL('/sitemap.xml', request.url);
  const assetRequest = new Request(assetUrl.toString(), { method: 'GET', headers: { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.1' } });
  const assetResponse = await env.ASSETS.fetch(assetRequest);
  if (!assetResponse.ok) return assetResponse;

  const baseXml = await assetResponse.text();
  const headers = sitemapHeaders(assetResponse.headers);

  // A non-main Cloudflare build deliberately produces a zero-entry static
  // sitemap. Preserve that sentinel exactly so runtime DB data can never make a
  // preview deployment searchable.
  if (!hasIndexableStaticEntries(baseXml)) {
    return new Response(request.method === 'HEAD' ? null : baseXml, { status: 200, headers });
  }

  let xml = baseXml;
  try {
    const repository = createPublicJobsRepository({ env, fetchImpl });
    const context = await repository.getCareersContext('');
    xml = appendJobUrls(baseXml, staticSitemapOrigin(baseXml), context.jobs);
  } catch {
    // Keep the static sitemap available when the public careers projection is
    // temporarily unavailable. Job URLs remain discoverable from /careers and
    // will return to the sitemap automatically after the dependency recovers.
  }

  return new Response(request.method === 'HEAD' ? null : xml, { status: 200, headers });
}
