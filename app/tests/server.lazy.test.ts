import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// `next build` imports every route module (-> lib/server) while the Render disk is not mounted, so importing
// lib/server must not touch DATABASE_PATH; the DB is created on first store call. Child process because
// lib/server imports 'server-only', which only resolves under the react-server condition.
test('importing lib/server does not create the DB until first use', () => {
  const app = path.resolve(import.meta.dirname, '..');
  const tmp = mkdtempSync(path.join(tmpdir(), 'duespilot-lazy-'));
  const dir = path.join(tmp, 'disk');
  const file = path.join(dir, 'duespilot.db');
  const script = `
    const { existsSync } = await import('node:fs');
    const m = await import(${JSON.stringify(pathToFileURL(path.join(app, 'lib', 'server.ts')).href)});
    const { store } = m.store ? m : m.default; // tsx compiles to CJS here: exports land on default
    const imported = existsSync(${JSON.stringify(dir)});
    await store.read();
    console.log(JSON.stringify({ imported, used: existsSync(${JSON.stringify(file)}) }));`;
  const out = execFileSync(process.execPath, ['--conditions=react-server', '--import', pathToFileURL(path.join(app, 'node_modules', 'tsx', 'dist', 'loader.mjs')).href,
    '--input-type=module', '-e', script], { cwd: tmp, env: { ...process.env, DATABASE_PATH: file }, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(out.trim().split('\n').pop()!), { imported: false, used: true });
  assert.ok(existsSync(file));
});
