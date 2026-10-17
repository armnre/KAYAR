import { z } from 'zod';
import { createEndpoint } from '../server/backend.js';
import { zite } from '../server/db.js';
import { requireStaff } from '../server/rbac.js';
import { audit } from '../server/audit.js';
import { tokenField } from '../server/util.js';
import { bad } from '../server/content.js';
import { getStorage, sniffImage, cleanName, MAX_IMAGE_BYTES } from '../server/media.js';

const asset = z.object({ id: z.string(), url: z.string(), alt: z.string(), fileName: z.string(), mime: z.string(), kind: z.string(), width: z.number(), height: z.number(), size: z.number(), uploadedBy: z.string(), createdAt: z.string().nullable() });
const usage = z.object({ type: z.string(), id: z.string(), title: z.string(), live: z.boolean() });

async function findUsage(id: string, url: string) {
  const like = `%${url}%`;
  const [posts, blocks, cols, tracks] = await Promise.all([
    zite.sql({ query: `SELECT id, "title" AS t, "status" AS s FROM "posts" WHERE "status" <> 'deleted' AND ("cover_media_id" = $1 OR "body" LIKE $2) LIMIT 50`, params: [id, like] }),
    zite.sql({ query: `SELECT id, "key" AS t, ("published_content" LIKE $1) AS live FROM "cms_blocks" WHERE "content" LIKE $1 OR "published_content" LIKE $1 LIMIT 50`, params: [like] }),
    zite.sql({ query: `SELECT id, "title" AS t, "status" AS s FROM "collections" WHERE "status" <> 'deleted' AND "cover_url" = $1 LIMIT 50`, params: [url] }),
    zite.sql({ query: `SELECT id, "title" AS t, "status" AS s FROM "tracks" WHERE "status" <> 'deleted' AND "cover_url" = $1 LIMIT 50`, params: [url] }),
  ]);
  return [
    ...posts.rows.map((r) => ({ type: 'post', id: String(r.id), title: String(r.t ?? ''), live: r.s === 'published' })),
    ...blocks.rows.map((r) => ({ type: 'cms', id: String(r.id), title: String(r.t ?? ''), live: !!r.live })),
    ...cols.rows.map((r) => ({ type: 'collection', id: String(r.id), title: String(r.t ?? ''), live: r.s === 'published' })),
    ...tracks.rows.map((r) => ({ type: 'track', id: String(r.id), title: String(r.t ?? ''), live: r.s === 'published' })),
  ];
}

export default createEndpoint({
  description: 'Media library: list, register a verified upload, edit alt text, check usage, delete safely',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'register', 'update', 'usage', 'delete']),
    id: z.string().max(64).optional(),
    url: z.string().max(600).optional(),
    alt: z.string().trim().max(200).optional(),
    fileName: z.string().max(200).optional(),
    width: z.number().int().min(0).max(20000).optional(),
    height: z.number().int().min(0).max(20000).optional(),
    force: z.boolean().optional(),
  }),
  outputSchema: z.object({ assets: z.array(asset), usage: z.array(usage), saved: asset.nullable() }),
  execute: async ({ input, ctx }) => {
    const { member } = await requireStaff(ctx, 'content.manage');
    let usageOut: z.infer<typeof usage>[] = [];
    let savedId: string | null = null;

    if (input.action === 'register') {
      if (!input.alt) throw bad('متن جایگزین (alt) الزامی است.');
      const url = input.url ?? '';
      const key = url.split('/media/').pop() ?? '';
      if (!key) throw bad('آدرس فایل معتبر نیست.');
      const storage = getStorage();
      // the bytes are read back from our own storage: the real type is detected again
      const buf = await storage.read(key).catch(() => null);
      if (!buf) throw bad('فایل آپلودشده پیدا نشد؛ دوباره آپلود کن.');
      if (buf.byteLength > MAX_IMAGE_BYTES) throw bad('حجم تصویر بیشتر از ۵ مگابایت است.');
      if (buf.byteLength < 32) throw bad('فایل خالی یا ناقص است.');
      const s = sniffImage(new Uint8Array(buf));
      if (!s) throw bad('فقط تصاویر JPG، PNG، WebP یا GIF مجاز هستند (نوع واقعی فایل بررسی شد).');
      const exists = await zite.mediaAssets.findOne({ filters: { fileUrl: url } });
      if (exists) throw bad('این فایل قبلاً در کتابخانه ثبت شده است.');
      const c = await zite.mediaAssets.create({ record: {
        alt: input.alt, fileUrl: url, kind: 'image', fileName: cleanName(input.fileName ?? key), mimeType: s.mime,
        width: s.w || input.width || 0, height: s.h || input.height || 0, size: buf.byteLength, uploadedBy: member.id,
      } });
      savedId = c.id;
      await audit(member.id, 'media.upload', 'media', c.id, { mime: s.mime, size: buf.byteLength });
    } else if (input.action !== 'list') {
      const a = input.id ? await zite.mediaAssets.findOne({ id: input.id }) : undefined;
      if (!a) throw bad('رسانه پیدا نشد.');
      if (input.action === 'update') {
        if (!input.alt) throw bad('متن جایگزین (alt) الزامی است.');
        await zite.mediaAssets.update({ id: a.id, record: { alt: input.alt } });
        savedId = a.id;
        await audit(member.id, 'media.update', 'media', a.id);
      } else {
        usageOut = await findUsage(a.id, a.fileUrl ?? '');
        if (input.action === 'delete') {
          if (usageOut.some((x) => x.live)) throw bad('این تصویر در محتوای منتشرشده استفاده شده؛ اول آن را از محتوا جدا کن.');
          if (usageOut.length && !input.force) throw bad('این تصویر در پیش‌نویس‌ها استفاده شده؛ برای حذف تأیید کن.');
          await Promise.all(usageOut.filter((x) => x.type === 'post').map((x) => zite.posts.findOne({ id: x.id }).then((p) => p?.coverMediaId === a.id ? zite.posts.update({ id: x.id, record: { coverMediaId: '' } }) : null)));
          await zite.mediaAssets.delete({ id: a.id });
          // the file itself is removed from the storage as well
          const key = (a.fileUrl ?? '').split('/media/').pop() ?? '';
          if (key) await getStorage().remove(key).catch(() => undefined);
          await audit(member.id, 'media.delete', 'media', a.id, { usedInDrafts: usageOut.length });
          usageOut = [];
        }
      }
    }

    const { records } = await zite.mediaAssets.findAll({ limit: 2000 });
    const ids = Array.from(new Set(records.map((r) => r.uploadedBy).filter((x): x is string => !!x)));
    const ms = ids.length ? await zite.members.findAll({ filters: { id: { in: ids } }, fields: ['displayName', 'username'], limit: 500 }) : { records: [] };
    const names = new Map<string, string>(ms.records.map((m) => [m.id, m.displayName || m.username || '—'] as [string, string]));
    const assets = records.map((r) => ({
      id: r.id, url: r.fileUrl ?? '', alt: r.alt ?? '', fileName: r.fileName ?? '', mime: r.mimeType ?? '', kind: r.kind ?? 'image',
      width: r.width ?? 0, height: r.height ?? 0, size: r.size ?? 0, uploadedBy: names.get(r.uploadedBy) ?? r.uploadedBy ?? '', createdAt: r.createdAt ?? null,
    }));
    const saved = assets.find((a) => a.id === savedId) ?? null;
    return { assets, usage: usageOut, saved };
  },
});
