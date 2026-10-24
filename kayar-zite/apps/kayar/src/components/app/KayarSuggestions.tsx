import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { appCampaigns, type AppCampaignsOutputType } from 'zitejs/api';
import { ArrowLeft, Sparkles, Tag, MapPin, ShoppingBag, Clock, BadgeCheck } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { Skeleton } from '@project/components/ui/skeleton';
import { toman } from '../../lib/config';

export type C = AppCampaignsOutputType['items'][0];
export const THEMES: Record<string, string> = {
  lime: 'from-[hsl(71_100%_50%)] via-[hsl(90_70%_32%)] to-[hsl(150_40%_10%)]',
  sunset: 'from-[hsl(28_100%_58%)] via-[hsl(340_80%_45%)] to-[hsl(280_50%_14%)]',
  ocean: 'from-[hsl(190_90%_50%)] via-[hsl(215_80%_40%)] to-[hsl(230_50%_12%)]',
  royal: 'from-[hsl(45_100%_60%)] via-[hsl(30_70%_38%)] to-[hsl(20_40%_10%)]',
  mono: 'from-[hsl(0_0%_45%)] via-[hsl(0_0%_18%)] to-[hsl(0_0%_5%)]',
};
export const KIND: Record<string, string> = { campaign: 'کمپین اجتماعی', product: 'محصول اسپانسری', brand: 'اسپانسر', offer: 'تخفیف ویژه', event: 'رویداد' };
const seen = new Set<string>();
export const track = (id: string, event: 'view' | 'click') => { if (id !== 'preview') appCampaigns({ action: 'track', id, event }).catch(() => {}); };
export const priceLabel = (c: C) => c.price || (c.amount ? toman(c.amount) : '');
export const discountPct = (c: C) => { const n = (s: string) => Number(s.replace(/[^\d۰-۹]/g, '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))); const a = c.amount || n(c.price); const b = n(c.oldPrice); return a && b > a ? Math.round((1 - a / b) * 100) : 0; };
export const daysLeft = (c: C) => (c.endsAt ? Math.max(0, Math.ceil((new Date(c.endsAt).getTime() - Date.now()) / 864e5)) : null);

function useView(id: string) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el || seen.has(id)) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !seen.has(id)) { seen.add(id); track(id, 'view'); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
  }, [id]);
  return ref;
}

