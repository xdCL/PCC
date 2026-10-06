import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(projectRoot, 'public');
const fontRoot = resolve(publicRoot, 'fonts');

const pdfWorker = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
const frauncesRoot = dirname(require.resolve('@fontsource-variable/fraunces/full.css'));
const jakartaRoot = dirname(require.resolve('@fontsource-variable/plus-jakarta-sans/wght.css'));
const plexRoot = dirname(require.resolve('@fontsource/ibm-plex-mono/latin-400.css'));

const assets = [
  {
    source: pdfWorker,
    destination: resolve(publicRoot, 'pdf.worker.min.mjs'),
  },
  {
    source: resolve(frauncesRoot, 'files', 'fraunces-latin-full-normal.woff2'),
    destination: resolve(fontRoot, 'fraunces-latin-full-normal.woff2'),
  },
  {
    source: resolve(jakartaRoot, 'files', 'plus-jakarta-sans-latin-wght-normal.woff2'),
    destination: resolve(fontRoot, 'plus-jakarta-sans-latin-wght-normal.woff2'),
  },
  {
    source: resolve(plexRoot, 'files', 'ibm-plex-mono-latin-400-normal.woff2'),
    destination: resolve(fontRoot, 'ibm-plex-mono-latin-400-normal.woff2'),
  },
  {
    source: resolve(plexRoot, 'files', 'ibm-plex-mono-latin-600-normal.woff2'),
    destination: resolve(fontRoot, 'ibm-plex-mono-latin-600-normal.woff2'),
  },
];

await mkdir(fontRoot, { recursive: true });
await Promise.all(assets.map(({ source, destination }) => copyFile(source, destination)));
console.log('Worker de PDF.js y tipografías locales preparados en public/.');
