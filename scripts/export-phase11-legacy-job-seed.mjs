import { writeFile } from 'node:fs/promises';
import { CAREER_JOBS } from '../src/frontend/app/career-jobs.js';
import { ADDITIONAL_DATA_JOBS } from '../src/frontend/app/career-jobs-data-expansion.js';
import { SERVICE_AND_INDUSTRY_JOBS } from '../src/frontend/app/career-jobs-services-expansion.js';

const jobs = [...CAREER_JOBS, ...ADDITIONAL_DATA_JOBS, ...SERVICE_AND_INDUSTRY_JOBS];
const allowedStatuses = new Set(['draft', 'published', 'closed', 'archived']);

function sqlText(value) {
  if (value == null || String(value).trim() === '') return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonb(value) {
  const normalized = Array.isArray(value) ? value : [];
  return `${sqlText(JSON.stringify(normalized))}::jsonb`;
}

function categoryName(job) {
  return String(job.department || job.category || 'Technology').trim();
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function workplace(value) {
  const source = String(value || '').trim().toLowerCase();
  if (!source) return null;
  if (source.includes('hybrid')) return 'hybrid';
  if (source.includes('remote')) return 'remote';
  if (source.includes('flexible')) return 'flexible';
  if (source.includes('on-site') || source.includes('onsite') || source.includes('office') || source.includes('client-site')) return 'onsite';
  throw new Error(`Unsupported workStyle: ${value}`);
}

function employment(value) {
  const source = String(value || '').trim().toLowerCase().replace(/[–—]/g, '-');
  if (!source) return null;
  if (source.includes('full-time') || source.includes('full time')) return 'full_time';
  if (source.includes('part-time') || source.includes('part time')) return 'part_time';
  if (source.includes('contract')) return 'contract';
  if (source.includes('temporary')) return 'temporary';
  if (source.includes('intern')) return 'internship';
  if (source === 'other') return 'other';
  throw new Error(`Unsupported employmentType: ${value}`);
}

function dateTimestamp(value, endOfDay = false) {
  const source = String(value || '').trim();
  if (!source) return 'null';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) throw new Error(`Unsupported source date: ${value}`);
  return sqlText(`${source}T${endOfDay ? '23:59:59' : '00:00:00'}Z`);
}

function description(value) {
  if (Array.isArray(value)) return value.map((part) => String(part).trim()).filter(Boolean).join('\n\n');
  return String(value || '').trim();
}

function validateJob(job, index) {
  const label = `${index + 1}:${job?.slug || job?.title || 'unknown'}`;
  if (!job || typeof job !== 'object') throw new Error(`Invalid job object at ${label}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(job.slug || ''))) throw new Error(`Invalid slug at ${label}`);
  if (!String(job.title || '').trim()) throw new Error(`Missing title at ${label}`);
  if (!allowedStatuses.has(String(job.status || ''))) throw new Error(`Unsupported status at ${label}: ${job.status}`);
  const code = String(job.jobCode || '').trim();
  if (code && !/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(code)) throw new Error(`Invalid jobCode at ${label}: ${code}`);
  workplace(job.workStyle);
  employment(job.employmentType);
  dateTimestamp(job.postedDate);
  dateTimestamp(job.closingDate, true);
}

jobs.forEach(validateJob);
const duplicate = (values) => values.find((value, index) => value && values.indexOf(value) !== index);
const duplicateSlug = duplicate(jobs.map((job) => job.slug));
const duplicateCode = duplicate(jobs.map((job) => job.jobCode).filter(Boolean));
if (duplicateSlug) throw new Error(`Duplicate source job slug: ${duplicateSlug}`);
if (duplicateCode) throw new Error(`Duplicate source job code: ${duplicateCode}`);

const categories = [...new Map(jobs.map((job) => {
  const name = categoryName(job);
  const slug = slugify(name);
  if (!slug) throw new Error(`Invalid source category: ${name}`);
  return [slug, { slug, name }];
})).values()].sort((a, b) => a.slug.localeCompare(b.slug));

const statements = [];
statements.push(`-- Generated from the approved pre-Phase-11 Careers catalog.\n-- Do not hand-edit this file; regenerate with scripts/export-phase11-legacy-job-seed.mjs.\n\ndo $$\ndeclare\n  v_admin_id uuid;\nbegin\n  select id into v_admin_id\n  from public.admins\n  where status = 'active' and role = 'super_admin'\n  order by created_at, id\n  limit 1;\n\n  if v_admin_id is null then\n    raise exception 'Phase 11 legacy job migration requires one active super_admin';\n  end if;`);

categories.forEach((category, index) => {
  statements.push(`\n  insert into public.job_categories (slug, name, description, display_order, is_active, updated_at)\n  values (${sqlText(category.slug)}, ${sqlText(category.name)}, null, ${index * 10}, true, now())\n  on conflict (slug) do nothing;`);
});

jobs.forEach((job) => {
  const status = String(job.status);
  const posted = dateTimestamp(job.postedDate);
  const publishedAt = status === 'draft' ? 'null' : posted;
  const opensAt = status === 'draft' ? 'null' : posted;
  const archivedAt = status === 'archived' ? posted : 'null';
  const category = slugify(categoryName(job));
  const workplaceType = workplace(job.workStyle);
  const employmentType = employment(job.employmentType);
  const closeAt = dateTimestamp(job.closingDate, true);
  statements.push(`\n  insert into public.jobs (\n    category_id, code, slug, title, summary, description, location, workplace_type,\n    employment_type, experience, technologies, industries, responsibilities, qualifications,\n    preferred_qualifications, benefits, working_style_details, location_details, status,\n    opens_at, published_at, closes_at, archived_at, created_by, updated_by, version, created_at, updated_at\n  )\n  select\n    c.id, ${sqlText(job.jobCode)}, ${sqlText(job.slug)}, ${sqlText(job.title)}, ${sqlText(job.summary)}, ${sqlText(description(job.description))},\n    ${sqlText(job.location)}, ${sqlText(workplaceType)}, ${sqlText(employmentType)}, ${sqlText(job.experience)},\n    ${jsonb(job.technologies)}, ${jsonb(job.industries)}, ${jsonb(job.responsibilities)}, ${jsonb(job.qualifications)},\n    ${jsonb(job.preferredQualifications)}, ${jsonb(job.benefits)}, ${jsonb(job.workingStyle)}, ${sqlText(job.locationDetails)},\n    ${sqlText(status)}, ${opensAt}, ${publishedAt}, ${closeAt}, ${archivedAt}, v_admin_id, v_admin_id, 1,\n    coalesce(${posted}::timestamptz, now()), now()\n  from public.job_categories c\n  where c.slug = ${sqlText(category)}\n  on conflict (slug) do nothing;`);
});

statements.push(`\n\n  insert into public.audit_logs (admin_id, action, entity_type, entity_id, after_data, metadata)\n  select v_admin_id, 'job_catalog_migrated', 'job', j.id, to_jsonb(j),\n         jsonb_build_object('source', 'phase_11_legacy_catalog_migration')\n  from public.jobs j\n  where j.slug = any (array[${jobs.map((job) => sqlText(job.slug)).join(', ')}]::text[])\n    and not exists (\n      select 1 from public.audit_logs a\n      where a.entity_type = 'job' and a.entity_id = j.id and a.action = 'job_catalog_migrated'\n    );\nend $$;\n`);

const sql = statements.join('\n');
const manifest = {
  generatedAt: new Date().toISOString(),
  sourceFiles: [
    'src/frontend/app/career-jobs.js',
    'src/frontend/app/career-jobs-data-expansion.js',
    'src/frontend/app/career-jobs-services-expansion.js'
  ],
  totalJobs: jobs.length,
  statuses: Object.fromEntries([...allowedStatuses].map((status) => [status, jobs.filter((job) => job.status === status).length])),
  categories: categories.length,
  firstSlug: jobs[0]?.slug || null,
  lastSlug: jobs.at(-1)?.slug || null
};

await writeFile(process.argv[2] || 'phase11-legacy-job-seed.sql', sql, 'utf8');
await writeFile(process.argv[3] || 'phase11-legacy-job-seed-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest));
