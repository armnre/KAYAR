import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Production launcher: starts the Fastify API and the Next.js gateway.
 * Both children are stopped when the parent receives SIGTERM/SIGINT.
 */
const root = process.cwd();
const apiEntry = join(root, 'apps', 'api', 'dist', 'main.js');
const children = [];

function start(name, cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  child.on('exit', (code, signal) => {
    if (signal) return;
    console.error(`[kayar] ${name} exited with code ${code}`);
    if (code !== 0) shutdown();
  });
  children.push(child);
  return child;
}

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  for (const c of children) {
    try { c.kill('SIGTERM'); } catch { /* ignore */ }
  }
  setTimeout(() => process.exit(0), 1500);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

if (!existsSync(apiEntry)) {
  console.error('[kayar] apps/api/dist/main.js is missing — run "npm run build:api" first.');
  process.exit(1);
}

start('api', process.execPath, [apiEntry]);
start('web', process.execPath, [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start']);
