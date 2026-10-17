import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Serves the built single page app (apps/kayar-1/dist).
 * Every unknown path falls back to index.html so the client side router works.
 */
const DIST = join(process.cwd(), 'apps', 'kayar-1', 'dist');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

async function readIfExists(path: string): Promise<Buffer | null> {
  try {
    const s = await stat(path);
    if (!s.isFile()) return null;
    return await readFile(path);
  } catch {
    return null;
  }
}

export async function handler(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const rel = normalize(path.join('/')).replace(/^(\.\.[/\\])+/, '');
  const target = join(DIST, rel);
  if (rel && !target.startsWith(DIST)) {
    return new Response('not found', { status: 404 });
  }
  const body = rel ? await readIfExists(target) : null;
  const file = body ?? (await readIfExists(join(DIST, 'index.html')));
  if (!file) {
    return new Response('The web app has not been built yet. Run "npm run build:web".', { status: 503 });
  }
  const type = TYPES[extname(rel || 'index.html').toLowerCase()] ?? 'application/octet-stream';
  const isHtml = !rel || extname(rel) === '.html';
  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      'content-type': type,
      'cache-control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
    },
  });
}

export const GET = handler;
export const HEAD = handler;