/** Big cinematic card — campaigns, events, sponsors. */
export function CampaignCard({ c, big = true, preview }: { c: C; big?: boolean; preview?: boolean }) {
  const ref = useView(c.id); const d = daysLeft(c);
  return (
    <Link ref={ref} to={preview ? '#' : `/app/picks/${c.id}`} onClick={(e) => { if (preview) e.preventDefault(); else track(c.id, 'click'); }}
      className={cn('press group relative block shrink-0 snap-center overflow-hidden rounded-[32px] bg-gradient-to-br text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,.9)]', THEMES[c.theme] ?? THEMES.lime, big ? 'h-[340px] w-[88%] sm:w-[62%]' : 'h-[240px] w-[72%] sm:w-[40%]')}>
      {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-110" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
      <div className="pointer-events-none absolute -end-14 -top-14 h-44 w-44 rounded-full border-[26px] border-white/10" />
      <div className="relative flex h-full flex-col p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black backdrop-blur-md">{KIND[c.kind] ?? 'ویژه'}</span>
          {c.badge && <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-primary-foreground">{c.badge}</span>}
          {c.sponsorLogo ? <img src={c.sponsorLogo} alt={c.brand} className="ms-auto h-8 w-8 rounded-full bg-white object-contain p-1" /> : c.brand && <span className="ms-auto flex items-center gap-1 text-[11px] font-bold text-white/85"><BadgeCheck className="h-3.5 w-3.5" />{c.brand}</span>}
        </div>
        <div className="mt-auto">
          <div className="flex flex-wrap gap-2 text-[11px] text-white/70">
            {c.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
            {d !== null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{d === 0 ? 'آخرین روز' : `${d.toLocaleString('fa-IR')} روز مانده`}</span>}
          </div>
          <div className={cn('mt-1 font-black leading-tight', big ? 'text-[26px]' : 'text-lg')} dir="auto">{c.title}</div>
          {c.subtitle && <div className="mt-1 line-clamp-2 text-sm text-white/75" dir="auto">{c.subtitle}</div>}
          <div className="mt-4 flex items-center gap-2">
            {priceLabel(c) && <span className="font-black">{priceLabel(c)}</span>}
            {c.oldPrice && <span className="text-xs text-white/50 line-through">{c.oldPrice}</span>}
            {c.discountCode && <span className="flex items-center gap-1 rounded-full border border-dashed border-white/50 px-2.5 py-1 text-[11px] font-black" dir="ltr"><Tag className="h-3 w-3" />{c.discountCode}</span>}
            <span className="ms-auto flex items-center gap-1 rounded-full bg-white px-4 py-2.5 text-xs font-black text-black transition group-hover:gap-2">{c.ctaLabel || ({ buy: 'خرید', register: 'ثبت‌نام', code: 'دریافت کد', partner: 'دریافت کد' } as Record<string, string>)[c.actionType] || 'جزئیات'}<ArrowLeft className="h-3.5 w-3.5" /></span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Product / offer tile with image, price and discount. */
function ProductTile({ c }: { c: C }) {
  const ref = useView(c.id); const pct = discountPct(c);
  return (
    <Link ref={ref} to={`/app/picks/${c.id}`} onClick={() => track(c.id, 'click')} className="press group overflow-hidden rounded-[26px] border border-border bg-card">
      <div className={cn('relative aspect-square overflow-hidden bg-gradient-to-br', THEMES[c.theme] ?? THEMES.lime)}>
        {c.imageUrl ? <img src={c.imageUrl} alt={c.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <ShoppingBag className="absolute inset-0 m-auto h-12 w-12 text-white/80" />}
        {pct > 0 && <span className="absolute start-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-black text-white">٪{pct.toLocaleString('fa-IR')}−</span>}
        {c.badge && <span className="absolute end-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">{c.badge}</span>}
        {c.discountCode && <span className="absolute bottom-2 start-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground" dir="ltr"><Tag className="h-3 w-3" />{c.discountCode}</span>}
      </div>
      <div className="p-3">
        {c.brand && <div className="truncate text-[10px] font-bold text-muted-foreground">{c.brand}</div>}
        <div className="line-clamp-2 min-h-[2.5rem] text-sm font-black leading-5" dir="auto">{c.title}</div>
        <div className="mt-2 flex items-end justify-between gap-1">
          <div>{c.oldPrice && <div className="text-[10px] text-muted-foreground line-through">{c.oldPrice}</div>}<div className="text-sm font-black text-primary">{priceLabel(c) || KIND[c.kind]}</div></div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowLeft className="h-4 w-4" /></span>
        </div>
      </div>
    </Link>
  );
}

const FILTERS: [string, string][] = [['all', 'همه'], ['campaign', 'کمپین‌ها'], ['product', 'محصولات'], ['offer', 'تخفیف‌ها'], ['brand', 'اسپانسرها']];
const match = (c: C, f: string) => f === 'all' || c.kind === f || (f === 'campaign' && c.kind === 'event');
const isHero = (c: C) => c.kind === 'campaign' || c.kind === 'event' || c.kind === 'brand';

/** "پیشنهادات کایار" — home page only. Every card opens its own in-app detail page. */
export function KayarSuggestions() {
  const [items, setItems] = useState<C[] | null>(null);
  const [f, setF] = useState('all');
  useEffect(() => { appCampaigns({ action: 'list', placement: 'home' }).then((r) => setItems(r.items)).catch(() => setItems([])); }, []);
  if (items && !items.length) return null;
  const filters = FILTERS.filter(([k]) => k === 'all' || (items ?? []).some((c) => match(c, k)));
  const list = (items ?? []).filter((c) => match(c, f));
  const heroes = list.filter(isHero); const tiles = list.filter((c) => !isHero(c));
  return (
    <section className="relative mt-10">
      <div className="pointer-events-none absolute -top-10 start-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <p className="font-latin text-[10px] font-black tracking-[.3em] text-primary">KAYAR PICKS</p>
        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight"><Sparkles className="h-5 w-5 text-primary" />پیشنهادات کایار</h2>
        <p className="text-xs text-muted-foreground">کمپین‌ها، اسپانسرها و محصولات منتخب</p>
      </div>
      {filters.length > 2 && <div className="relative -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {filters.map(([k, l]) => <button key={k} onClick={() => setF(k)} className={cn('press relative h-9 shrink-0 rounded-full border px-4 text-xs font-black transition', f === k ? 'border-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground')}>
          {f === k && <motion.span layoutId="pickf" className="absolute inset-0 rounded-full bg-primary" />}<span className="relative">{l}</span></button>)}
      </div>}
      {items === null ? <div className="-mx-4 mt-3 flex gap-3 overflow-hidden px-4"><Skeleton className="h-[340px] w-[88%] shrink-0 rounded-[32px]" /><Skeleton className="h-[340px] w-[20%] shrink-0 rounded-[32px]" /></div> : (
        <AnimatePresence mode="wait">
          <motion.div key={f} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            {heroes.length > 0 && <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">{heroes.map((c) => <CampaignCard key={c.id} c={c} />)}</div>}
            {tiles.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{tiles.map((c) => <ProductTile key={c.id} c={c} />)}</div>}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
