import { z } from 'zod';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireSession } from '../server/rbac';
import { tokenField } from '../server/util';
import { syncShow } from '../server/podcasts';
import { trackDto, epToDto, episodesForShow } from '../server/tracks';

const STALE_MS = 6 * 3600 * 1000;
const showOut = z.object({ id: z.string(), title: z.string(), author: z.string(), artwork: z.string(), category: z.string(), language: z.string(), description: z.string(), episodeCount: z.number(), syncError: z.string() });

export default createEndpoint({
  description: 'Morshed podcasts for signed-in members: show list, or one show with its episodes (refreshes stale RSS)',
  inputSchema: z.object({ token: tokenField, showId: z.string().optional() }),
  outputSchema: z.object({ shows: z.array(showOut), show: showOut.nullable(), episodes: z.array(trackDto) }),
  execute: async ({ input }) => {
    await requireSession(input.token);
    if (input.showId) {
      let show = await zite.podcastShows.findOne({ id: input.showId });
      if (!show) throw new ZiteError({ code: 'NOT_FOUND', message: 'show', userFacingMessage: 'این پادکست پیدا نشد.' });
      const last = show.lastSynced ? new Date(show.lastSynced).getTime() : 0;
      if (Date.now() - last > STALE_MS) { await syncShow(show.id); show = (await zite.podcastShows.findOne({ id: show.id })) ?? show; }
      const eps = await episodesForShow(show.id);
      return {
        shows: [], episodes: eps.map(epToDto),
        show: { id: show.id, title: show.title ?? '', author: show.author ?? '', artwork: show.artwork ?? '', category: show.category ?? '', language: show.language ?? 'en', description: show.description ?? '', episodeCount: eps.length, syncError: show.syncError ?? '' },
      };
    }
    const { rows } = await zite.sql({
      query: `SELECT s.id, s."title", s."author", s."artwork", s."category", s."language", s."description", s."syncError", COUNT(l."podcastEpisodesId")::int AS n
              FROM "PodcastShows" s LEFT JOIN "PodcastEpisodesPodcastShows" l ON l."podcastShowsId" = s.id WHERE s."syncError" IS NULL OR s."syncError" = '' OR EXISTS (SELECT 1 FROM "PodcastEpisodesPodcastShows" x WHERE x."podcastShowsId" = s.id) GROUP BY s.id ORDER BY n DESC`,
    });
    return {
      show: null, episodes: [],
      shows: rows.map((r) => ({ id: String(r.id), title: String(r.title ?? ''), author: String(r.author ?? ''), artwork: String(r.artwork ?? ''), category: String(r.category ?? ''), language: String(r.language ?? 'en'), description: String(r.description ?? ''), episodeCount: Number(r.n ?? 0), syncError: String(r.syncError ?? '') })),
    };
  },
});
