import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

const [ui, routes, migration, convergence, publicHardening, interactions] = await Promise.all([
  read('supabase/functions/admin-auth/jobs.ts'),
  read('supabase/functions/admin-auth/job-routes.ts'),
  read('supabase/migrations/20260913023000_phase_12_job_authoring_simplification.sql'),
  read('supabase/migrations/20260910165000_phase_11_cms_spec_convergence.sql'),
  read('supabase/migrations/20260910161000_phase_11_job_management_hardening.sql'),
  read('worker/admin-interactions.js')
]);

const requested = [
  'Software Development', 'Data Engineering', 'Full Stack Development', 'DevOps',
  'Network Engineering', 'Frontend Engineering', 'Backend Engineering', 'Generative AI (Gen AI)'
];
for (const category of requested) {
  assert.ok(ui.includes(category), `Admin controlled category missing: ${category}`);
  assert.ok(migration.includes(category), `Forward-only category migration missing: ${category}`);
}

assert.ok(ui.includes('<select id="job-category" name="category" required>'), 'Category must be a controlled dropdown.');
assert.ok(ui.includes('new Map<string, string>()'), 'Category dropdown must deduplicate legacy names.');
assert.ok(ui.includes('const categoryValue = submitted ? String((submitted as any)?.category || "") : value(source,"category_name");'), 'Validation rerenders must preserve the category the administrator actually submitted.');
assert.equal(ui.includes('id="job-slug"'), false, 'URL slug must not be visible/editable in admin UI.');
assert.equal(ui.includes('for="job-slug"'), false, 'URL slug label must not exist in admin UI.');
assert.equal(ui.includes('URL slug'), false, 'Admin copy must not expose URL-slug implementation details.');
assert.equal(ui.includes(' · /${esc(job.slug'), false, 'Jobs register must not display the internal URL slug.');
assert.ok(ui.includes('generatedSlug(title)'), 'New vacancy URL slug must still be generated internally.');
assert.ok(ui.includes('normalized.slice(0,140).replace(/-+$/g,"")'), 'Generated slugs must trim a separator introduced at the truncation boundary before appending the suffix.');
assert.ok(ui.includes('type="hidden" name="slug"'), 'Existing canonical URL must be preserved internally on edit without exposing it to the administrator.');
assert.equal(ui.includes('name="code"'), false, 'Job code must never be client-editable.');
assert.ok(ui.includes('Based on category and work mode · immutable'), 'Admin must be told the job code is automatic and immutable.');

assert.ok(ui.includes('data-rc-job-editor-polish'), 'Job editor must ship its professional control treatment with the server-rendered form.');
assert.ok(ui.includes('.job-editor-form #job-required-skills{min-height:320px!important}'), 'Required-skills editor must provide a large desktop writing area.');
assert.ok(ui.includes('.job-editor-form #job-description{min-height:520px!important}'), 'Job-description editor must provide a large desktop writing area.');
assert.ok(ui.includes('.job-editor-form #job-benefits{min-height:260px!important}'), 'Benefits editor must not collapse to a browser-default textarea.');
assert.ok(ui.includes('.job-editor-form #job-required-skills{min-height:300px!important}'), 'Required-skills editor must remain large on phone layouts.');
assert.ok(ui.includes('.job-editor-form #job-description{min-height:480px!important}'), 'Job-description editor must remain large on phone layouts.');
assert.ok(ui.includes('width:100%!important;max-width:none!important'), 'Long-form editors must remain full width even when surrounding admin CSS changes.');
assert.ok(ui.includes('box-sizing:border-box'), 'Full-width authoring controls must not overflow their container because of padding/borders.');
assert.ok(ui.includes('resize:vertical'), 'Long-form fields must remain user-resizable.');
assert.ok(ui.includes('-webkit-appearance:none;appearance:none'), 'Job-editor selects must avoid inconsistent iOS pill styling.');
assert.ok(ui.includes('id === "job-description" ? 20'), 'Job description must retain a large semantic rows fallback when CSS is unavailable.');
assert.ok(ui.includes('id === "job-required-skills" ? 12'), 'Required skills must retain a large semantic rows fallback when CSS is unavailable.');
assert.ok(ui.includes('const minHeight = id === "job-description" ? 520 : id === "job-required-skills" ? 320 : id === "job-benefits" ? 260 : 180;'), 'Long-form fields must have inline minimum-height fallbacks independent of stylesheet injection.');
assert.ok(ui.includes('style="display:block;width:100%;max-width:none;box-sizing:border-box;min-height:${minHeight}px;resize:vertical"'), 'Textarea markup must carry a full-width inline fallback that survives modal extraction and validation rerenders.');
assert.ok(ui.includes('class="field${longform ? " longform-field" : ""}"'), 'Primary authoring fields must receive the long-form presentation class.');
assert.ok(ui.includes('wrap="soft" spellcheck="true"'), 'Long-form authoring should wrap naturally and keep browser spellcheck available.');
assert.ok(ui.includes('<form class="job-editor-form" method="post"'), 'Professional form styles must be scoped to the job editor form itself.');
assert.ok(ui.includes('<main class="workspace" id="main-content" aria-labelledby="job-editor-title">${JOB_EDITOR_POLISH}<div class="page-heading">'), 'Job-editor style payload must live inside the workspace so modal extraction preserves it.');
assert.ok(interactions.includes("body.innerHTML = workspace ? workspace.innerHTML : source.innerHTML;"), 'Regression gate must reflect the modal workspace extraction contract.');

