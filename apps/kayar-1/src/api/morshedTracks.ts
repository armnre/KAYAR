import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireSession } from '../server/rbac';
import { tokenField } from '../server/util';
import { trackDto, libToDto, playable } from '../server/tracks';
import { splitTags } from '../server/content';

const collection = z.object({ id: z.string(), title: z.string(), slug: z.string(), description: z.string(), coverUrl: z.string(), type: z.string(), tracks: z.array(trackDto) });

export default createEndpoint({
  description: 'Morshed music for signed-in members: admin-managed library and home collections',
  inputSchema: z.object({
    token: tokenField,
    mode: z.enum(['library', 'home']),
    q: z.string().max(80).optional(),
    cat: z.string().max(40).optional(),
    page: z.number().int().min(1).max(50).default(1),
  }),
  outputSchema: z.object({
    tracks: z.array(trackDto), collections: z.array(collection), hasMore: z.boolean(),
    sections: z.array(z.object({ key: z.string(), title: z.string(), count: z.number(), tracks: z.array(trackDto) })),
  }),
  execute: async ({ input }) => {
    await requireSession(input.token);
    const { records } = await zite.tracks.findAll({ filters: { status: 'published' }, limit: 2000 });
    const pub = records.filter(playable).sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const byId = new Map(pub.map((r) => [r.id, r]));
    const placement = input.mode === 'home' ? 'home' : 'morshed';
    const cols = (await zite.collections.findAll({ filters: { status: 'published', placement }, limit: 100 })).records.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const items = cols.length ? (await zite.collectionItems.findAll({ filters: { collectionId: { in: cols.map((c) => c.id) } }, limit: 2000 })).records : [];
    const collections = cols.map((c) => ({
      id: c.id, title: c.title ?? '', slug: c.slug ?? '', description: c.description ?? '', coverUrl: c.coverUrl ?? '', type: c.type ?? 'row',
      tracks: items.filter((i) => i.collectionId === c.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((i) => byId.get(i.trackId ?? '')).filter((r): r is NonNullable<typeof r> => !!r).map(libToDto),
    })).filter((c) => c.tracks.length > 0);

    let list = pub;
    const q = input.q?.trim().toLowerCase();
    if (q) list = list.filter((r) => `${r.title} ${r.artist} ${r.album} ${r.tags}`.toLowerCase().includes(q));
    const has = (r: (typeof pub)[0], k: string) => r.genre === k || splitTags(r.categories).includes(k) || splitTags(r.tags).includes(k);
    if (input.cat) list = list.filter((r) => has(r, input.cat!));
    // Shuffle-by-day so rows feel fresh but stable within a day
    const seed = Math.floor(Date.now() / 864e5);
    const mix = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => ((x.id.charCodeAt(3) * seed) % 97) - ((y.id.charCodeAt(3) * seed) % 97));
    const SECTIONS: [string, string][] = [['fa', 'موزیک فارسی'], ['workout', 'تمرین قدرتی'], ['running', 'دویدن و کاردیو'], ['instrumental', 'بی‌کلام'], ['walking', 'پیاده‌روی'], ['focus', 'تمرکز'], ['recovery', 'ریکاوری و آرامش'], ['en', 'انگلیسی']];
    const sections = input.mode === 'library' && !q && !input.cat
      ? SECTIONS.map(([key, title]) => { const all = pub.filter((r) => has(r, key)); return { key, title, count: all.length, tracks: mix(all).slice(0, 12).map(libToDto) }; }).filter((x) => x.count > 0)
      : [];
    return { tracks: list.slice(0, input.mode === 'home' ? 12 : 300).map(libToDto), collections, hasMore: false, sections };
  },
});
