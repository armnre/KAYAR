import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { requireStaff } from '../server/rbac';
import { tokenField } from '../server/util';
import { bad } from '../server/content';
import { audit } from '../server/audit';
import { importPodcasts, PODCAST_TERMS } from '../server/discover';
import { getSources, setSource, startImport, getJob, getAuto, setAuto, getMirror } from '../server/music/importer';
import { EXCLUDED } from '../server/music/adapters';

const job = z.object({ running: z.boolean(), startedAt: z.string(), finishedAt: z.string().optional(), source: z.string(), target: z.number(), scanned: z.number(), added: z.number(), rejected: z.number(), log: z.array(z.string()), error: z.string().optional() });

export default createEndpoint({
  description: 'Admin: manage Morshed music sources, run imports into the review queue, and discover podcasts',
  inputSchema: z.object({
    token: tokenField,
    action: z.enum(['state', 'setSource', 'import', 'podcasts', 'setAuto']).default('state'),
    sourceId: z.string().max(40).optional(),
    enabled: z.boolean().optional(),
    acceptLicense: z.boolean().optional(),
    sourceIds: z.array(z.string().max(40)).max(10).optional(),
    target: z.number().int().min(1).max(300).optional(),
    autoPublishOpen: z.boolean().optional(),
    auto: z.object({ enabled: z.boolean(), hour: z.number().int().min(0).max(23), target: z.number().int().min(5).max(300), autoPublishOpen: z.boolean() }).optional(),
  }),
  outputSchema: z.object({
    sources: z.array(z.object({ id: z.string(), name: z.string(), site: z.string(), note: z.string(), openLicense: z.boolean(), enabled: z.boolean(), acceptedBy: z.string(), acceptedAt: z.string() })),
    excluded: z.array(z.object({ name: z.string(), reason: z.string() })),
    job: job.nullable(),
    podcasts: z.object({ added: z.number(), failed: z.array(z.string()) }).optional(),
    auto: z.object({ enabled: z.boolean(), hour: z.number(), target: z.number(), autoPublishOpen: z.boolean(), lastRun: z.string() }),
    mirror: z.object({ files: z.number(), mb: z.number(), budgetMb: z.number(), pending: z.number(), failed: z.number(), at: z.string() }),
  }),
  execute: async ({ input }) => {
    const { member } = await requireStaff(input.token, 'morshed.manage');
    let podcasts: { added: number; failed: string[] } | undefined;
    if (input.action === 'setSource') {
      if (!input.sourceId || input.enabled === undefined) throw bad('منبع مشخص نیست.');
      try { await setSource(input.sourceId, input.enabled, member.id, !!input.acceptLicense); }
      catch { throw bad('برای فعال کردن این منبع باید مسئولیت مجوز را بپذیری.'); }
      await audit(member.id, input.enabled ? 'morshed.source.enable' : 'morshed.source.disable', 'source', input.sourceId, { acceptedLicense: !!input.acceptLicense });
    } else if (input.action === 'import') {
      try { await startImport(input.sourceIds ?? [], input.target ?? 50, { autoPublishOpen: !!input.autoPublishOpen }); }
      catch (e) { throw bad((e as Error).message === 'busy' ? 'یک import در حال اجراست؛ صبر کن تا تمام شود.' : 'هیچ منبع فعالی انتخاب نشده است.'); }
      await audit(member.id, 'morshed.import', 'track', '', { sources: input.sourceIds, target: input.target });
    } else if (input.action === 'setAuto') {
      if (!input.auto) throw bad('تنظیمات ناقص است.');
      await setAuto(input.auto);
      await audit(member.id, 'morshed.auto', 'source', '', input.auto);
    } else if (input.action === 'podcasts') {
      podcasts = await importPodcasts(PODCAST_TERMS, 4);
    }
    return { sources: await getSources(), excluded: EXCLUDED, job: await getJob(), podcasts, auto: await getAuto(), mirror: await getMirror() };
  },
});
