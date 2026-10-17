import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { sql } from 'drizzle-orm';

import { endpoints } from './endpoints/index.js';
import { allowedOrigins, loadConfig, secureCookies, type Config } from './config.js';
import { ApiError, type EndpointContext } from './server/backend.js';
import { getStorage, sniffImage, MAX_IMAGE_BYTES } from './server/media.js';
import { requireSession, requireStaff } from './server/rbac.js';
import { db } from './db/index.js';
import { assertChatQuota, chatStream, messagesUsedToday } from './server/bodyyar.js';

const SESSION_COOKIE = 'kayar_session';
const CSRF_COOKIE = 'kayar_csrf';

function clientIp(req: FastifyRequest) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip ?? '0.0.0.0';
}

function originAllowed(cfg: Config, req: FastifyRequest) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin GET/HEAD or non-browser client
  const list = allowedOrigins(cfg);
  if (list.includes(origin)) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

export async function buildApp(cfg: Config = loadConfig()) {
  const app = Fastify({
    logger: {
      level: cfg.LOG_LEVEL,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    },
    bodyLimit: 1_000_000,
    trustProxy: true,
  });

  await app.register(cookie, { secret: undefined });
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const list = allowedOrigins(cfg);
      cb(null, list.includes(origin) || list.length === 0 ? true : false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await app.register(multipart, { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
    timeWindow: '1 minute',
    keyGenerator: (req) => clientIp(req),
  });

  /* ---------------- health ---------------- */
  app.get('/healthz', async () => ({ ok: true, service: 'kayar-api', uptime: Math.round(process.uptime()) }));
  app.get('/readyz', async (_req, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { ok: true, db: 'up' };
    } catch (e) {
      reply.code(503);
      return { ok: false, db: 'down', error: (e as Error).message };
    }
  });

  /* ---------------- helpers ---------------- */
  const buildContext = (req: FastifyRequest, reply: FastifyReply): EndpointContext => ({
    token: (req.cookies as Record<string, string>)[SESSION_COOKIE] ?? null,
    ip: clientIp(req),
    userAgent: String(req.headers['user-agent'] ?? ''),
    setSession: (token, csrf, expiresAt) => {
      const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      const secure = secureCookies(cfg, req.headers.host);
      reply.setCookie(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge });
      reply.setCookie(CSRF_COOKIE, csrf, { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge });
    },
    clearSession: () => {
      const secure = secureCookies(cfg, req.headers.host);
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      reply.clearCookie(CSRF_COOKIE, { path: '/' });
      void secure;
    },
  });

  /** Origin check + double-submit CSRF token for state changing requests. */
  const assertCsrf = (req: FastifyRequest) => {
    if (!originAllowed(cfg, req)) {
      throw new ApiError({ code: 'FORBIDDEN', message: 'CSRF_ORIGIN', userFacingMessage: 'درخواست از مبدأ مجاز نیست.', status: 403 });
    }
    const session = (req.cookies as Record<string, string>)[SESSION_COOKIE];
    if (!session) return;
    const cookieToken = (req.cookies as Record<string, string>)[CSRF_COOKIE];
    const header = req.headers['x-csrf-token'];
    if (!cookieToken || typeof header !== 'string' || cookieToken !== header) {
      throw new ApiError({ code: 'FORBIDDEN', message: 'CSRF_TOKEN', userFacingMessage: 'نشست معتبر نیست؛ صفحه را تازه کن و دوباره وارد شو.', status: 403 });
    }
  };

  /* ---------------- RPC ---------------- */
  app.post('/rpc/:name', async (req, reply) => {
    const { name } = req.params as { name: string };
    const endpoint = endpoints[name];
    if (!endpoint) {
      reply.code(404);
      return { error: { code: 'NOT_FOUND', message: 'unknown endpoint', userFacingMessage: 'سرویس موردنظر پیدا نشد.' } };
    }
    assertCsrf(req);

    const body = (req.body ?? {}) as Record<string, unknown>;
    const parsed = endpoint.inputSchema.safeParse(body);
    if (!parsed.success) {
      reply.code(400);
      return {
        error: {
          code: 'BAD_REQUEST',
          message: 'INVALID_INPUT',
          userFacingMessage: parsed.error?.issues?.[0]?.message ?? 'ورودی نامعتبر است.',
        },
      };
    }
    const input = parsed.data as any;
    const ctx = buildContext(req, reply);

    // bodyyar chat can be streamed as server-sent events
    if (name === 'bodyyarChat' && String(req.headers.accept ?? '').includes('text/event-stream')) {
      const { member } = await requireSession(ctx);
      const used = await messagesUsedToday(member.id);
      assertChatQuota(used);
      reply.raw.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      });
      const write = (event: string, data: unknown) => reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      try {
        await chatStream(member.id, input.message, (chunk) => write('delta', { text: chunk }));
        write('done', { ok: true });
      } catch (e) {
        const err = e as ApiError;
        write('error', { message: err.userFacingMessage ?? 'خطایی رخ داد؛ دوباره تلاش کن.' });
      } finally {
        reply.raw.end();
      }
      return reply;
    }

    const result = await endpoint.execute({ input, ctx });
    const validated = endpoint.outputSchema.safeParse(result);
    if (!validated.success) {
      req.log.error({ err: validated.error, endpoint: name }, 'endpoint output validation failed');
      reply.code(500);
      return { error: { code: 'INTERNAL', message: 'OUTPUT_INVALID', userFacingMessage: 'یه مشکلی پیش اومد؛ دوباره تلاش کن.' } };
    }
    return validated.data;
  });

  /* ---------------- media upload ---------------- */
  app.post('/upload', async (req, reply) => {
    assertCsrf(req);
    const ctx = buildContext(req, reply);
    await requireStaff(ctx, 'content.manage');
    const file = await req.file();
    if (!file) throw new ApiError({ code: 'BAD_REQUEST', message: 'NO_FILE', userFacingMessage: 'فایلی ارسال نشد.' });
    const buf = await file.toBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) throw new ApiError({ code: 'BAD_REQUEST', message: 'TOO_LARGE', userFacingMessage: 'حجم تصویر بیشتر از ۵ مگابایت است.' });
    if (buf.byteLength < 32) throw new ApiError({ code: 'BAD_REQUEST', message: 'TOO_SMALL', userFacingMessage: 'فایل خالی یا ناقص است.' });
    const sniffed = sniffImage(new Uint8Array(buf));
    if (!sniffed) throw new ApiError({ code: 'BAD_REQUEST', message: 'BAD_TYPE', userFacingMessage: 'فقط تصاویر JPG، PNG، WebP یا GIF مجاز هستند (نوع واقعی فایل بررسی شد).' });
    const stored = await getStorage().save(buf, sniffed.ext);
    return { url: stored.url, size: stored.size, mime: sniffed.mime, width: sniffed.w ?? 0, height: sniffed.h ?? 0 };
  });

  /* ---------------- media delivery ---------------- */
  app.get('/media/:file', async (req, reply) => {
    const { file } = req.params as { file: string };
    if (!/^[A-Za-z0-9._-]+$/.test(file)) return reply.code(400).send({ error: 'bad key' });
    try {
      const buf = await getStorage().read(file);
      const ext = file.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return reply.header('content-type', mime).header('cache-control', 'public, max-age=31536000, immutable').send(buf);
    } catch {
      return reply.code(404).send({ error: 'not found' });
    }
  });

  /* ---------------- errors ---------------- */
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) {
      reply.code(err.status);
      return { error: { code: err.code, message: err.message, userFacingMessage: err.userFacingMessage } };
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status === 429) {
      reply.code(429);
      return { error: { code: 'RATE_LIMITED', message: 'rate limited', userFacingMessage: 'تعداد درخواست‌ها زیاد بود؛ کمی صبر کن و دوباره تلاش کن.' } };
    }
    req.log.error({ err }, 'unhandled error');
    reply.code(status >= 400 && status < 500 ? status : 500);
    return { error: { code: 'INTERNAL', message: 'internal error', userFacingMessage: 'یه مشکلی پیش اومد؛ دوباره تلاش کن.' } };
  });

  return app;
}
