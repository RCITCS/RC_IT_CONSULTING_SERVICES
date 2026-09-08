export function createStorageProvider({ configured = false, name = 'unconfigured-storage', client = null } = {}) {
  return Object.freeze({ kind: 'storage', name, configured: Boolean(configured), client });
}
