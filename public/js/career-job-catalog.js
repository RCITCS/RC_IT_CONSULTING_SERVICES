import { CAREER_JOBS } from './career-jobs.js';
import { ADDITIONAL_DATA_JOBS } from './career-jobs-data-expansion.js';

const ALL_CAREER_JOBS = [...CAREER_JOBS, ...ADDITIONAL_DATA_JOBS];

export function getPublishedJobs() {
  return ALL_CAREER_JOBS.filter((job) => job.status === 'published');
}

export function getPublishedJob(slug = '') {
  return getPublishedJobs().find((job) => job.slug === slug) || null;
}
