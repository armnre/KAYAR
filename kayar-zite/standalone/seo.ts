// Server-side SEO: per-route <head> tags for crawlers, real 404s, dynamic sitemap.xml and robots.txt.
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import { pool } from './db';
import { PAGES } from '../apps/kayar/src/lib/staticPages';

const SITE = 'کایار | KAYAR';
const DEFAULT_TITLE = 'کایار | KAYAR — تمرین، تغذیه و موسیقی ورزشی';
const DEFAULT_DESC = 'کایار، همراه ورزشکاران کاپوش: برنامه تمرینی و تغذیه هوشمند بدن‌یار، موسیقی و پادکست ورزشی مرشد و پیشنهادات ویژه.';
const VISIBLE = `p."status" = 'published' AND p."publishedAt" IS NOT NULL AND p."publishedAt" <= NOW()`;
const TTL = 60_000;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s: string, n: number) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const plain = (md: string) => md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*_`~|-]+/g, ' ');

export function baseUrl(req: Request) {
  return (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}
const abs = (base: string, u: string) => (!u ? `${base}/og.png` : /^https?:\/\//.test(u) ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`);

type Meta = { title: string; description: string; path: string; image?: string; type?: 'website' | 'article'; jsonLd?: unknown; status: number; noindex?: boolean };

const cache = new Map<string, { html: string; status: number; exp: number }>();
export const invalidateSeoCache = () => cache.clear();

async function homeSeo() {
  try {
    const { rows } = await pool.query(`SELECT "publishedContent" AS c FROM "CmsBlocks" WHERE "key" = 'seo' AND "status" = 'published' LIMIT 1`);
    const j = rows[0]?.c ? JSON.parse(rows[0].c) as { title?: string; description?: string } : {};
    return { title: j.title ? `${j.title} | KAYAR` : DEFAULT_TITLE, description: j.description || DEFAULT_DESC };
  } catch { return { title: DEFAULT_TITLE, description: DEFAULT_DESC }; }
}

async function metaFor(p: string): Promise<Meta | null> {
  if (p === '/' || p === '') { const h = await homeSeo(); return { ...h, path: '/', status: 200 }; }
  if (p === '/blog') return { title: `مجله‌ی کایار — مطالب تمرین، تغذیه و سلامت | KAYAR`, description: 'مقاله‌های کاربردی تمرین، تغذیه، موسیقی ورزشی و سبک زندگی سالم از تیم کایار.', path: '/blog', status: 200 };
  if (p === '/shop') return { title: `فروشگاه کاپوش — پیشنهادهای ما برای تمرین بهتر | KAYAR`, description: 'پوشاک ورزشی کاپوش و پیشنهادهای شریک‌ها و حامیان کایار برای تمرین بهتر.', path: '/shop', status: 200 };
  let m = /^\/blog\/([^/]+)\/?$/.exec(p);
  if (m) {
    const slug = decodeURIComponent(m[1]).toLowerCase();
    const { rows } = await pool.query(`SELECT p."slug", p."title", p."excerpt", p."body", p."seoTitle", p."seoDescription", p."publishedAt", p."updatedAt", p.updated_at, mm."fileUrl" AS cover
      FROM "Posts" p LEFT JOIN "MediaAssets" mm ON mm.id::text = p."coverMediaId" WHERE ${VISIBLE} AND p."slug" = $1 LIMIT 1`, [slug]);
    const r = rows[0];
    if (!r) return { title: `مطلب پیدا نشد | ${SITE}`, description: DEFAULT_DESC, path: p, status: 404, noindex: true };
    const title = clip(r.seoTitle || r.title || '', 70);
    const description = clip(r.seoDescription || r.excerpt || plain(String(r.body ?? '')), 170);
    return {
      title: `${title} | KAYAR`, description, path: `/blog/${r.slug}`, image: r.cover ?? '', type: 'article', status: 200,
      jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: title, description, datePublished: r.publishedAt, dateModified: r.updatedAt || r.updated_at || r.publishedAt, inLanguage: 'fa-IR', author: { '@type': 'Organization', name: 'KAYAR' }, publisher: { '@type': 'Organization', name: 'KAYAR' } },
    };
  }
  m = /^\/p\/([^/]+)\/?$/.exec(p);
  if (m) {
    const pg = (PAGES as Record<string, { t: string; lead: string }>)[decodeURIComponent(m[1])];
    if (!pg) return { title: `صفحه پیدا نشد | ${SITE}`, description: DEFAULT_DESC, path: p, status: 404, noindex: true };
    return { title: `${pg.t} | KAYAR`, description: clip(pg.lead, 170), path: `/p/${m[1]}`, status: 200 };
  }
  return null;
}

