import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { requireStaff } from '../server/rbac';
import { tokenField } from '../server/util';
import { bad } from '../server/content';
import { audit } from '../server/audit';
import { searchPodcasts, addPodcast, addPodcasts, previewPodcast, syncAllShows, searchMusic, queueMusic } from '../server/scout';

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
  sourceName: z.string(), sourceUrl: z.string(), status: z.enum(['ok', 'duplicate', 'rejected', 'unreachable']), reason: z.string(), quality: z.number(), row,
});

export default createEndpoint({
  description: 'Admin: advanced Morshed discovery — scored podcast search, add by link, bulk sync, and open-licence music search into the review queue',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['podcastSearch', 'podcastAdd', 'podcastAddMany', 'podcastPreview', 'syncAll', 'musicSearch', 'musicQueue']),
    query: z.string().max(200).optional(),
    lang: z.enum(['fa', 'en', 'any']).optional(),
    probe: z.boolean().optional(),
    url: z.string().max(2000).optional(),
    category: z.enum(['fitness', 'running', 'focus', 'recovery', 'nutrition']).optional(),
    minSec: z.number().int().min(0).max(3600).optional(),
    maxSec: z.number().int().min(0).max(3600).optional(),
    rows: z.array(row).max(100).optional(),
    publish: z.boolean().optional(),
    urls: z.array(z.string().max(2000)).max(20).optional(),
    minEpisodes: z.number().int().min(0).max(1000).optional(),
    activeOnly: z.boolean().optional(),
    sources: z.array(z.enum(['openverse', 'ccmixter', 'archive'])).max(3).optional(),
    style: z.string().max(40).optional(),
  }),
  outputSchema: z.object({
    podcasts: z.array(podcast).optional(),
    music: z.array(music).optional(),
    message: z.string().optional(),
    log: z.array(z.string()).optional(),
    preview: z.object({ feedUrl: z.string(), title: z.string(), description: z.string(), episodes: z.array(z.object({ title: z.string(), audioUrl: z.string(), publishedAt: z.string().nullable(), durationSec: z.number().nullable() })) }).optional(),
    sync: z.object({ shows: z.number(), newEpisodes: z.number(), failed: z.array(z.string()) }).optional(),
  }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'morshed.manage');
    switch (input.action) {
      case 'podcastSearch': {
        if (!input.query?.trim()) throw bad('عبارت جست‌وجو را بنویس.');
        return { podcasts: await searchPodcasts(input.query.trim(), { lang: input.lang, probe: input.probe, minEpisodes: input.minEpisodes, activeOnly: input.activeOnly }) };
      }
      case 'podcastAdd': {
        if (!input.url) throw bad('آدرس را وارد کن.');
        try {
          const r = await addPodcast(input.url, input.category ?? 'fitness');
          if (r.added) await audit(member.id, 'morshed.podcast.add', 'show', input.url, {});
          return { message: r.message };
        } catch (e) { throw bad((e as Error).message || 'افزودن انجام نشد.'); }
      }
      case 'podcastAddMany': {
        if (!input.urls?.length) throw bad('پادکستی انتخاب نشده.');
        const r = await addPodcasts(input.urls, input.category ?? 'fitness');
        if (r.added) await audit(member.id, 'morshed.podcast.addMany', 'show', '', { count: r.added });
        return { message: r.message };
      }
      case 'podcastPreview': {
        if (!input.url) throw bad('آدرس را وارد کن.');
        try { return { preview: await previewPodcast(input.url) }; } catch (e) { throw bad((e as Error).message || 'فید خوانده نشد.'); }
      }
      case 'syncAll': {
        const sync = await syncAllShows();
        await audit(member.id, 'morshed.podcast.syncAll', 'show', '', { shows: sync.shows, newEpisodes: sync.newEpisodes });
        return { sync };
      }
      case 'musicSearch': {
        if (!input.query?.trim()) throw bad('عبارت جست‌وجو را بنویس.');
        const r = await searchMusic(input.query.trim(), { probe: input.probe, minSec: input.minSec, maxSec: input.maxSec, sources: input.sources });
        return { music: r.hits, log: r.log };
      }
      case 'musicQueue': {
        const n = await queueMusic(input.rows ?? [], !!input.publish, input.style);
        await audit(member.id, 'morshed.scout.queue', 'track', '', { count: n, publish: !!input.publish });
        return { message: `${n} ترک ${input.publish ? 'منتشر شد' : 'به صف بررسی اضافه شد'}.` };
      }
    }
  },
});