assert.ok(ui.includes('name="confirm_code"'), 'Draft deletion confirmation must use visible job code, not internal URL slug.');
assert.equal(ui.includes('confirm_slug'), false, 'Internal URL slug must not be used as an administrator confirmation value.');
assert.ok(routes.includes('form.get("confirm_code")'), 'Delete route must validate the job code confirmation.');
assert.equal(routes.includes('form.get("confirm_slug")'), false, 'Delete route must not ask for internal URL slug.');

assert.ok(ui.includes('Save draft') && ui.includes('name="intent" value="publish"'), 'New vacancy form must provide direct Save draft and Publish actions.');
assert.ok(routes.includes('transitionJob(adminId,createdId,createdVersion,"publish"'), 'Create + Publish must remain one server-authoritative request flow.');
assert.ok(ui.includes('Start date') && ui.includes('End date') && ui.includes('Publish indefinitely / no end date'));
assert.ok(routes.includes('nextDate(closes)'), 'Selected end date must remain inclusive for the administrator while stored as an exclusive next-day boundary.');

assert.ok(migration.includes("where slug = 'data-and-analytics'"));
assert.ok(migration.includes("where slug = 'data-analytics'"));
assert.ok(migration.includes('update public.jobs set category_id = v_canonical where category_id = v_duplicate'));
assert.ok(migration.includes('delete from public.job_categories where id = v_duplicate'));

const saveFunction = migration.split('create or replace function public.admin_save_job')[1]?.split('create or replace function public.admin_transition_job')[0] || '';
assert.ok(saveFunction.includes('from public.job_categories c'));
assert.ok(saveFunction.includes('c.is_active = true'));
assert.ok(saveFunction.includes('lower(c.name) = lower(v_category_name)'));
assert.ok(saveFunction.includes('Select a valid active job category.'));
assert.equal(saveFunction.includes('insert into public.job_categories'), false, 'Saving a vacancy must not create arbitrary categories from free text.');
assert.ok(saveFunction.includes('category_id = v_category_id'));

assert.ok(convergence.includes('jobs_assign_job_code'));
assert.ok(convergence.includes('rcitcs_assign_job_code'));
assert.ok(convergence.includes('jobs_preserve_job_code'));
assert.ok(!/p_payload\s*->>\s*'code'/.test(convergence), 'Job code must remain database-generated rather than payload-controlled.');

assert.ok(publicHardening.includes('left join public.job_categories c on c.id = j.category_id'), 'Public Careers must group from the authoritative job category relation.');
assert.ok(publicHardening.includes("'category', e.category"), 'Public Careers projection must expose the selected category.');
assert.ok(publicHardening.includes("j.opens_at is null or j.opens_at <= now()"));
assert.ok(publicHardening.includes("j.closes_at is null or j.closes_at > now()"));

console.log('PASS: Phase 12 final job authoring uses controlled unique categories, server-generated immutable job codes, internal-only URL slugs, direct draft/publish, inclusive availability dates, validation-state preservation, modal-safe full-width professional long-form authoring controls and authoritative public category grouping.');
