function escHtml(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function paragraphs(value = '') {
  return String(value || '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

function enumLabel(value = '') {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function listSection(label, items = []) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!values.length) return '';
  return `<p>${escHtml(label)}</p><ul>${values.map((item) => `<li>${escHtml(item)}</li>`).join('')}</ul>`;
}

function employmentType(value = '') {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('full')) return 'FULL_TIME';
  if (normalized.includes('part')) return 'PART_TIME';
  if (normalized.includes('contract')) return 'CONTRACTOR';
  if (normalized.includes('temporary')) return 'TEMPORARY';
  if (normalized.includes('intern')) return 'INTERN';
  return 'OTHER';
}

function jobDescriptionHtml(job) {
  const parts = [
    job.summary ? `<p>${escHtml(job.summary)}</p>` : '',
    ...paragraphs(job.description).map((paragraph) => `<p>${escHtml(paragraph)}</p>`),
    job.category ? `<p>Department: ${escHtml(job.category)}</p>` : '',
    job.location ? `<p>Location: ${escHtml(job.location)}</p>` : '',
    job.workplaceType ? `<p>Working arrangement: ${escHtml(enumLabel(job.workplaceType))}</p>` : '',
    job.employmentType ? `<p>Employment type: ${escHtml(enumLabel(job.employmentType))}</p>` : '',
    job.experience ? `<p>Experience: ${escHtml(job.experience)}</p>` : '',
    job.applicationResponseWindow ? `<p>Application response window: ${escHtml(job.applicationResponseWindow)}</p>` : '',
    listSection('Technology and skills', job.technologies),
    listSection('Required skills', job.requiredSkills),
    listSection('Preferred skills', job.preferredSkills),
    listSection('Industry context', job.industries),
    listSection('Responsibilities', job.responsibilities),
    listSection('Qualifications', job.qualifications),
    listSection('Preferred qualifications', job.preferredQualifications),
    listSection('Working style', job.workingStyleDetails),
    job.locationDetails ? `<p>Location details: ${escHtml(job.locationDetails)}</p>` : '',
    listSection('Benefits and employment terms', job.benefits)
  ];
  return parts.filter(Boolean).join('');
}

function localityFromLocation(value = '') {
  const locality = String(value || '').split(',')[0].trim();
  return locality || undefined;
}

export function createRuntimeJobPosting(job, siteOrigin, pathName) {
  const canonical = `${String(siteOrigin).replace(/\/+$/, '')}${pathName}`;
  const locality = localityFromLocation(job.location);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    '@id': `${canonical}#job`,
    title: job.title,
    description: jobDescriptionHtml(job),
    datePosted: job.publishedAt,
    employmentType: employmentType(job.employmentType),
    identifier: {
      '@type': 'PropertyValue',
      name: 'RC IT Services',
      value: job.code || job.slug
    },
    hiringOrganization: {
      '@type': 'Organization',
      name: 'RC IT Services',
      sameAs: `${String(siteOrigin).replace(/\/+$/, '')}/`
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(locality ? { addressLocality: locality } : {}),
        addressCountry: 'GB'
      }
    },
    url: canonical,
    directApply: true
  };

  if (job.closesAt) schema.validThrough = job.closesAt;
  if (job.responsibilities?.length) schema.responsibilities = job.responsibilities.join(' ');
  if (job.qualifications?.length) schema.qualifications = job.qualifications.join(' ');
  const skills = [...(job.requiredSkills || []), ...(job.preferredSkills || []), ...(job.technologies || [])];
  if (skills.length) schema.skills = skills.join(', ');
  if (job.experience) schema.experienceRequirements = job.experience;
  if (String(job.workplaceType || '').toLowerCase() === 'remote') {
    schema.jobLocationType = 'TELECOMMUTE';
    schema.applicantLocationRequirements = { '@type': 'Country', name: 'United Kingdom' };
  }
  return schema;
}

export function appendRuntimeJobPosting(html, schema) {
  if (!html.includes('name="robots" content="index,follow"')) return html;
  const json = JSON.stringify(schema).replaceAll('<', '\\u003c');
  return html.replace('</head>', `<script type="application/ld+json" data-runtime-job-posting>${json}</script></head>`);
}
