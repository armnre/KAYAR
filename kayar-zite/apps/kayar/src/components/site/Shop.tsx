import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Handshake, BadgePercent } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { appCampaigns, type AppCampaignsOutputType } from 'zitejs/api';
import { KButton, Glass } from '../kit';
import { SectionHead } from './Sections';
import { usePublicSettings } from '../../lib/publicData';
import { KAPOOSH } from '../../lib/assets';

type Offer = AppCampaignsOutputType['items'][0];
const INTERNAL = ['buy', 'code', 'register', 'claim'];
const isHttps = (u: string) => /^https:\/\/[^\s]+$/.test(u);
/** Offers worth showing: titled, and either handled inside KAYAR or pointing to a valid seller URL. */
const usable = (o: Offer) => !!o.title && (INTERNAL.includes(o.actionType) || isHttps(o.link));

function useOffers() {
  const [items, setItems] = useState<Offer[]>([]);
  useEffect(() => {
    let on = true;
    appCampaigns({ action: 'list', placement: 'home' }).then((r) => on && setItems(r.items.filter(usable))).catch(() => on && setItems([]));
    return () => { on = false; };
  }, []);
  return items;
}

function ShopBanner({ url }: { url?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-l from-bg1 via-background to-bg1 p-6 sm:p-10">
      <div className="pointer-events-none absolute -start-20 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-[100px]" aria-hidden />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <img src={KAPOOSH.logo} alt="KAPOOSH" width={137} height={46} className="h-10 w-auto sm:h-12" />
          <h3 className="mt-5 text-[clamp(1.4rem,3.5vw,2.25rem)] font-black leading-tight">پوشاک ورزشی <span className="text-primary">کاپوش</span></h3>
          <p className="mt-2 max-w-lg text-[16px] leading-[1.9] text-muted-foreground">ست‌های ورزشی، تی‌شرت و پولوشرت با پارچه‌ی سبک و دوخت دقیق؛ همراه تمرین‌های کایار.</p>
        </div>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="press tap inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-8 font-bold text-primary-foreground">مشاهده‌ی فروشگاه <ExternalLink className="h-4 w-4" /></a>}
      </div>
    </div>
  );
}

function ProductGrid({ url }: { url?: string }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      {KAPOOSH.products.map((p) => (
        <a key={p.img} href={url} target="_blank" rel="noopener noreferrer" aria-disabled={!url} className={cn('glass press group overflow-hidden rounded-[24px]', !url && 'pointer-events-none')}>
          <div className="aspect-[4/5] overflow-hidden bg-white/[.03]">
            <img src={p.img} alt={p.name} width={240} height={300} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          </div>
          <div className="p-4">
            <h4 className="font-extrabold leading-7 group-hover:text-primary">{p.name}</h4>
            <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-muted-foreground">{p.desc}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-primary">در فروشگاه <ArrowLeft className="h-3.5 w-3.5" /></span>
          </div>
        </a>
      ))}
    </div>
  );
}

function OfferCard({ o }: { o: Offer }) {
  const inner = (
    <>
      {o.imageUrl && <div className="aspect-[16/10] overflow-hidden"><img src={o.imageUrl} alt={o.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>}
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">{o.partnerName || o.brand}{o.badge && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{o.badge}</span>}</div>
        <h4 className="mt-1 text-lg font-extrabold leading-8 group-hover:text-primary">{o.title}</h4>
        {o.subtitle && <p className="mt-1 line-clamp-2 text-[14px] text-muted-foreground">{o.subtitle}</p>}
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">{o.ctaLabel || 'مشاهده'} <ArrowLeft className="h-4 w-4" /></span>
      </div>
    </>
  );
  const cls = 'glass press group block overflow-hidden rounded-[24px]';
  return INTERNAL.includes(o.actionType)
    ? <Link to={`/app/picks/${o.id}`} className={cls}>{inner}</Link>
    : <a href={o.link} target="_blank" rel="noopener noreferrer sponsored" className={cls}>{inner}</a>;
}

export function ShopSection() {
  const st = usePublicSettings();
  const offers = useOffers();
  const [tab, setTab] = useState<'shop' | 'partners'>('shop');
  const url = st?.shopUrl || undefined;
  const tabs = [{ k: 'shop' as const, l: 'فروشگاه کاپوش' }, ...(offers.length ? [{ k: 'partners' as const, l: 'پیشنهاد شرکا' }] : [])];
  return (
    <section id="shop" className="relative scroll-mt-20 px-4 py-20 md:py-28">
      <SectionHead eyebrow="KAPOOSH" title="فروشگاه و" accent="پیشنهادها" text="لباس ورزشی کاپوش و پیشنهادهای ویژه‌ی همکاران کایار." />
      <div className="mx-auto max-w-6xl">
        {tabs.length > 1 && <div className="mb-6 flex justify-center gap-2" role="tablist">
          {tabs.map((t) => <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)} className={cn('press tap rounded-full px-5 text-[15px] font-bold transition-colors', tab === t.k ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:text-foreground')}>{t.l}</button>)}
        </div>}
        {tab === 'shop' || !offers.length
          ? <div className="reveal"><ShopBanner url={url} /><ProductGrid url={url} /></div>
          : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{offers.map((o) => <OfferCard key={o.id} o={o} />)}</div>}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Glass className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3"><Handshake className="h-6 w-6 shrink-0 text-primary" /><span className="font-extrabold">فروشنده یا اسپانسر هستید؟</span></div>
            <KButton variant="outline" to="/p/contact">همکاری</KButton>
          </Glass>
          <Glass className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3"><BadgePercent className="h-6 w-6 shrink-0 text-primary" /><span className="font-extrabold">کدهای تخفیف اعضا</span></div>
            <KButton variant="outline" to="/app">ورود به حساب</KButton>
          </Glass>
        </div>
      </div>
    </section>
  );
}
