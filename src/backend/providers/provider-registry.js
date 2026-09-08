import { createPersistenceConfig } from '../config/persistence.js';
import { createSupabaseDatabaseProvider } from './database-provider.js';
import { createSupabaseStorageProvider } from './storage-provider.js';
import { createEmailProvider } from './email-provider.js';

export function createProviderRegistry(overrides = {}, { env = {}, fetchImpl = globalThis.fetch } = {}) {
  const persistence = createPersistenceConfig(env);
  return Object.freeze({
    database: overrides.database || createSupabaseDatabaseProvider({ url: persistence.url, secretKey: persistence.secretKey, fetchImpl }),
    storage: overrides.storage || createSupabaseStorageProvider({ url: persistence.url, secretKey: persistence.secretKey, bucket: persistence.storageBucket, fetchImpl }),
    email: overrides.email || createEmailProvider()
  });
}
