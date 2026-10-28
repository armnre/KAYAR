import { useMemo, useState } from 'react';
import { Search, RefreshCw, ShoppingBag } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import SiteHeader, { useMeta } from '../components/site/SiteHeader';
import { Footer } from '../components/site/Sections';
import { KButton, StateView } from '../components/kit';
import { ShopCard } from '../components/shop/ShopCard';
import { useShop } from '../components/shop/useShop';

const norm = (s: string) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ').toLowerCase().trim();

export default function ShopPage() {
  useMeta('فروشگاه کاپوش', 'پوشاک ورزشی کاپوش و پیشنهادهای شریک‌ها و حامیان کایار.');
  const { d, err, retry } = useShop('shop');
  const [cat, setCat] = useState(''); const [kind, setKind] = useState<'' | 'own' | 'partners'>(''); const [q, setQ] = useState('');
  const list = useMemo(() => (d?.items ?? []).filter((i) => (!cat || i.category === cat) && (!kind || (kind === 'own' ? i.kind === 'own' : i.kind !== 'own')) && (!q || norm(`${i.title} ${i.partnerName} ${i.tags.join(' ')} ${i.categoryLabel}`).includes(norm(q)))), [d, cat, kind, q]);
  const chip = (on: boolean) => cn('press tap shrink-0 rounded-full px-4 text-sm font-bold transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:text-foreground');
  return (
    <div className="min-h-svh depth-bg">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-[calc(var(--header-h)+var(--safe-t)+40px)]">
        <img src="/brand/logo.svg" alt="کاپوش" width={137} height={46} className="h-10 w-auto" />
        <h1 className="mt-4 text-[clamp(2rem,6vw,3.25rem)] font-black">فروشگاه <span className="text-primary">کاپوش</span></h1>
        <p className="mt-2 text-muted-foreground">پیشنهادهای ما برای تمرین بهتر. آیتم‌های «حامی» و «همکار» از فروشگاه‌های شریک کایار هستند.</p>
        <label className="relative mt-6 block max-w-md"><Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در محصولات…" aria-label="جست‌وجو" className="h-12 w-full rounded-full border border-white/10 bg-white/5 ps-11 pe-4 outline-none focus:border-primary" /></label>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {([['', 'همه'], ['own', 'از کاپوش'], ['partners', 'شریک‌ها و حامیان']] as const).map(([k, l]) => <button key={k || 'all'} onClick={() => setKind(k)} className={chip(kind === k)}>{l}</button>)}
          <span className="mx-1 w-px shrink-0 bg-white/10" />
          {[{ key: '', label: 'همه‌ی دسته‌ها' }, ...(d?.categories ?? [])].map((c) => <button key={c.key || 'all'} onClick={() => setCat(c.key)} className={chip(cat === c.key)}>{c.label}</button>)}
        </div>
        <div className="mt-8">
          {err ? <StateView icon={RefreshCw} title="فروشگاه بارگذاری نشد" text="اتصال را بررسی کن و دوباره تلاش کن." action={<KButton onClick={retry}>تلاش دوباره</KButton>} />
            : !d ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton aspect-[3/5] rounded-[24px]" />)}</div>
            : !list.length ? <StateView icon={ShoppingBag} title={d.items.length ? 'موردی پیدا نشد' : 'به‌زودی'} text={d.items.length ? 'فیلترها یا عبارت جست‌وجو را تغییر بده.' : 'محصولات کاپوش به‌زودی این‌جا معرفی می‌شوند.'} />
            : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{list.map((i) => <ShopCard key={i.id} item={i} />)}</div>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