function tags(base: string, m: Meta) {
  const url = `${base}${m.path}`;
  const img = abs(base, m.image ?? '');
  const t = esc(m.title), d = esc(m.description);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    m.noindex ? `<meta name="robots" content="noindex" />` : `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${m.type ?? 'website'}" /><meta property="og:site_name" content="KAYAR" /><meta property="og:locale" content="fa_IR" />`,
    `<meta property="og:title" content="${t}" /><meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${esc(url)}" /><meta property="og:image" content="${esc(img)}" />`,
    `<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${t}" /><meta name="twitter:description" content="${d}" /><meta name="twitter:image" content="${esc(img)}" />`,
    m.jsonLd ? `<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, '\\u003c')}</script>` : '',
  ].filter(Boolean).join('\n    ');
}

let template: string | null = null;
const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;
export function readTemplate(staticDir: string) {
  if (template === null || process.env.NODE_ENV !== 'production') template = fs.readFileSync(path.join(staticDir, 'index.html'), 'utf8');
  return template;
}

/** Renders index.html with route-specific head tags. Falls back to the stock template on any error. */
export async function renderHtml(req: Request, staticDir: string, inject: string): Promise<{ html: string; status: number }> {
  const tpl = readTemplate(staticDir).replace('</head>', `${inject}</head>`);
  const base = baseUrl(req);
  const key = `${base}${req.path}`;
  const hitC = cache.get(key);
  if (hitC && hitC.exp > Date.now()) return hitC;
  try {
    const m = await metaFor(req.path);
    if (!m) return { html: tpl.replace(SEO_BLOCK, (blk) => blk.replace('content="/og.png"', `content="${base}/og.png"`)), status: 200 };
    const out = { html: tpl.replace(SEO_BLOCK, `<!--seo:start-->\n    ${tags(base, m)}\n    <!--seo:end-->`), status: m.status, exp: Date.now() + TTL };
    cache.set(key, out);
    if (cache.size > 2000) cache.clear();
    return out;
  } catch (e) {
    console.error('seo render failed', (e as Error).message);
    return { html: tpl, status: 200 };
  }
}

export async function sitemap(req: Request, res: Response) {
  const base = baseUrl(req);
  const urls: { loc: string; lastmod?: string; pri: string }[] = [{ loc: `${base}/`, pri: '1.0' }, { loc: `${base}/blog`, pri: '0.8' }, { loc: `${base}/shop`, pri: '0.7' }];
  try {
    const { rows } = await pool.query(`SELECT p."slug", COALESCE(p."updatedAt", p.updated_at, p."publishedAt") AS m FROM "Posts" p WHERE ${VISIBLE} ORDER BY p."publishedAt" DESC LIMIT 5000`);
    for (const r of rows) urls.push({ loc: `${base}/blog/${encodeURIComponent(r.slug)}`, lastmod: r.m ? new Date(r.m).toISOString().slice(0, 10) : undefined, pri: '0.7' });
  } catch (e) { console.error('sitemap posts failed', (e as Error).message); }
  for (const slug of Object.keys(PAGES)) urls.push({ loc: `${base}/p/${slug}`, pri: '0.5' });
  res.type('application/xml').setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
}

export function robots(req: Request, res: Response) {
  res.type('text/plain').setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /admin\nDisallow: /api\nDisallow: /upload\n\nSitemap: ${baseUrl(req)}/sitemap.xml\n`);
}
