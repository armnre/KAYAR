import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { appCampaigns, type AppCampaignsOutputType } from 'zitejs/api';
import { ArrowLeft, Copy, ExternalLink, Sparkles, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@project/components/lib/utils';
import { Skeleton } from '@project/components/ui/skeleton';

type C = AppCampaignsOutputType['items'][0];
export const THEMES: Record<string, string> = {
  lime: 'from-[hsl(71_100%_50%)] via-[hsl(90_70%_32%)] to-[hsl(150_40%_10%)]',
  sunset: 'from-[hsl(28_100%_58%)] via-[hsl(340_80%_45%)] to-[hsl(280_50%_14%)]',
  ocean: 'from-[hsl(190_90%_50%)] via-[hsl(215_80%_40%)] to-[hsl(230_50%_12%)]',
  royal: 'from-[hsl(45_100%_60%)] via-[hsl(30_70%_38%)] to-[hsl(20_40%_10%)]',
  mono: 'from-[hsl(0_0%_45%)] via-[hsl(0_0%_18%)] to-[hsl(0_0%_5%)]',
};
export const KIND: Record<string, string> = { campaign: 'کمپین', product: 'محصول', brand: 'برند', offer: 'تخفیف', event: 'رویداد' };
const seen = new Set<string>();
const track = (id: string, event: 'view' | 'click') => appCampaigns({ action: 'track', id, event }).catch(() => {});

function CtaLink({ c, className, children }: { c: C; className: string; children: React.ReactNode }) {
  const onClick = () => track(c.id, 'click');
  if (!c.link) return <div className={className}>{children}</div>;
  return c.link.startsWith('/') ? <Link to={c.link} onClick={onClick} className={className}>{children}</Link>
    : <a href={c.link} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>{children}</a>;
}

export function CampaignCard({ c, big }: { c: C; big?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el || seen.has(c.id)) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !seen.has(c.id)) { seen.add(c.id); track(c.id, 'view'); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
  }, [c.id]);
  const copy = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(c.discountCode).then(() => toast.success('کد تخفیف کپی شد')); };
  return (
    <div ref={ref} className={cn('relative shrink-0 snap-center overflow-hidden rounded-[30px] bg-gradient-to-br text-white shadow-[0_24px_50px_-24px_rgba(0,0,0,.8)]', THEMES[c.theme] ?? THEMES.lime, big ? 'h-[300px] w-[86%] sm:w-[62%]' : 'h-[230px] w-[70%] sm:w-[40%]')}>
      {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-luminosity" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute -end-12 -top-12 h-40 w-40 rounded-full border-[22px] border-white/10" />
      <CtaLink c={c} className="relative flex h-full flex-col p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black backdrop-blur">{KIND[c.kind] ?? 'ویژه'}</span>
          {c.badge && <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-black text-primary-foreground">{c.badge}</span>}
          {c.brand && <span className="ms-auto text-[11px] font-bold text-white/80">{c.brand}</span>}
        </div>
        <div className="mt-auto">
          <div className={cn('font-black leading-tight', big ? 'text-2xl' : 'text-lg')} dir="auto">{c.title}</div>
          {c.subtitle && <div className="mt-1 line-clamp-2 text-sm text-white/75" dir="auto">{c.subtitle}</div>}
          <div className="mt-3 flex items-center gap-2">
            {c.price && <span className="font-black">{c.price}</span>}
            {c.oldPrice && <span className="text-xs text-white/50 line-through">{c.oldPrice}</span>}
            {c.discountCode && <button onClick={copy} className="flex items-center gap-1 rounded-full border border-dashed border-white/50 px-2.5 py-1 text-[11px] font-black" dir="ltr"><Tag className="h-3 w-3" />{c.discountCode}<Copy className="h-3 w-3" /></button>}
            {c.link && <span className="ms-auto flex items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-black text-black">{c.ctaLabel || 'مشاهده'}{c.link.startsWith('/') ? <ArrowLeft className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}</span>}
          </div>
        </div>
      </CtaLink>
    </div>
  );
}

/** "پیشنهادات کایار" — admin-managed campaigns, ads and promoted products for a placement. */
export function KayarSuggestions({ placement = 'home' }: { placement?: 'home' | 'morshed' | 'bodyyar' }) {
  const [items, setItems] = useState<C[] | null>(null);
  useEffect(() => { appCampaigns({ action: 'list', placement }).then((r) => setItems(r.items)).catch(() => setItems([])); }, [placement]);
  if (items === null) return <div className="-mx-4 mt-3 flex gap-3 overflow-hidden px-4"><Skeleton className="h-[300px] w-[86%] shrink-0 rounded-[30px]" /></div>;
  if (!items.length) return null;
  const heroes = items.filter((c) => c.kind !== 'product'); const products = items.filter((c) => c.kind === 'product');
  return (
    <section className="mt-9">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black tracking-tight"><Sparkles className="h-5 w-5 text-primary" />پیشنهادات کایار</h2>
        <span className="text-xs font-bold text-muted-foreground">ترند این هفته</span>
      </div>
      {heroes.length > 0 && <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {heroes.map((c, i) => <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="contents"><CampaignCard c={c} big /></motion.div>)}
      </div>}
      {products.length > 0 && <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">{products.map((c) => <CampaignCard key={c.id} c={c} />)}</div>}
    </section>
  );
}
