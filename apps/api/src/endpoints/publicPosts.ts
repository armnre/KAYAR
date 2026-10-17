import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { zite } from '../server/db.js';
import { splitTags } from '../server/content.js';

const card = z.object({ slug: z.string(), title: z.string(), excerpt: z.string(), coverUrl: z.string(), coverAlt: z.string(), tags: z.array(z.string()), publishedAt: z.string() });

// Only status=published AND publishedAt <= now are ever returned. Drafts, archived, scheduled
// and deleted posts are excluded in SQL, so guessing a slug returns `post: null`.
const VISIBLE = `p."status" = 'published' AND p."published_at" IS NOT NULL AND p."published_at" <= NOW()`;
const COLS = `p."slug" AS slug, p."title" AS title, p."excerpt" AS excerpt, p."tags" AS tags, p."published_at" AS at, m."file_url" AS cover, m."alt" AS alt`;
const FROM = `FROM "posts" p LEFT JOIN "media_assets" m ON m.id::text = p."cover_media_id"`;

const toCard = (r: Record<string, unknown>) => ({
  slug: String(r.slug ?? ''), title: String(r.title ?? ''), excerpt: String(r.excerpt ?? ''), coverUrl: String(r.cover ?? ''), coverAlt: String(r.alt ?? ''),
  tags: splitTags(r.tags as string), publishedAt: new Date(String(r.at)).toISOString(),
});

export default createEndpoint({
  description: 'Public blog: lists published posts or returns one published post by slug',
  inputSchema: z.object({ slug: z.string().max(140).optional(), tag: z.string().max(40).optional(), page: z.number().int().min(1).max(500).default(1), pageSize: z.number().int().min(1).max(24).default(9) }),
  outputSchema: z.object({
    posts: z.array(card), total: z.number(), tags: z.array(z.string()),
    post: card.extend({ body: z.string(), seoTitle: z.string(), seoDescription: z.string() }).nullable(),
  }),
  execute: async ({ input, ctx }) => {
    if (input.slug) {
      const r = await zite.sql({ query: `SELECT ${COLS}, p."body" AS body, p."seo_title" AS st, p."seo_description" AS sd ${FROM} WHERE ${VISIBLE} AND p."slug" = $1 LIMIT 1`, params: [input.slug.toLowerCase()] });
      const row = r.rows[0];
      return { posts: [], total: 0, tags: [], post: row ? { ...toCard(row), body: String(row.body ?? ''), seoTitle: String(row.st ?? ''), seoDescription: String(row.sd ?? '') } : null };
    }
    const params: unknown[] = [];
    let where = VISIBLE;
    if (input.tag) { params.push(input.tag); where += ` AND $1 = ANY(string_to_array(COALESCE(p."tags",''), ','))`; }
    const [rows, count, tags] = await Promise.all([
      zite.sql({ query: `SELECT ${COLS} ${FROM} WHERE ${where} ORDER BY p."published_at" DESC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`, params }),
      zite.sql({ query: `SELECT COUNT(*) AS n FROM "posts" p WHERE ${where}`, params }),
      zite.sql({ query: `SELECT DISTINCT TRIM(t) AS tag FROM "posts" p, unnest(string_to_array(COALESCE(p."tags",''), ',')) t WHERE ${VISIBLE} AND TRIM(t) <> '' LIMIT 40` }),
    ]);
    return { posts: rows.rows.map(toCard), total: Number(count.rows[0]?.n ?? 0), tags: tags.rows.map((t) => String(t.tag)), post: null };
  },
});
