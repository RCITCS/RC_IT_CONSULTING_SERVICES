import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const required = [
  'src/frontend/app/app.js',
  'src/frontend/app/router.js',
  'src/frontend/styles/app.css',
  'src/frontend/pages/README.md',
  'src/frontend/components/README.md',
  'src/frontend/layouts/README.md',
  'src/frontend/router/README.md',
  'src/frontend/config/README.md',
  'src/frontend/utils/README.md',
  'src/backend/runtime/worker.js',
  'src/backend/admin/README.md',
  'src/backend/api/README.md',
  'src/backend/services/README.md',
  'src/backend/database/README.md',
  'src/backend/security/README.md'
];

for (const relative of required) {
  await access(path.join(root, relative));
}

const publicEntries = await readdir(path.join(root, 'public'));
if (publicEntries.includes('js') || publicEntries.includes('css')) {
  throw new Error('Frontend source must not live under public/js or public/css after the structured-source migration.');
}

console.log(`PASS: structured source foundation verified (${required.length} required paths).`);
