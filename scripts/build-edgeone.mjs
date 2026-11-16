import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const output = 'edgeone-dist';
const nextOutput = 'out';
mkdirSync('dist', { recursive: true });
const stage = mkdtempSync('dist/edgeone-');
const env = { ...process.env, NEXT_PUBLIC_EDGEONE_BUILD: '1' };

function run(script, ...args) {
  const result = spawnSync(process.execPath, [script, ...args], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('scripts/sync-pdfjs-workers.js');
run('node_modules/next/dist/bin/next', 'build');
run('scripts/ensure-pdfjs-viewer-js.js', nextOutput);
const ready = join(stage, 'site');
const nextSite = join(stage, 'next-site');
run('scripts/prepare-edgeone.mjs', nextOutput, ready, nextSite);

// EdgeOne's Next adapter can collect out/ even with a custom output directory.
renameSync(nextOutput, join(stage, 'next-export'));
renameSync(nextSite, nextOutput);
if (existsSync(output)) renameSync(output, join(stage, 'previous'));
renameSync(ready, output);
console.log(`[EdgeOne] Both ${output}/ and ${nextOutput}/ contain the checked static site.`);
