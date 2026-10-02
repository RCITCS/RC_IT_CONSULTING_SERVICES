import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['supabase/functions/admin-auth/jobs.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false
});
const { jobEditorPage, jobPreviewPage } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const session = { admin: { email: 'admin@example.test', role: 'super_admin' }, csrf: 'test-csrf', expires_at: '2026-10-02T00:00:00Z' };
const context = { categories: [{ name: 'Data Engineering', is_active: true }] };
const html = await jobEditorPage('', session, context).text();
const editor = html.match(/<form class="job-editor-form"[\s\S]*?<\/form>/)?.[0];

assert.equal((html.match(/<form class="job-editor-form"/g) || []).length, 1);
assert.ok(editor, 'Job editor form should render.');
assert.doesNotMatch(editor, /<details\b|Advanced optional details/);
for (const name of [
  'title', 'category', 'workplace_type', 'location', 'employment_type', 'experience',
  'application_response_window', 'required_skills', 'description', 'benefits',
  'summary', 'technologies', 'preferred_skills', 'responsibilities',
  'qualifications', 'preferred_qualifications', 'industries',
  'working_style_details', 'location_details', 'opens_at', 'closes_at'
]) {
  assert.equal((editor.match(new RegExp(`name="${name}"`, 'g')) || []).length, 1, `${name} should appear once in the editor`);
}
assert.match(html, /<label for="job-title">Job title \*<\/label>/);
assert.match(html, /<label for="job-required-skills">Required skills \*<\/label>/);
assert.match(html, /\.job-editor-form \.field label\{color:var\(--ink\);font-weight:800\}/);
assert.match(html, /\.job-editor-form #job-title\{font-weight:700\}/);
assert.match(html, /name="intent" value="draft"/);
assert.match(html, /name="intent" value="publish"/);

const preview = await jobPreviewPage('', session, {
  id: 'test-job', title: 'Data Analyst', status: 'published',
  description: 'Role introduction.\n\nCandidate requirements\n\nRelevant experience.\n\nSalary\n\nSalary details.'
}).text();
assert.match(preview, /<h4[^>]*>Candidate requirements<\/h4>/);
assert.match(preview, /<h4[^>]*>Salary<\/h4>/);
assert.match(preview, /<p[^>]*>Relevant experience\.<\/p>/);

console.log('PASS: job creation has one visible editor, one copy of every field, bold labels and unchanged draft/publish actions.');
