// Careers jobs are intentionally data-driven so a vacancy is published only when RC has a real, approved opening.
// Do not add placeholder jobs to make the careers page look populated.
//
// Job schema for future published roles:
// {
//   slug: 'senior-data-engineer',
//   jobCode: 'RC-ENG-001',
//   title: 'Senior Data Engineer',
//   department: 'Data & Analytics',
//   status: 'published',
//   summary: 'Short role proposition.',
//   location: 'London, UK',
//   workStyle: 'Hybrid',
//   employmentType: 'Full-time',
//   experience: '5+ years',
//   postedDate: '2026-09-08',
//   closingDate: '',
//   description: ['Paragraph one', 'Paragraph two'],
//   responsibilities: ['Responsibility one'],
//   qualifications: ['Required qualification one'],
//   preferredQualifications: ['Preferred qualification one'],
//   benefits: ['Only include benefits that RC has actually approved for this role.'],
//   workingStyle: ['Explain office/client/remote expectations and collaboration model.'],
//   locationDetails: 'Explain the actual work location and any travel expectations.'
// }

export const CAREER_JOBS = [];

export function getPublishedJobs() {
  return CAREER_JOBS.filter((job) => job.status === 'published');
}

export function getPublishedJob(slug = '') {
  return getPublishedJobs().find((job) => job.slug === slug) || null;
}
