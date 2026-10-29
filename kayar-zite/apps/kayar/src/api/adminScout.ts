import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { requireStaff } from '../server/rbac';
import { tokenField } from '../server/util';
import { bad } from '../server/content';
import { audit } from '../server/audit';
import { searchPodcasts, addPodcast, syncAllShows, searchMusic, queueMusic } from '../server/scout';

const row = z.object({
  title: z.string().max(200), artist: z.string().max(200), album: z.string().max(200), art: z.string().max(2000), audioUrl: z.string().max(2000),
  dur: z.number(), bitrate: z.number(), style: z.string().optional(), lang: z.enum(['fa', 'en']), text: z.string().max(2000),
  sourceId: z.string().max(300), sourceName: z.string().max(120), sourceUrl: z.string().max(2000), license: z.string().max(500),
});
const podcast = z.object({
  feedUrl: z.string(), title: z.string(), author: z.string(), artwork: z.string().nullable(), sources: z.array(z.string()),
  lang: z.enum(['fa', 'en', 'other']), episodes: z.number(), lastEpisodeAt: z.string().nullable(), avgMinutes: z.number().nullable(),
  score: z.number(), issues: z.array(z.string()), known: z.boolean(), ok: z.boolean(),
});
const music = z.object({
  id: z.string(), title: z.string(), artist: z.string(), art: z.string(), audioUrl: z.string(), durationSec: z.number(), license: z.string(),
  sourceName: z.string(), sourceUrl: z.string(), status: z.enum(['ok', 'duplicate', 'rejected', 'unreachable']), reason: z.string(), row,
});

export default createEndpoint({
  description: 'Admin: advanced Morshed discovery — scored podcast search, add by link, bulk sync, and open-licence music search into the review queue',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['podcastSearch', 'podcastAdd', 'syncAll', 'musicSearch', 'musicQueue']),
    query: z.string().max(200).optional(),
    lang: z.enum(['fa', 'en', 'any']).optional(),
    probe: z.boolean().optional(),
    url: z.string().max(2000).optional(),
    category: z.enum(['fitness', 'running', 'focus', 'recovery', 'nutrition']).optional(),
    minSec: z.number().int().min(0).max(3600).optional(),
    maxSec: z.number().int().min(0).max(3600).optional(),
    rows: z.array(row).max(100).optional(),
    publish: z.boolean().optional(),
  }),
  outputSchema: z.object({
    podcasts: z.array(podcast).optional(),
    music: z.array(music).optional(),
    message: z.string().optional(),
    sync: z.object({ shows: z.number(), newEpisodes: z.number(), failed: z.array(z.string()) }).optional(),
  }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'morshed.manage');
    switch (input.action) {
      case 'podcastSearch': {
        if (!input.query?.trim()) throw bad('عبارت جست‌وجو را بنویس.');
        return { podcasts: await searchPodcasts(input.query.trim(), { lang: input.lang, probe: input.probe }) };
      }
      case 'podcastAdd': {
        if (!input.url) throw bad('آدرس را وارد کن.');
        try {
          const r = await addPodcast(input.url, input.category ?? 'fitness');
          if (r.added) await audit(member.id, 'morshed.podcast.add', 'show', input.url, {});
          return { message: r.message };
        } catch (e) { throw bad((e as Error).message || 'افزودن انجام نشد.'); }
      }
      case 'syncAll': {
        const sync = await syncAllShows();
        await audit(member.id, 'morshed.podcast.syncAll', 'show', '', { shows: sync.shows, newEpisodes: sync.newEpisodes });
        return { sync };
      }
      case 'musicSearch': {
        if (!input.query?.trim()) throw bad('عبارت جست‌وجو را بنویس.');
        return { music: await searchMusic(input.query.trim(), { probe: input.probe, minSec: input.minSec, maxSec: input.maxSec }) };
      }
      case 'musicQueue': {
        const n = await queueMusic(input.rows ?? [], !!input.publish);
        await audit(member.id, 'morshed.scout.queue', 'track', '', { count: n, publish: !!input.publish });
        return { message: `${n} ترک ${input.publish ? 'منتشر شد' : 'به صف بررسی اضافه شد'}.` };
      }
    }
  },
});
