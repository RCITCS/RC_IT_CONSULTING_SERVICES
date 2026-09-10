import { createPersistenceConfig } from '../config/persistence.js';
import { createSupabaseHttpClient } from '../providers/supabase-http.js';
import { providerUnavailable } from '../core/errors.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function publicCareersApiUrl(env = {}) {
  const value = String(env.PUBLIC_CAREERS_API_URL ?? '').trim().replace(/\/+$/, '');
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString().replace(/\/$/, '') : '';
  } catch {
    return '';
  }
}

function normalizedListJob(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return Object.freeze({
    id: String(value.id || ''),
    code: value.code == null ? '' : String(value.code),
    slug: String(value.slug || ''),
    title: String(value.title || ''),
    category: value.category == null ? '' : String(value.category),
    location: value.location == null ? '' : String(value.location),
    workplaceType: value.workplace_type == null ? '' : String(value.workplace_type),
    employmentType: value.employment_type == null ? '' : String(value.employment_type),
    experience: value.experience == null ? '' : String(value.experience)
  });
}

function normalizedSelectedJob(value) {
  const base = normalizedListJob(value);
  if (!base) return null;
  return Object.freeze({
    ...base,
    summary: value.summary == null ? '' : String(value.summary),
    description: value.description == null ? '' : String(value.description),
    technologies: asArray(value.technologies).map(String),
    requiredSkills: asArray(value.required_skills).map(String),
    preferredSkills: asArray(value.preferred_skills).map(String),
    industries: asArray(value.industries).map(String),
    responsibilities: asArray(value.responsibilities).map(String),
    qualifications: asArray(value.qualifications).map(String),
    preferredQualifications: asArray(value.preferred_qualifications).map(String),
    benefits: asArray(value.benefits).map(String),
    workingStyleDetails: asArray(value.working_style_details).map(String),
    locationDetails: value.location_details == null ? '' : String(value.location_details),
    applicationResponseWindow: value.application_response_window == null ? '' : String(value.application_response_window),
    opensAt: value.opens_at || null,
    publishedAt: value.published_at || null,
    closesAt: value.closes_at || null,
    updatedAt: value.updated_at || null
  });
}

function normalizeContext(payload) {
  const value = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  return Object.freeze({
    jobs: Object.freeze(asArray(value.jobs).map(normalizedListJob).filter(Boolean)),
    selected: normalizedSelectedJob(value.selected)
  });
}

function createPublicBoundaryRepository({ apiUrl, fetchImpl }) {
  return Object.freeze({
    configured: true,
    source: 'public-careers-edge',
    async getCareersContext(slug = '') {
      let response;
      try {
        response = await fetchImpl(apiUrl, {
          method: 'POST',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ slug: String(slug || '').trim() || null })
        });
      } catch {
        throw providerUnavailable('database', 'Published job data is temporarily unavailable.');
      }
      if (!response.ok) throw providerUnavailable('database', 'Published job data is temporarily unavailable.');
      try {
        return normalizeContext(await response.json());
      } catch {
        throw providerUnavailable('database', 'Published job data is temporarily unavailable.');
      }
    }
  });
}

export function createPublicJobsRepository({ env = {}, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');

  const apiUrl = publicCareersApiUrl(env);
  if (apiUrl) return createPublicBoundaryRepository({ apiUrl, fetchImpl });

  // Local/server compatibility fallback. Production Cloudflare uses the narrow
  // public Edge Function and therefore does not need a database secret binding.
  const persistence = createPersistenceConfig(env);
  if (!persistence.configured) {
    return Object.freeze({
      configured: false,
      source: 'unconfigured',
      async getCareersContext() {
        throw providerUnavailable('database', 'Published job data is temporarily unavailable.');
      }
    });
  }

  const client = createSupabaseHttpClient({
    url: persistence.url,
    secretKey: persistence.secretKey,
    fetchImpl
  });

  return Object.freeze({
    configured: true,
    source: 'direct-supabase-server',
    async getCareersContext(slug = '') {
      const payload = await client.request('/rest/v1/rpc/get_public_careers_context', {
        method: 'POST',
        json: { p_slug: String(slug || '').trim() || null }
      });
      return normalizeContext(payload);
    }
  });
}
