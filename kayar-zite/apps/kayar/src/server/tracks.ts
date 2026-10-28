import { z } from 'zod';
import { zite, type TracksRecordType } from 'zitejs/db';
import { splitTags } from './content';

/** Track as sent to the app. `id` is a stable key: "lib:<track id>" or "ep:<podcast episode id>". */
export const trackDto = z.object({
  id: z.string(), title: z.string(), artist: z.string(), album: z.string(), duration: z.number(), cat: z.string(), hue: z.number(),
  license: z.string(), licenseUrl: z.string(), shareUrl: z.string(), rights: z.string(), audio: z.string(), image: z.string(),
  source: z.enum(['library', 'podcast']), featured: z.boolean(),
});
export type TrackDto = z.infer<typeof trackDto>;

const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

export const licenseLabel = (url?: string) => {
  const m = url?.match(/licenses\/([\w-]+)/)?.[1];
  return m ? `CC ${m.toUpperCase()}` : '';
};

/** External audio/covers are always served through our own domain (/media/*) so browsers in Iran never hit a foreign host. */
const viaProxy = (r: TracksRecordType) => r.source === 'external';
const coverOf = (r: TracksRecordType) => (r.coverUrl ? (viaProxy(r) && /^https?:\/\//.test(r.coverUrl) ? `/media/cover/${r.id}` : r.coverUrl) : '');

export const libToDto = (r: TracksRecordType): TrackDto => ({
  id: `lib:${r.id}`, title: r.title ?? '', artist: r.artist ?? '', album: r.album ?? '', duration: r.durationSeconds ?? 0, cat: splitTags(r.categories)[0] ?? '',
  hue: hue(r.id), license: licenseLabel(r.licenseUrl) || (r.licenseUrl ? 'مجوز' : ''), licenseUrl: r.licenseUrl ?? '', shareUrl: r.shareUrl ?? '', rights: r.rights || (r.sourceName ? `${r.artist ?? ''} — منبع: ${r.sourceName}` : ''),
  audio: viaProxy(r) ? `/media/stream/${r.id}` : r.audioUrl ?? '', image: coverOf(r), source: 'library', featured: !!r.isFeatured,
});

export type EpisodeRow = { id: string; title: string; audioUrl: string; durationSec: number | null; artwork: string | null; link: string | null; showTitle: string; showArtwork: string | null };
export const epToDto = (e: EpisodeRow): TrackDto => ({
  id: `ep:${e.id}`, title: e.title, artist: e.showTitle, album: 'پادکست', duration: e.durationSec ?? 0, cat: '', hue: hue(e.id),
  license: '', licenseUrl: '', shareUrl: e.link ?? '', rights: '', audio: e.audioUrl, image: e.artwork || e.showArtwork || '', source: 'podcast', featured: false,
});

export const playable = (r: TracksRecordType) => r.status === 'published' && !!r.audioUrl && /^(https:\/\/|\/uploads\/)/.test(r.audioUrl);

const EP_SQL = `SELECT e.id, e."title", e."audioUrl", e."durationSec", e."artwork", e."link", s."title" AS "showTitle", s."artwork" AS "showArtwork"
  FROM "PodcastEpisodes" e JOIN "PodcastEpisodesPodcastShows" l ON l."podcastEpisodesId" = e.id JOIN "PodcastShows" s ON s.id = l."podcastShowsId"`;

export function rowToEpisode(r: Record<string, unknown>): EpisodeRow {
  return {
    id: String(r.id), title: String(r.title ?? ''), audioUrl: String(r.audioUrl ?? ''), durationSec: r.durationSec == null ? null : Number(r.durationSec),
    artwork: r.artwork ? String(r.artwork) : null, link: r.link ? String(r.link) : null, showTitle: String(r.showTitle ?? ''), showArtwork: r.showArtwork ? String(r.showArtwork) : null,
  };
}

export async function episodesForShow(showId: string) {
  const { rows } = await zite.sql({ query: `${EP_SQL} WHERE s.id = $1 ORDER BY e."publishedAt" DESC NULLS LAST LIMIT 200`, params: [showId] });
  return rows.map(rowToEpisode).filter((e) => e.audioUrl);
}

/** Resolves stored keys back to tracks. Missing / unpublished ones map to null. */
export async function resolveKeys(keys: string[]): Promise<Map<string, TrackDto | null>> {
  const out = new Map<string, TrackDto | null>(keys.map((k) => [k, null]));
  const lib = keys.filter((k) => k.startsWith('lib:')).map((k) => k.slice(4));
  const ep = keys.filter((k) => k.startsWith('ep:')).map((k) => k.slice(3));
  if (lib.length) {
    const { records } = await zite.tracks.findAll({ filters: { id: { in: lib } }, limit: 2000 });
    for (const r of records) if (playable(r)) out.set(`lib:${r.id}`, libToDto(r));
  }
  if (ep.length) {
    const { rows } = await zite.sql({ query: `${EP_SQL} WHERE e.id = ANY($1)`, params: [ep] });
    for (const r of rows) { const e = rowToEpisode(r); if (e.audioUrl) out.set(`ep:${e.id}`, epToDto(e)); }
  }
  return out;
}
