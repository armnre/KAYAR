import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireStaff } from '../server/rbac';
import { tokenField } from '../server/util';
import { assertPublicUrl, safeFetchText } from '../server/guard';
import { parseFeed } from '../server/rss';
import { syncShow } from '../server/podcasts';

export default createEndpoint({
  description: 'Admin: list, add (from RSS/Atom feed), resync or delete podcast shows',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['list', 'add', 'sync', 'delete']),
    id: z.string().optional(),
    feedUrl: z.string().max(2000).optional(),
    category: z.enum(['fitness', 'running', 'focus', 'recovery', 'nutrition']).optional(),
  }),
  outputSchema: z.object({
    shows: z.array(z.object({ id: z.string(), title: z.string(), feedUrl: z.string(), category: z.string(), lastSynced: z.string().nullable(), syncError: z.string(), episodeCount: z.number() })),
    message: z.string().nullable(),
  }),
  execute: async ({ input }) => {
    await requireStaff(input.token, 'morshed.manage');
    let message: string | null = null;
    if (input.action === 'add' && input.feedUrl) {
      const url = assertPublicUrl(input.feedUrl).toString();
      const dup = await zite.podcastShows.findOne({ filters: { feedUrl: url } });
      if (dup) message = 'این فید قبلاً اضافه شده است.';
      else {
        // Validate it is a real feed before storing it
        const { text } = await safeFetchText(url, { maxBytes: 15_000_000, accept: /xml|rss|atom|text\/plain|octet-stream/i });
        const feed = (() => { try { return parseFeed(text); } catch { return null; } })();
        if (!feed) message = 'این آدرس فید RSS/Atom معتبر نیست.';
        else {
          const show = await zite.podcastShows.create({ record: { title: feed.title || url, feedUrl: url, category: input.category ?? 'fitness' } });
          const r = await syncShow(show.id);
          message = r.error ? `اضافه شد ولی همگام‌سازی خطا داد: ${r.error}` : `اضافه شد — ${r.added} قسمت.`;
        }
      }
    }
    if (input.action === 'sync' && input.id) {
      const r = await syncShow(input.id);
      message = r.error ? `خطا: ${r.error}` : `${r.added} قسمت جدید.`;
    }
    if (input.action === 'delete' && input.id) {
      const { records } = await zite.podcastEpisodes.findAll({ filters: { show: input.id }, limit: 2000, fields: ['title'] });
      for (const e of records) await zite.podcastEpisodes.delete({ id: e.id });
      await zite.podcastShows.delete({ id: input.id });
    }
    const { rows } = await zite.sql({
      query: `SELECT s.id, s."title", s."feedUrl", s."category", s."lastSynced", s."syncError", COUNT(l."podcastEpisodesId")::int AS n
              FROM "PodcastShows" s LEFT JOIN "PodcastEpisodesPodcastShows" l ON l."podcastShowsId" = s.id GROUP BY s.id ORDER BY s.created_at`,
    });
    return {
      message,
      shows: rows.map((r) => ({
        id: String(r.id), title: String(r.title ?? ''), feedUrl: String(r.feedUrl ?? ''), category: String(r.category ?? ''),
        lastSynced: r.lastSynced ? new Date(String(r.lastSynced)).toISOString() : null, syncError: String(r.syncError ?? ''), episodeCount: Number(r.n ?? 0),
      })),
    };
  },
});
