export function createDatabaseProvider({ configured = false, name = 'unconfigured-database', client = null } = {}) {
  return Object.freeze({ kind: 'database', name, configured: Boolean(configured), client });
}
