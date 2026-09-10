// Phase 11: production vacancy state is server-authoritative in PostgreSQL and is
// loaded by the Cloudflare runtime. Static source catalogs are intentionally no
// longer imported here, so publishing a vacancy never requires a code change or
// redeployment. The static build renders the truthful no-openings baseline; the
// runtime replaces it with current database-backed vacancies.
export function getPublishedJobs() {
  return [];
}

export function getPublishedJob() {
  return null;
}
