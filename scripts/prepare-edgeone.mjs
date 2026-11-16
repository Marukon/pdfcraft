import { copyFileSync, linkSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const MAX_FILE_BYTES = 25_000_000;
const MAX_FILES = 20_000;
const PART_BYTES = 20_000_000;
const engines = ['soffice.wasm.bin', 'soffice.data.bin'];

function makeCompressedParts(from, to, filename) {
  const compressed = readFileSync(join(from, 'libreoffice-wasm', `${filename}.gz`));
  const chunks = Math.ceil(compressed.length / PART_BYTES);
  for (let i = 0; i < chunks; i++) {
    writeFileSync(join(to, `${filename}.part_${i}`), compressed.subarray(i * PART_BYTES, (i + 1) * PART_BYTES));
  }
  writeFileSync(join(to, `${filename}.manifest.json`), JSON.stringify({
    filename, chunks, totalSize: compressed.length, chunkSize: PART_BYTES, encoding: 'gzip',
  }));
}

const [, , from = 'out', to = 'edgeone-dist', mirror] = process.argv;
// Both build directories share one filesystem. Hard links avoid storing a
// second copy of ordinary assets in EdgeOne's build workspace.
function stageAssets(source, destination, include) {
  mkdirSync(destination);
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const path = join(source, entry.name);
    if (!include(path)) continue;
    const target = join(destination, entry.name);
    if (entry.isDirectory()) stageAssets(path, target, include);
    else if (entry.isFile()) linkSync(path, target);
    else throw new Error(`Unsupported deployment entry: ${path}`);
  }
}
stageAssets(from, to, (path) => {
  const name = relative(from, path).split(sep).join('/');
  return !name.endsWith('.map') && name !== '.htaccess' && name !== '_headers'
    && !engines.some((engine) => name.startsWith(`libreoffice-wasm/${engine}`));
});
for (const filename of engines) makeCompressedParts(from, join(to, 'libreoffice-wasm'), filename);
const { headers, redirects, rewrites } = JSON.parse(readFileSync('edgeone.json', 'utf8'));
writeFileSync(join(to, 'edgeone.json'), JSON.stringify({ headers, redirects, rewrites }, null, 2));
copyFileSync('LICENSE', join(to, 'LICENSE.txt'));

let count = 0;
let largestBytes = 0;
let largestPath = '';
let totalBytes = 0;
function measure(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      measure(path);
      continue;
    }
    if (!entry.isFile()) throw new Error(`Unsupported deployment entry: ${path}`);
    const { size } = statSync(path);
    if (size > MAX_FILE_BYTES) throw new Error(`${path}: ${size} bytes (limit: ${MAX_FILE_BYTES})`);
    count++;
    totalBytes += size;
    if (size > largestBytes) {
      largestBytes = size;
      largestPath = relative(to, path);
    }
  }
}
for (const entry of ['index.html', 'zh/index.html']) {
  if (!statSync(join(to, entry)).isFile()) throw new Error(`Missing page: ${entry}`);
}
measure(to);
if (count > MAX_FILES) throw new Error(`${count} files (limit: ${MAX_FILES})`);
if (mirror) stageAssets(to, mirror, () => true);
console.log(`[EdgeOne] ${count}/${MAX_FILES} files; largest: ${largestPath} (${largestBytes}/${MAX_FILE_BYTES} bytes); total: ${totalBytes} bytes.`);
