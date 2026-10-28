import { zite } from 'zitejs/db';
import type { ShopItemsRecordType, ShopPartnersRecordType } from 'zitejs/db';

export const SHOP_CATEGORIES: Record<string, string> = { tshirt: 'تی‌شرت', polo: 'پولوشرت', set: 'ست ورزشی', tracksuit: 'گرمکن', equipment: 'تجهیزات', supplement: 'مکمل', other: 'سایر' };
export const BADGES = ['', 'new', 'bestseller', 'sponsor'] as const;

/** Official Kapoosh store from env; empty means "coming soon" for own items without their own link. */
export const storeUrl = () => { const u = (process.env.KAPOOSH_STORE_URL ?? '').trim(); return /^https?:\/\//i.test(u) ? u : ''; };

export function isLive(i: ShopItemsRecordType, now = Date.now()) {
  if (!i.active) return false;
  if (i.startsAt && new Date(i.startsAt).getTime() > now) return false;
  if (i.endsAt && new Date(i.endsAt).getTime() < now) return false;
  return true;
}

/** Destination comes only from the database; never from the request. Returns '' when not linkable. */
export function destination(i: ShopItemsRecordType, p?: ShopPartnersRecordType) {
  const raw = (i.targetUrl || (p?.type === 'own' ? storeUrl() : p?.url) || '').trim();
  let u: URL;
  try { u = new URL(raw); } catch { return ''; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
  if (u.username || u.password) return '';
  if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'kayar');
  if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'referral');
  if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', 'kayar_shop');
  return u.toString();
}

const SEED_PARTNER = { seedKey: 'kapoosh', name: 'کاپوش', type: 'own', logo: '/brand/logo-mark.svg', url: '', description: 'برند پوشاک ورزشی کاپوش', active: true };
const SEED_ITEMS = [
  { seedKey: 'p-set-pink', title: 'ست ورزشی یقه‌زیپ صورتی', category: 'set', image: '/brand/products/kapoosh-sport-set-pink.webp', badge: 'new' },
  { seedKey: 'p-tracksuit', title: 'ست گرمکن سه‌رنگ', category: 'tracksuit', image: '/brand/products/kapoosh-tracksuit-navy-mustard.webp', badge: '' },
  { seedKey: 'p-tee-colors', title: 'تی‌شرت ورزشی رنگی', category: 'tshirt', image: '/brand/products/kapoosh-sport-tee-colors.webp', badge: 'bestseller' },
  { seedKey: 'p-tee-striped', title: 'تی‌شرت راه‌راه ریز', category: 'tshirt', image: '/brand/products/kapoosh-tee-striped.webp', badge: '' },
  { seedKey: 'p-polo-striped', title: 'پولوشرت راه‌راه', category: 'polo', image: '/brand/products/kapoosh-polo-striped.webp', badge: '' },
  { seedKey: 'p-polo-textured', title: 'پولوشرت بافت‌دار', category: 'polo', image: '/brand/products/kapoosh-polo-textured.webp', badge: '' },
];

/** Idempotent: inserts the Kapoosh partner + 6 real products only when their seedKey is missing. Never overwrites admin edits. */
export async function seedShop() {
  let partner = await zite.shopPartners.findOne({ filters: { seedKey: 'kapoosh' } });
  if (!partner) partner = await zite.shopPartners.create({ record: SEED_PARTNER });
  let added = 0;
  for (const [i, s] of SEED_ITEMS.entries()) {
    if (await zite.shopItems.findOne({ filters: { seedKey: s.seedKey } })) continue;
    await zite.shopItems.create({ record: { ...s, partnerId: partner.id, currency: 'IRT', sort: i + 1, active: true, featured: true, showInLanding: true, showInApp: true, tags: '', targetUrl: '', description: '' } });
    added++;
  }
  return added;
}
