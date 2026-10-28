import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite, type TracksRecordType } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { audit } from '../server/audit';
import { tokenField } from '../server/util';
import { bad, splitTags, joinTags } from '../server/content';
import { assertPublicUrl } from '../server/guard';
import { addToBlocklist } from '../server/music/importer';
import { dedupeKey, normFa } from '../server/music/classify';

const trackOut = z.object({
  id: z.string(), title: z.string(), artist: z.string(), album: z.string(), source: z.string(), sourceId: z.string(), coverUrl: z.string(), audioUrl: z.string(),
  duration: z.number(), licenseUrl: z.string(), shareUrl: z.string(), rights: z.string(), categories: z.array(z.string()), tags: z.array(z.string()),
  featured: z.boolean(), status: z.string(), sortOrder: z.number(), sourceName: z.string(), sourceUrl: z.string(), license: z.string(), bitrate: z.number(), importedAt: z.string(), style: z.string(),
});
const toOut = (r: TracksRecordType) => ({
  id: r.id, title: r.title ?? '', artist: r.artist ?? '', album: r.album ?? '', source: r.source ?? '', sourceId: r.sourceId ?? '', coverUrl: r.coverUrl ?? '', audioUrl: r.audioUrl ?? '',
  duration: r.durationSeconds ?? 0, licenseUrl: r.licenseUrl ?? '', shareUrl: r.shareUrl ?? '', rights: r.rights ?? '', categories: splitTags(r.categories), tags: splitTags(r.tags),
  featured: !!r.isFeatured, status: r.status ?? 'draft', sortOrder: r.sortOrder ?? 0, sourceName: r.sourceName ?? '', sourceUrl: r.sourceUrl ?? '', license: r.license ?? '', bitrate: r.bitrate ?? 0, importedAt: r.importedAt ?? '', style: r.style ?? '',
});

