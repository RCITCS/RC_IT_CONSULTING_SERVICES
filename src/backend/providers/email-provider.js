export function createEmailProvider({ configured = false, name = 'unconfigured-email', client = null } = {}) {
  return Object.freeze({ kind: 'email', name, configured: Boolean(configured), client });
}
