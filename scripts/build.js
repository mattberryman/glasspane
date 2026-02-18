import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const html = readFileSync(resolve(root, 'teleprompter.html'), 'utf8');
const purify = readFileSync(
  resolve(root, 'node_modules/dompurify/dist/purify.min.js'),
  'utf8'
);

// Remove the development DOMPurify script tag and inline the library
const DEVTAG = /<!-- Build step.*?-->\s*<script src="node_modules\/dompurify.*?"><\/script>/s;
const inlined = html.replace(DEVTAG, `<script>${purify}</script>`);

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/teleprompter.html'), inlined, 'utf8');

const bytes = Buffer.byteLength(inlined, 'utf8');
console.log(`Built: dist/teleprompter.html (${bytes} bytes)`);
