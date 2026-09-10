import { createPersistenceConfig } from '../config/persistence.js';
import { createSupabaseHttpClient } from '../providers/supabase-http.js';
import { providerUnavailable } from '../core/errors.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
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
    responsibilities: asArray(value.responsibilities).map(String),
    qualifications: asArray(value.qualifications).map(String),
    benefits: asArray(value.benefits).map(String),
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

export function createPublicJobsRepository({ env = {}, fetchImpl = globalThis.fetch } = {}) {
  const persistence = createPersistenceConfig(env);
  if (!persistence.configured) {
    return Object.freeze({
      configured: false,
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
    async getCareersContext(slug = '') {
      const payload = await client.request('/rest/v1/rpc/get_public_careers_context', {
        method: 'POST',
        json: { p_slug: String(slug || '').trim() || null }
      });
      return normalizeContext(payload);
    }
  });
}
