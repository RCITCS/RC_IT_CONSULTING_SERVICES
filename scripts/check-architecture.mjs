import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const required = [
  'src/frontend/app/app.js',
  'src/frontend/router/router.js',
  'src/frontend/styles/app.css',
  'src/frontend/pages/home.page.js',
  'src/frontend/pages/about.page.js',
  'src/frontend/pages/contact.page.js',
  'src/frontend/pages/products.page.js',
  'src/frontend/pages/white-papers.page.js',
  'src/frontend/pages/careers.page.js',
  'src/frontend/pages/services/service.page.js',
  'src/frontend/pages/services/it/consultancy-services.page.js',
  'src/frontend/pages/services/it/cyber-security.page.js',
  'src/frontend/pages/services/it/artificial-intelligence.page.js',
  'src/frontend/pages/services/it/cloud-computing.page.js',
  'src/frontend/pages/services/it/big-data.page.js',
  'src/frontend/pages/services/it/it-support-services.page.js',
  'src/frontend/pages/services/management/risk.page.js',
  'src/frontend/pages/services/management/strategy-and-implementation.page.js',
  'src/frontend/pages/services/management/sustainability.page.js',
  'src/frontend/pages/services/education/consultancy.page.js',
  'src/frontend/pages/industries/industry.page.js',
  'src/frontend/pages/industries/automotive.page.js',
  'src/frontend/pages/industries/banking-and-finance.page.js',
  'src/frontend/pages/industries/media-and-communication.page.js',
  'src/frontend/pages/industries/education.page.js',
  'src/frontend/pages/support/faqs.page.js',
  'src/frontend/pages/support/blog.page.js',
  'src/frontend/pages/support/login.page.js',
  'src/frontend/pages/support/legal.page.js',
  'src/frontend/pages/support/not-found.page.js',
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

const forbidden = [
  'src/frontend/app/router.js',
  'src/frontend/app/render-home.js',
  'src/frontend/app/render-contact.js',
  'src/frontend/app/render-careers.js',
  'src/frontend/app/render-main.js',
  'src/frontend/app/render-support.js'
];

for (const relative of forbidden) {
  try {
    await access(path.join(root, relative));
    throw new Error(`Legacy renderer still owns page output: ${relative}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

const publicEntries = await readdir(path.join(root, 'public'));
if (publicEntries.includes('js') || publicEntries.includes('css')) {
  throw new Error('Frontend source must not live under public/js or public/css after the structured-source migration.');
}

console.log(`PASS: structured page architecture verified (${required.length} required paths; legacy renderers removed).`);
