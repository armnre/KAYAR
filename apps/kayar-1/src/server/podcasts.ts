import { zite } from 'zitejs/db';
import { safeFetchText } from './guard';
import { parseFeed } from './rss';

/** Fetches a show's feed and upserts episodes (dedupe by guid). A failure is recorded on the show, never thrown to listeners. */
export async function syncShow(showId: string): Promise<{ added: number; error: string | null }> {
  const show = await zite.podcastShows.findOne({ id: showId });
  if (!show?.feedUrl) return { added: 0, error: 'no feed' };
  try {
    const { text } = await safeFetchText(show.feedUrl, { maxBytes: 15_000_000, accept: /xml|rss|atom|text\/plain|octet-stream/i });
    const feed = parseFeed(text);
    const latest = feed.episodes.slice(0, 60);
    const { records: existing } = await zite.podcastEpisodes.findAll({ filters: { show: showId }, limit: 2000, fields: ['guid'] });
    const known = new Set(existing.map((e) => e.guid));
    const fresh = latest.filter((e) => !known.has(e.guid));
    for (let i = 0; i < fresh.length; i += 100) {
      await zite.podcastEpisodes.bulkCreate({
        records: fresh.slice(i, i + 100).map((e) => ({
          title: e.title, show: showId, guid: e.guid, audioUrl: e.audioUrl, description: e.description,
          publishedAt: e.publishedAt, durationSec: e.durationSec, artwork: e.artwork, link: e.link,
        })),
      });
    }
    await zite.podcastShows.update({
      id: showId,
      record: {
        title: feed.title || show.title || 'پادکست',
        description: feed.description || show.description || '',
        author: feed.author || show.author || '',
        artwork: feed.artwork || show.artwork || null,
        lastSynced: new Date().toISOString(),
        syncError: '',
      },
    });
    return { added: fresh.length, error: null };
  } catch (e) {
    const msg = ((e as { userFacingMessage?: string }).userFacingMessage ?? (e as Error).message ?? 'sync failed').slice(0, 200);
    console.error(JSON.stringify({ msg: 'feed sync failed', showId, error: msg }));
    await zite.podcastShows.update({ id: showId, record: { syncError: msg, lastSynced: new Date().toISOString() } });
    return { added: 0, error: msg };
  }
}
