import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const output = 'edgeone-dist';
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
run('scripts/ensure-pdfjs-viewer-js.js', 'out');
const ready = join(stage, 'site');
run('scripts/prepare-edgeone.mjs', 'out', ready);
if (existsSync(output)) renameSync(output, join(stage, 'previous'));
renameSync(ready, output);
