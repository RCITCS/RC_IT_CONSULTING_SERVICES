import { createPersistenceConfig } from '../config/persistence.js';
import { createSupabaseHttpClient } from '../providers/supabase-http.js';
import { providerUnavailable } from '../core/errors.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedJob(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return Object.freeze({
    id: String(value.id || ''),
    code: value.code == null ? '' : String(value.code),
    slug: String(value.slug || ''),
    title: String(value.title || ''),
    category: value.category == null ? '' : String(value.category),
    summary: value.summary == null ? '' : String(value.summary),
    description: value.description == null ? '' : String(value.description),
    location: value.location == null ? '' : String(value.location),
    workplaceType: value.workplace_type == null ? '' : String(value.workplace_type),
    employmentType: value.employment_type == null ? '' : String(value.employment_type),
    experience: value.experience == null ? '' : String(value.experience),
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

export function createPublicJobsRepository({ env = {}, fetchImpl = globalThis.fetch } = {}) {
  const persistence = createPersistenceConfig(env);
  if (!persistence.configured) {
    return Object.freeze({
      configured: false,
      async listPublishedJobs() {
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
    async listPublishedJobs() {
      const payload = await client.request('/rest/v1/rpc/get_public_jobs', {
        method: 'POST',
        json: {}
      });
      return Object.freeze(asArray(payload).map(normalizedJob).filter(Boolean));
    }
  });
}
