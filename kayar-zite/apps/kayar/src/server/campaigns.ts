import { z } from 'zod';
import type { CampaignsRecordType } from 'zitejs/db';

export const campaignDto = z.object({
  id: z.string(), title: z.string(), subtitle: z.string(), body: z.string(), kind: z.string(), brand: z.string(), imageUrl: z.string(),
  badge: z.string(), ctaLabel: z.string(), link: z.string(), price: z.string(), oldPrice: z.string(), discountCode: z.string(),
  theme: z.string(), placements: z.array(z.string()), status: z.string(), priority: z.number(),
  startsAt: z.string().nullable(), endsAt: z.string().nullable(), impressions: z.number(), clicks: z.number(), created: z.string().nullable(),
  gallery: z.array(z.string()), features: z.array(z.string()), specs: z.array(z.object({ k: z.string(), v: z.string() })), terms: z.string(),
  amount: z.number(), stock: z.number().nullable(), sold: z.number(), purchasable: z.boolean(), videoUrl: z.string(), location: z.string(),
  sponsorLogo: z.string(), sponsorWebsite: z.string(),
  actionType: z.string(), partnerName: z.string(), partnerApiUrl: z.string(), uniqueCodes: z.boolean(),
});
export type CampaignDto = z.infer<typeof campaignDto>;

const lines = (s?: string) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

export const toCampaign = (r: CampaignsRecordType): CampaignDto => ({
  id: r.id, title: r.title ?? '', subtitle: r.subtitle ?? '', body: r.body ?? '', kind: r.kind ?? 'campaign', brand: r.brand ?? '',
  imageUrl: r.imageUrl ?? '', badge: r.badge ?? '', ctaLabel: r.ctaLabel ?? '', link: r.link ?? '', price: r.price ?? '', oldPrice: r.oldPrice ?? '',
  discountCode: r.discountCode ?? '', theme: r.theme ?? 'lime', placements: r.placements ?? [], status: r.status ?? 'draft', priority: r.priority ?? 0,
  startsAt: r.startsAt ?? null, endsAt: r.endsAt ?? null, impressions: r.impressions ?? 0, clicks: r.clicks ?? 0, created: r.created ?? null,
  gallery: lines(r.gallery), features: lines(r.features),
  specs: lines(r.specs).map((l) => { const i = l.indexOf(':'); return i > 0 ? { k: l.slice(0, i).trim(), v: l.slice(i + 1).trim() } : { k: l, v: '' }; }),
  terms: r.terms ?? '', amount: r.amount ?? 0, stock: r.stock ?? null, sold: r.sold ?? 0, purchasable: !!r.purchasable,
  videoUrl: r.videoUrl ?? '', location: r.location ?? '', sponsorLogo: r.sponsorLogo ?? '', sponsorWebsite: r.sponsorWebsite ?? '',
  actionType: r.actionType ?? (r.purchasable ? 'buy' : r.discountCode ? 'code' : 'info'), partnerName: r.partnerName ?? '', partnerApiUrl: r.partnerApiUrl ?? '', uniqueCodes: !!r.uniqueCodes,
});

/** Live = active, inside its schedule window. */
export const isLive = (c: CampaignDto, now = Date.now()) =>
  c.status === 'active' && (!c.startsAt || new Date(c.startsAt).getTime() <= now) && (!c.endsAt || new Date(c.endsAt).getTime() > now);
