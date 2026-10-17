import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Gateway: every /api/* request is forwarded to the Fastify API.
 * Cookies (session + CSRF) are passed through untouched.
 */
const API = () => process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';

export async function handler(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const target = `${API()}/api/${path.join('/')}${req.nextUrl.search}`;
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('x-forwarded-host', req.headers.get('host') ?? '');
  headers.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));

  const method = req.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

  try {
    const res = await fetch(target, { method, headers, body, redirect: 'manual', cache: 'no-store' });
    const out = new Headers();
    res.headers.forEach((value, key) => {
      if (['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) return;
      out.append(key, value);
    });
    const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const c of cookies) out.append('set-cookie', c);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  } catch {
    return Response.json(
      { error: { code: 'API_UNREACHABLE', message: 'api unreachable', userFacingMessage: 'سرویس در دسترس نیست؛ چند لحظه بعد دوباره تلاش کن.' } },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
