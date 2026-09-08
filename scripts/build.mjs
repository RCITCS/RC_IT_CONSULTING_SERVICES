import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public');
const out = path.join(root, 'dist');
const assets = path.join(out, 'assets');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(source, out, { recursive: true });
await mkdir(assets, { recursive: true });

await build({
  entryPoints: [path.join(source, 'js', 'app.js')],
  bundle: true,
  minify: true,
  treeShaking: true,
  format: 'esm',
  target: ['es2020'],
  outfile: path.join(assets, 'app.min.js'),
  legalComments: 'none'
});

await build({
  entryPoints: [path.join(source, 'css', 'app.css')],
  bundle: true,
  minify: true,
  target: ['es2020'],
  outfile: path.join(assets, 'app.min.css'),
  legalComments: 'none'
});

const htmlPath = path.join(out, 'index.html');
let html = await readFile(htmlPath, 'utf8');
html = html
  .replace(/\s*<link rel="stylesheet" href="\/css\/(?:tokens|base|components|service-detail|legal|responsive|audit-fixes)\.css" \/>/g, '')
  .replace('</head>', '  <link rel="stylesheet" href="/assets/app.min.css" />\n</head>')
  .replace('<script type="module" src="/js/app.js"></script>', '<script type="module" src="/assets/app.min.js"></script>');
await writeFile(htmlPath, html);

await rm(path.join(out, 'js'), { recursive: true, force: true });
await rm(path.join(out, 'css'), { recursive: true, force: true });

console.log('Built optimized static site with bundled CSS and JavaScript.');
