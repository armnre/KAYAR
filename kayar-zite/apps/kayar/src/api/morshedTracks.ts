import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireSession } from '../server/rbac';
import { tokenField } from '../server/util';
import { trackDto, libToDto, playable } from '../server/tracks';
import { splitTags } from '../server/content';
import { STYLES } from '../server/discover';

const collection = z.object({ id: z.string(), title: z.string(), slug: z.string(), description: z.string(), coverUrl: z.string(), type: z.string(), tracks: z.array(trackDto) });

export default createEndpoint({
  description: 'Morshed music for signed-in members: admin-managed library and home collections',
  inputSchema: z.object({
    token: tokenField,
    mode: z.enum(['library', 'home']),
    q: z.string().max(80).optional(),
    cat: z.string().max(40).optional(),
    lang: z.enum(['all', 'fa', 'en', 'trending']).default('all'),
    page: z.number().int().min(1).max(50).default(1),
  }),
  outputSchema: z.object({
    tracks: z.array(trackDto), collections: z.array(collection), hasMore: z.boolean(),
    sections: z.array(z.object({ key: z.string(), title: z.string(), count: z.number(), tracks: z.array(trackDto) })),
    artists: z.array(z.object({ name: z.string(), image: z.string(), count: z.number() })),
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
    const seed = Math.floor(Date.now() / 864e5);
    const mix = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => ((x.id.charCodeAt(3) * seed + x.id.length) % 97) - ((y.id.charCodeAt(3) * seed + y.id.length) % 97));
    const has = (r: (typeof pub)[0], k: string) => r.genre === k || splitTags(r.categories).includes(k) || splitTags(r.tags).includes(k);
    if (input.cat) list = list.filter((r) => has(r, input.cat!));
    const langOk = (r: (typeof pub)[0]) => input.lang === 'all' || has(r, input.lang);
    if (input.lang !== 'all') list = list.filter(langOk);
    const browse = input.mode === 'library' && !q && !input.cat;
    const pool = pub.filter(langOk);
    const defs: [string, string][] = input.lang === 'trending' ? [['trending', 'ترندهای جهانی این هفته']]
      : [...(input.lang !== 'fa' ? [['trending', 'ترند'] as [string, string]] : []),
         ...STYLES.filter((x) => input.lang === 'all' || x.lang === input.lang).map((x) => [x.key, x.title] as [string, string])];
    const sections = browse ? defs.map(([key, title]) => { const all = pool.filter((r) => has(r, key)); return { key, title, count: all.length, tracks: mix(all).slice(0, 14).map(libToDto) }; }).filter((x) => x.count > 0) : [];
    const byArtist = new Map<string, { name: string; image: string; count: number }>();
    for (const r of pool) { const k = r.artist ?? ''; if (!k) continue; const e = byArtist.get(k) ?? { name: k, image: r.coverUrl || r.artwork || '', count: 0 }; e.count++; byArtist.set(k, e); }
    const artists = browse ? mix([...byArtist.values()].filter((x) => x.count >= 4).map((x) => ({ ...x, id: x.name + 'xxxx' }))).slice(0, 18).map(({ name, image, count }) => ({ name, image, count })) : [];
    return { tracks: list.slice(0, input.mode === 'home' ? 12 : 300).map(libToDto), collections, hasMore: false, sections, artists };
  },
});