export default createEndpoint({
  description: 'Admin management of the Morshed track library (add by upload or public link, edit, publish, reorder)',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'create', 'update', 'reorder', 'delete', 'approve', 'reject', 'takedown', 'takedownArtist', 'purgeAll', 'purgeIds']),
    artist: z.string().max(120).optional(),
    confirm: z.string().max(40).optional(),
    q: z.string().max(80).optional(),
    id: z.string().max(64).optional(),
    draft: z.object({
      title: z.string().trim().min(1).max(160), artist: z.string().trim().max(120), album: z.string().trim().max(160),
      audioUrl: z.string().url().max(2000), coverUrl: z.string().max(2000), durationSeconds: z.number().min(0).max(36000),
      source: z.enum(['upload', 'external']), shareUrl: z.string().max(2000), licenseUrl: z.string().max(2000), rights: z.string().max(1000),
    }).optional(),
    ids: z.array(z.string().max(64)).max(2000).optional(),
    patch: z.object({
      title: z.string().trim().min(1).max(160), artist: z.string().trim().max(120), album: z.string().trim().max(160), rights: z.string().max(1000),
      categories: z.array(z.string().max(40)).max(10), tags: z.array(z.string().max(40)).max(15), featured: z.boolean(), status: z.enum(['pending', 'draft', 'published', 'hidden', 'rejected']),
    }).optional(),
  }),
  outputSchema: z.object({ tracks: z.array(trackOut) }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'morshed.manage');
    const all = async () => (await zite.tracks.findAll({ filters: { status: { not: 'deleted' } }, limit: 2000 })).records as TracksRecordType[];

    if (input.action === 'create') {
      const d = input.draft;
      if (!d) throw bad('اطلاعات آهنگ کامل نیست.');
      if (!d.audioUrl.startsWith('https://')) throw bad('لینک پخش باید با https شروع شود.');
      assertPublicUrl(d.audioUrl);
      if (d.coverUrl) assertPublicUrl(d.coverUrl);
      const dup = await zite.tracks.findAll({ filters: { audioUrl: d.audioUrl }, limit: 5 });
      if (dup.records.some((r) => r.status !== 'deleted')) throw bad('این آهنگ قبلاً به کتابخانه اضافه شده است.');
      const max = Math.max(0, ...(await all()).map((r) => r.sortOrder ?? 0));
      const c = await zite.tracks.create({ record: {
        title: d.title, artist: d.artist, album: d.album, source: d.source, sourceId: '', coverUrl: d.coverUrl, audioUrl: d.audioUrl, durationSeconds: Math.round(d.durationSeconds),
        licenseUrl: d.licenseUrl, shareUrl: d.shareUrl, rights: d.rights, categories: '', tags: '', isFeatured: false, status: 'draft', sortOrder: max + 1,
      } });
      await audit(member.id, 'track.add', 'track', c.id, { source: d.source });
    } else if (input.action === 'update') {
      const cur = input.id ? await zite.tracks.findOne({ id: input.id }) : undefined;
      if (!cur || cur.status === 'deleted' || !input.patch) throw bad('آهنگ پیدا نشد.');
      const p = input.patch;
      if (p.status === 'published' && !cur.audioUrl) throw bad('این آهنگ لینک پخش معتبر ندارد و قابل انتشار نیست.');
      if (p.status === 'published' && !cur.licenseUrl && !p.rights.trim()) throw bad('برای انتشار، اطلاعات مجوز/حقوق را ثبت کن.');
      await zite.tracks.update({ id: cur.id, record: { title: p.title, artist: p.artist, album: p.album, rights: p.rights, categories: joinTags(p.categories), tags: joinTags(p.tags), isFeatured: p.featured, status: p.status } });
      await audit(member.id, cur.status !== p.status ? `track.${p.status === 'published' ? 'publish' : p.status === 'hidden' ? 'hide' : 'unpublish'}` : 'track.update', 'track', cur.id, { from: cur.status, to: p.status });
    } else if (input.action === 'reorder') {
      const ids = input.ids ?? [];
      const valid = new Set((await all()).map((r) => r.id));
      await Promise.all(ids.filter((id) => valid.has(id)).map((id, i) => zite.tracks.update({ id, record: { sortOrder: i + 1 } })));
      await audit(member.id, 'track.reorder', 'track', '', { count: ids.length });
    } else if (input.action === 'approve' || input.action === 'reject') {
      const ids = new Set(input.ids ?? []);
      const rows = (await all()).filter((r) => ids.has(r.id));
      const status = input.action === 'approve' ? 'published' : 'rejected';
      for (let i = 0; i < rows.length; i += 20) await Promise.all(rows.slice(i, i + 20).map((r) => zite.tracks.update({ id: r.id, record: { status, published: status === 'published' } })));
      await audit(member.id, `track.${input.action}`, 'track', '', { count: rows.length });
    } else if (input.action === 'takedown' || input.action === 'takedownArtist') {
      // Takedown = hard delete + blocklist so a later import never brings it back.
      const cur = input.id ? await zite.tracks.findOne({ id: input.id }) : undefined;
      const artist = input.action === 'takedownArtist' ? (input.artist || cur?.artist || '').trim() : '';
      if (input.action === 'takedown' && !cur) throw bad('آهنگ پیدا نشد.');
      if (input.action === 'takedownArtist' && !artist) throw bad('هنرمند مشخص نیست.');
      const victims = input.action === 'takedown' ? [cur!] : (await all()).filter((r) => normFa(r.artist ?? '') === normFa(artist));
      await purgeTracks(victims.map((v) => v.id));
      if (input.action === 'takedown') await addToBlocklist({ track: dedupeKey(cur!.artist ?? '', cur!.title ?? '') }); else await addToBlocklist({ artist });
      await audit(member.id, `track.${input.action}`, 'track', cur?.id ?? '', { artist, count: victims.length });
    } else if (input.action === 'purgeAll') {
      if (input.confirm !== 'حذف همه') throw bad('برای حذف همه‌ی آهنگ‌ها عبارت «حذف همه» را دقیق وارد کن.');
      const { rows } = await zite.sql({ query: `SELECT id FROM "Tracks"` });
      await purgeTracks(rows.map((r) => String(r.id)));
      await audit(member.id, 'track.purgeAll', 'track', '', { count: rows.length });
    } else if (input.action === 'purgeIds') {
      const ids = [...new Set(input.ids ?? [])];
      if (!ids.length) throw bad('هیچ آهنگی انتخاب نشده است.');
      await purgeTracks(ids);
      await audit(member.id, 'track.purgeIds', 'track', '', { count: ids.length });
    } else if (input.action === 'delete') {
      const cur = input.id ? await zite.tracks.findOne({ id: input.id }) : undefined;
      if (!cur || cur.status === 'deleted') throw bad('آهنگ پیدا نشد.');
      await zite.tracks.update({ id: cur.id, record: { status: 'deleted' } });
      const items = await zite.collectionItems.findAll({ filters: { trackId: cur.id }, limit: 500 });
      await Promise.all(items.records.map((i) => zite.collectionItems.delete({ id: i.id })));
      await audit(member.id, 'track.delete', 'track', cur.id, { title: cur.title });
    }

    let tracks = (await all()).map(toOut).sort((a, b) => a.sortOrder - b.sortOrder);
    const q = input.action === 'list' ? input.q?.trim().toLowerCase() : '';
    if (q) tracks = tracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q));
    return { tracks };
  },
});

/** Deletes tracks and everything that points at them (collection items, favorites, listening history). */
export async function purgeTracks(ids: string[]) {
  for (let i = 0; i < ids.length; i += 25) {
    const chunk = ids.slice(i, i + 25);
    const keys = chunk.map((id) => `lib:${id}`);
    const [items, favs, hist] = await Promise.all([
      zite.collectionItems.findAll({ filters: { trackId: { in: chunk } }, limit: 2000 }),
      zite.favorites.findAll({ filters: { itemKey: { in: keys } }, limit: 2000 }),
      zite.listeningHistory.findAll({ filters: { itemKey: { in: keys } }, limit: 2000 }),
    ]);
    await Promise.all([
      ...items.records.map((r) => zite.collectionItems.delete({ id: r.id })),
      ...favs.records.map((r) => zite.favorites.delete({ id: r.id })),
      ...hist.records.map((r) => zite.listeningHistory.delete({ id: r.id })),
      ...chunk.map((id) => zite.tracks.delete({ id })),
    ]);
  }
}
