import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const frontendRoot = path.join(root, 'src', 'frontend');
const out = path.join(root, 'dist');
const assets = path.join(out, 'assets');
const jsEntry = path.join(frontendRoot, 'app', 'app.js');
const cssEntry = path.join(frontendRoot, 'styles', 'app.css');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(publicRoot, out, { recursive: true });
await mkdir(assets, { recursive: true });

const jsBuild = await build({
  entryPoints: [jsEntry],
  bundle: true,
  minify: true,
  treeShaking: true,
  splitting: true,
  format: 'esm',
  target: ['es2020'],
  outdir: assets,
  entryNames: 'app-[hash]',
  chunkNames: 'chunk-[hash]',
  metafile: true,
  legalComments: 'none'
});

const cssBuild = await build({
  entryPoints: [cssEntry],
  bundle: true,
  minify: true,
  target: ['es2020'],
  outdir: assets,
  entryNames: 'app-[hash]',
  metafile: true,
  legalComments: 'none'
});

function outputFile(meta, extension) {
  const output = Object.keys(meta.outputs).find((file) => file.endsWith(extension));
  if (!output) throw new Error(`Missing ${extension} build output.`);
  return path.basename(output);
}

const jsFile = outputFile(jsBuild.metafile, '.js');
const cssFile = outputFile(cssBuild.metafile, '.css');

const htmlPath = path.join(out, 'index.html');
let html = await readFile(htmlPath, 'utf8');
html = html
  .replace(/\s*<link rel="stylesheet" href="\/(?:css\/[^\"]+|vendor\/bootstrap-grid\.css)" \/>/g, '')
  .replace('</head>', `  <link rel="stylesheet" href="/assets/${cssFile}" />\n</head>`)
  .replace('<script type="module" src="/js/app.js"></script>', `<script type="module" src="/assets/${jsFile}"></script>`);
await writeFile(htmlPath, html);

console.log(`Built optimized static site from src/frontend: ${cssFile}, ${jsFile}`);
