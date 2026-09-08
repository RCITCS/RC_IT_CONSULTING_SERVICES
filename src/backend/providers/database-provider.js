import { providerUnavailable } from '../core/errors.js';
import { createSupabaseHttpClient } from './supabase-http.js';

export const DATABASE_TABLES = Object.freeze([
  'admins',
  'sessions',
  'password_reset_tokens',
  'job_categories',
  'jobs',
  'applications',
  'application_documents',
  'application_history',
  'contact_enquiries',
  'candidate_messages',
  'notifications',
  'email_logs',
  'audit_logs'
]);

const tableSet = new Set(DATABASE_TABLES);

function assertTable(table) {
  if (!tableSet.has(table)) throw new TypeError(`Unsupported database table: ${table}`);
}

export function createDatabaseProvider() {
  return Object.freeze({
    kind: 'database',
    name: 'unconfigured-database',
    configured: false,
    async insertRow() {
      throw providerUnavailable('database', 'Database persistence is not configured.');
    }
  });
}

export function createSupabaseDatabaseProvider({ url, secretKey, fetchImpl } = {}) {
  if (!url || !secretKey) return createDatabaseProvider();
  const client = createSupabaseHttpClient({ url, secretKey, fetchImpl });
  return Object.freeze({
    kind: 'database',
    name: 'supabase-postgres',
    configured: true,
    async insertRow(table, record) {
      assertTable(table);
      const result = await client.request(`/rest/v1/${table}?select=id`, {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        json: record
      });
      if (!Array.isArray(result) || result.length !== 1 || !result[0]?.id) {
        throw new Error(`Database insert for ${table} did not return one persisted id.`);
      }
      return Object.freeze({ id: result[0].id });
    }
  });
}
