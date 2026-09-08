import { createDatabaseProvider } from './database-provider.js';
import { createStorageProvider } from './storage-provider.js';
import { createEmailProvider } from './email-provider.js';

export function createProviderRegistry(overrides = {}) {
  return Object.freeze({
    database: overrides.database || createDatabaseProvider(),
    storage: overrides.storage || createStorageProvider(),
    email: overrides.email || createEmailProvider()
  });
}
